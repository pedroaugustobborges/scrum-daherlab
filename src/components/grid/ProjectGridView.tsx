import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  LinearProgress,
  Chip,
  alpha,
  Tooltip,
  CircularProgress,
  Avatar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  ChevronRight,
  ExpandMore,
  Add,
  Delete,
  Flag,
  RadioButtonUnchecked,
  PersonOutline,
  DragIndicator,
  OpenWith,
} from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskMilestone } from "@/hooks/useTaskMilestone";
import {
  useTaskHierarchy,
  buildTaskTree,
  flattenTaskTree,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useIndentTask,
  useOutdentTask,
  useReorderTasks,
} from "@/hooks/useTaskHierarchy";
import type {
  HierarchicalTask,
  TaskStatus,
  TaskPriority,
} from "@/types/hybrid";
import GridToolbar from "./GridToolbar";
import BlockReasonModal from "../BlockReasonModal";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectGridViewProps {
  projectId: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ProjectSprint {
  id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: "planning" | "active" | "completed";
  team_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

type BacklogSprint = { id: "backlog"; name: string; status: "backlog" };

interface SprintSectionItem {
  _type: "sprint-header";
  sprint: ProjectSprint | BacklogSprint;
}

type FlatTaskItem = HierarchicalTask & {
  _depth: number;
  _visible: boolean;
  _hasChildren: boolean;
};
type RenderItem = FlatTaskItem | SprintSectionItem;

interface TaskHandlers {
  editingCell: { id: string; field: string } | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onStartEdit: (id: string, field: string, value: string) => void;
  onSaveEdit: () => Promise<void>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onStatusChange: (task: HierarchicalTask, status: TaskStatus) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  teamMembers: TeamMember[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  projectId: string;
  isDarkMode: boolean;
}

interface ConfirmMoveState {
  taskTitle: string;
  childrenCount: number;
  targetSprintName: string;
  onConfirm: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "A Fazer", color: "#6b7280" },
  { value: "in-progress", label: "Em Progresso", color: "#f59e0b" },
  { value: "review", label: "Em Revisão", color: "#8b5cf6" },
  { value: "done", label: "Concluído", color: "#10b981" },
  { value: "blocked", label: "Bloqueado", color: "#ef4444" },
];

const priorityOptions: { value: TaskPriority; label: string; color: string }[] =
  [
    { value: "low", label: "Baixa", color: "#6b7280" },
    { value: "medium", label: "Média", color: "#f59e0b" },
    { value: "high", label: "Alta", color: "#f97316" },
    { value: "urgent", label: "Urgente", color: "#ef4444" },
  ];

const sprintStatusConfig = {
  planning: {
    label: "Planejamento",
    color: "#6366f1",
    bg: "rgba(99, 102, 241, 0.1)",
  },
  active: { label: "Ativo", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  completed: {
    label: "Concluído",
    color: "#6b7280",
    bg: "rgba(107, 114, 128, 0.1)",
  },
};

function formatSprintDate(dateStr: string | undefined) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTaskDescendants(
  taskId: string,
  allTasks: HierarchicalTask[],
): HierarchicalTask[] {
  const children = allTasks.filter((t) => t.parent_task_id === taskId);
  return children.flatMap((c) => [c, ...getTaskDescendants(c.id, allTasks)]);
}

/**
 * Recursively computes the completion percentage for a task.
 * - Leaf tasks  → stored percent_complete value.
 * - Parent tasks → arithmetic mean of all direct children (each also computed
 *   recursively so deeply nested trees stay consistent).
 */
function computePercent(task: HierarchicalTask): number {
  if (!task.children || task.children.length === 0) {
    return task.percent_complete || 0;
  }
  // Blocked children are excluded from the average (they are on hold)
  const active = task.children.filter((c) => c.status !== "blocked");
  if (active.length === 0) return task.percent_complete || 0;
  const avg =
    active.reduce((sum, c) => sum + computePercent(c), 0) / active.length;
  return Math.round(avg);
}

// ─── CannotCompleteDialog ─────────────────────────────────────────────────────

function CannotCompleteDialog({
  taskTitle,
  onClose,
}: {
  taskTitle: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!taskTitle} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "1rem",
          display: "flex",
          alignItems: "center",
          gap: 1,
          pb: 1,
        }}
      >
        Não é possível concluir a tarefa
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
          A tarefa <strong>&ldquo;{taskTitle}&rdquo;</strong> não pode ser
          marcada como <strong>Concluída</strong> pois nenhuma de suas
          subtarefas possui o status <strong>Concluído</strong>.
          <br />
          <br />
          Conclua ao menos uma subtarefa antes de concluir a tarefa pai.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          size="small"
          sx={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ConfirmMoveDialog ────────────────────────────────────────────────────────

function ConfirmMoveDialog({
  state,
  onClose,
}: {
  state: ConfirmMoveState | null;
  onClose: () => void;
}) {
  if (!state) return null;
  const { taskTitle, childrenCount, targetSprintName, onConfirm } = state;

  const handleConfirm = async () => {
    onClose();
    await onConfirm();
  };

  return (
    <Dialog open={!!state} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
        Mover com subtarefas?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: "0.875rem" }}>
          A tarefa <strong>&ldquo;{taskTitle}&rdquo;</strong> possui{" "}
          <strong>
            {childrenCount} subtarefa{childrenCount > 1 ? "s" : ""}
          </strong>
          . Ao mover para <strong>{targetSprintName}</strong>, todas as
          subtarefas serão movidas também.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} size="small" color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          size="small"
          startIcon={<OpenWith fontSize="small" />}
          sx={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          }}
        >
          Mover tudo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── DroppableSprintHeaderRow ─────────────────────────────────────────────────

function DroppableSprintHeaderRow({
  sprint,
  isDarkMode,
  isAnyDragging,
  onAddTask,
}: {
  sprint: ProjectSprint | BacklogSprint;
  isDarkMode: boolean;
  isAnyDragging: boolean;
  onAddTask: (sprintId: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-header-${sprint.id}`,
  });

  const isBacklog = sprint.id === "backlog";
  const sprintStatus = sprint.status as string;
  const cfg =
    !isBacklog && sprintStatus in sprintStatusConfig
      ? sprintStatusConfig[sprintStatus as keyof typeof sprintStatusConfig]
      : null;
  const borderColor = isBacklog ? "#9ca3af" : (cfg?.color ?? "#6366f1");

  const startFmt = !isBacklog
    ? formatSprintDate((sprint as ProjectSprint).start_date)
    : null;
  const endFmt = !isBacklog
    ? formatSprintDate((sprint as ProjectSprint).end_date)
    : null;

  return (
    <TableRow
      ref={setNodeRef}
      sx={{
        bgcolor: isOver
          ? isDarkMode
            ? alpha(borderColor, 0.18)
            : alpha(borderColor, 0.1)
          : isDarkMode
            ? "rgba(15, 23, 42, 0.6)"
            : "rgba(248, 250, 252, 0.9)",
        borderLeft: `3px solid ${isOver ? borderColor : alpha(borderColor, 0.6)}`,
        outline: isOver ? `2px dashed ${alpha(borderColor, 0.5)}` : "none",
        transition: "background-color 150ms, outline 150ms",
        "& td": {
          borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          py: 0.75,
        },
      }}
    >
      {/* drag handle col spacer */}
      <TableCell sx={{ width: 28, p: 0 }} />
      <TableCell colSpan={11} sx={{ pl: "10px !important" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {!isBacklog && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: borderColor,
                fontSize: "0.65rem",
                opacity: 0.85,
              }}
            >
              Sprint
            </Typography>
          )}

          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: isDarkMode
                ? "rgba(255,255,255,0.85)"
                : "rgba(15,23,42,0.85)",
              fontSize: "0.8rem",
            }}
          >
            {sprint.name}
          </Typography>

          {cfg && (
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 600,
                bgcolor: cfg.bg,
                color: cfg.color,
                "& .MuiChip-label": { px: 1 },
              }}
            />
          )}

          {startFmt && endFmt && (
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", fontSize: "0.72rem" }}
            >
              {startFmt} → {endFmt}
            </Typography>
          )}

          {isAnyDragging && (
            <Typography
              variant="caption"
              sx={{
                color: alpha(borderColor, 0.8),
                fontSize: "0.68rem",
                fontStyle: "italic",
                ml: 0.5,
              }}
            >
              {isOver ? "↓ Soltar aqui" : "Soltar para mover para este sprint"}
            </Typography>
          )}

          <Box sx={{ flex: 1 }} />

          <Tooltip
            title={
              isBacklog
                ? "Adicionar ao backlog"
                : `Adicionar tarefa em ${sprint.name}`
            }
          >
            <IconButton
              size="small"
              onClick={() => onAddTask(isBacklog ? null : sprint.id)}
              sx={{
                color: borderColor,
                opacity: 0.7,
                "&:hover": { opacity: 1, bgcolor: alpha(borderColor, 0.1) },
                width: 24,
                height: 24,
              }}
            >
              <Add sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ─── SortableTaskRow ──────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  task: FlatTaskItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  activeDragId: string | null;
  handlers: TaskHandlers;
  onAddSubtask: (parentId: string) => void;
  onDelete: (id: string) => void;
}

function SortableTaskRow({
  task,
  selected,
  onToggleSelect,
  activeDragId,
  handlers,
  onAddSubtask,
  onDelete,
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isOver,
    isDragging,
  } = useSortable({ id: task.id });

  const {
    editingCell,
    editValue,
    setEditValue,
    onStartEdit,
    onSaveEdit,
    onKeyDown,
    onStatusChange,
    onUpdate,
    teamMembers,
    expandedIds,
    onToggleExpand,
    isDarkMode,
  } = handlers;

  const isDropTarget = isOver && !isDragging;
  const isBeingDragged = activeDragId === task.id;

  // ── renderCell ──────────────────────────────────────────────────────────────
  const renderCell = (field: string) => {
    const isEditing =
      editingCell?.id === task.id && editingCell?.field === field;

    switch (field) {
      case "title":
        return (
          <Box
            sx={{ display: "flex", alignItems: "center", pl: task._depth * 3 }}
          >
            {task._hasChildren ? (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(task.id);
                }}
                sx={{ mr: 0.5 }}
              >
                {expandedIds.has(task.id) ? (
                  <ExpandMore fontSize="small" />
                ) : (
                  <ChevronRight fontSize="small" />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 28 }} />
            )}

            {task.task_type === "milestone" && (
              <Flag sx={{ fontSize: 16, color: "#f59e0b", mr: 0.5 }} />
            )}

            {isEditing ? (
              <TextField
                autoFocus
                size="small"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={onSaveEdit}
                onKeyDown={onKeyDown}
                sx={{ flex: 1 }}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: task.is_summary ? 600 : 400,
                  cursor: "text",
                  flex: 1,
                  "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)" },
                }}
                onClick={() => onStartEdit(task.id, "title", task.title)}
              >
                {task.title}
              </Typography>
            )}
          </Box>
        );

      case "status":
        return (
          <Select
            size="small"
            value={task.status}
            onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
            sx={{ minWidth: 120, "& .MuiSelect-select": { py: 0.5 } }}
          >
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Chip
                  size="small"
                  label={opt.label}
                  sx={{
                    bgcolor: alpha(opt.color, 0.1),
                    color: opt.color,
                    fontWeight: 600,
                    height: 24,
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        );

      case "priority":
        return (
          <Select
            size="small"
            value={task.priority}
            onChange={(e) =>
              onUpdate(task.id, { priority: e.target.value as TaskPriority })
            }
            sx={{ minWidth: 100, "& .MuiSelect-select": { py: 0.5 } }}
          >
            {priorityOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Chip
                  size="small"
                  label={opt.label}
                  sx={{
                    bgcolor: alpha(opt.color, 0.1),
                    color: opt.color,
                    fontWeight: 600,
                    height: 24,
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        );

      case "percent_complete": {
        const pct = computePercent(task);
        const progressBar = (
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: "rgba(99, 102, 241, 0.1)",
              "& .MuiLinearProgress-bar": {
                bgcolor: pct === 100 ? "#10b981" : "#6366f1",
              },
            }}
          />
        );

        // Parent task → read-only, computed from children
        if (task._hasChildren) {
          return (
            <Tooltip
              title="Calculado automaticamente pelas tarefas filhas"
              placement="top"
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 100,
                }}
              >
                {progressBar}
                <Typography
                  variant="caption"
                  sx={{ minWidth: 35, color: "text.secondary" }}
                >
                  {pct}%
                </Typography>
              </Box>
            </Tooltip>
          );
        }

        // Leaf task → editable on click
        return isEditing ? (
          <TextField
            autoFocus
            size="small"
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={onKeyDown}
            inputProps={{ min: 0, max: 100 }}
            sx={{ width: 80 }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 100,
              cursor: "text",
            }}
            onClick={() =>
              onStartEdit(task.id, "percent_complete", String(pct))
            }
          >
            {progressBar}
            <Typography
              variant="caption"
              sx={{
                minWidth: 35,
                "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)" },
              }}
            >
              {pct}%
            </Typography>
          </Box>
        );
      }

      case "start_date":
      case "end_date": {
        const dateValue = task[field as "start_date" | "end_date"];
        const formatDate = (d: string | null) => {
          if (!d) return "-";
          const [yr, mo, dy] = d.split("T")[0].split("-").map(Number);
          return new Date(yr, mo - 1, dy).toLocaleDateString("pt-BR");
        };
        return isEditing ? (
          <TextField
            autoFocus
            size="small"
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={onKeyDown}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              cursor: "pointer",
              "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)" },
            }}
            onClick={() =>
              onStartEdit(
                task.id,
                field,
                dateValue ? dateValue.split("T")[0] : "",
              )
            }
          >
            {formatDate(dateValue)}
          </Typography>
        );
      }

      case "planned_duration": {
        const dur = (() => {
          if (!task.start_date || !task.end_date)
            return task.planned_duration || null;
          const [sy, sm, sd] = task.start_date
            .split("T")[0]
            .split("-")
            .map(Number);
          const [ey, em, ed] = task.end_date
            .split("T")[0]
            .split("-")
            .map(Number);
          const diff =
            new Date(ey, em - 1, ed).getTime() -
            new Date(sy, sm - 1, sd).getTime();
          const days = Math.ceil(diff / 86400000) + 1;
          return days > 0 ? days : 1;
        })();
        return isEditing ? (
          <TextField
            autoFocus
            size="small"
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={onKeyDown}
            inputProps={{ min: 0 }}
            sx={{ width: 80 }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              cursor: "pointer",
              "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)" },
            }}
            onClick={() =>
              onStartEdit(task.id, "planned_duration", String(dur || ""))
            }
          >
            {dur ? `${dur}d` : "-"}
          </Typography>
        );
      }

      case "wbs_code":
        return (
          <Typography variant="body2" color="text.secondary">
            {task.wbs_code || "-"}
          </Typography>
        );

      case "assigned_to": {
        const assignedProfile = task.assigned_to_profile;
        return (
          <Select
            size="small"
            value={task.assigned_to || ""}
            onChange={(e) =>
              onUpdate(task.id, { assigned_to: e.target.value || null })
            }
            displayEmpty
            sx={{ minWidth: 150, "& .MuiSelect-select": { py: 0.5 } }}
            renderValue={(sel) => {
              if (!sel)
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "text.secondary",
                    }}
                  >
                    <PersonOutline sx={{ fontSize: 18 }} />
                    <Typography variant="body2" color="text.secondary">
                      Não atribuído
                    </Typography>
                  </Box>
                );
              const member =
                teamMembers.find((m) => m.id === sel) || assignedProfile;
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={member?.avatar_url || undefined}
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {member?.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </Avatar>
                  <Typography variant="body2" noWrap>
                    {member?.full_name || "Usuário"}
                  </Typography>
                </Box>
              );
            }}
          >
            <MenuItem value="">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PersonOutline sx={{ fontSize: 20, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Não atribuído
                </Typography>
              </Box>
            </MenuItem>
            {teamMembers.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={m.avatar_url || undefined}
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {m.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </Avatar>
                  <Typography variant="body2">{m.full_name}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        );
      }

      default:
        return null;
    }
  };

  return (
    <TableRow
      ref={setNodeRef}
      {...attributes}
      hover={!isBeingDragged}
      selected={selected}
      sx={{
        opacity: isBeingDragged ? 0.35 : 1,
        bgcolor: isDropTarget
          ? isDarkMode
            ? alpha("#6366f1", 0.15)
            : alpha("#6366f1", 0.07)
          : task.is_summary
            ? alpha("#6366f1", 0.03)
            : "inherit",
        boxShadow: isDropTarget ? `inset 0 2px 0 0 #6366f1` : "none",
        transition: "background-color 120ms, box-shadow 120ms, opacity 120ms",
        "&:hover": {
          bgcolor: isDropTarget
            ? isDarkMode
              ? alpha("#6366f1", 0.15)
              : alpha("#6366f1", 0.07)
            : task.is_summary
              ? alpha("#6366f1", 0.08)
              : isDarkMode
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.04)",
        },
      }}
    >
      {/* Drag handle */}
      <TableCell sx={{ width: 28, p: 0, pl: "4px !important" }}>
        <Box
          ref={setActivatorNodeRef}
          {...listeners}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: "100%",
            py: 0.5,
            cursor: "grab",
            opacity: 0,
            color: "text.disabled",
            touchAction: "none",
            ".MuiTableRow-root:hover &": { opacity: 1 },
            "&:active": { cursor: "grabbing", opacity: 1 },
          }}
        >
          <DragIndicator sx={{ fontSize: 16 }} />
        </Box>
      </TableCell>

      <TableCell padding="checkbox">
        <Checkbox checked={selected} onChange={() => onToggleSelect(task.id)} />
      </TableCell>

      <TableCell>{renderCell("wbs_code")}</TableCell>
      <TableCell>{renderCell("title")}</TableCell>
      <TableCell>{renderCell("assigned_to")}</TableCell>
      <TableCell>{renderCell("start_date")}</TableCell>
      <TableCell>{renderCell("end_date")}</TableCell>
      <TableCell>{renderCell("planned_duration")}</TableCell>
      <TableCell>{renderCell("percent_complete")}</TableCell>
      <TableCell>{renderCell("status")}</TableCell>
      <TableCell>{renderCell("priority")}</TableCell>
      <TableCell>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Adicionar subtarefa">
            <IconButton size="small" onClick={() => onAddSubtask(task.id)}>
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              onClick={() => onDelete(task.id)}
              sx={{ color: "error.main" }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ─── ProjectGridView (main) ───────────────────────────────────────────────────

export default function ProjectGridView({ projectId }: ProjectGridViewProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { checkAndNotifyMilestone } = useTaskMilestone();
  const isDarkMode = theme.palette.mode === "dark";

  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const indentTask = useIndentTask();
  const outdentTask = useOutdentTask();
  const reorderTasks = useReorderTasks();

  // ── Sprints ─────────────────────────────────────────────────────────────────
  const { data: sprints = [] } = useQuery<ProjectSprint[]>({
    queryKey: ["sprints", "project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data || []) as ProjectSprint[];
    },
    enabled: !!projectId,
    staleTime: 1000 * 30,
  });

  // ── Team members ─────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const { data: projectTeams } = await supabase
        .from("project_teams")
        .select("team_id")
        .eq("project_id", projectId);

      if (!projectTeams?.length) {
        setTeamMembers([]);
        return;
      }

      const teamIds = projectTeams.map((pt) => pt.team_id);
      const { data: members } = await supabase
        .from("team_members")
        .select(
          "user_id, profiles:profiles!team_members_user_id_fkey(id, full_name, avatar_url)",
        )
        .in("team_id", teamIds);

      const unique = new Map<string, TeamMember>();
      members?.forEach((m) => {
        const p = m.profiles as unknown as TeamMember;
        if (p && !unique.has(p.id))
          unique.set(p.id, {
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
          });
      });
      setTeamMembers(
        Array.from(unique.values()).sort((a, b) =>
          a.full_name.localeCompare(b.full_name),
        ),
      );
    };
    if (projectId) fetchTeamMembers();
  }, [projectId]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [blockReasonModalOpen, setBlockReasonModalOpen] = useState(false);
  const [pendingBlockTask, setPendingBlockTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [noChildDoneTask, setNoChildDoneTask] = useState<{
    title: string;
  } | null>(null);

  // ── Drag state ────────────────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [confirmMove, setConfirmMove] = useState<ConfirmMoveState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ── Tree / grouped list ───────────────────────────────────────────────────────
  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);

  const groupedRenderList = useMemo((): RenderItem[] => {
    if (sprints.length === 0) {
      const flat = flattenTaskTree(taskTree, expandedIds);
      return flat.filter((t) => t._visible) as FlatTaskItem[];
    }

    const items: RenderItem[] = [];
    const sprintGroups = new Map<string | null, HierarchicalTask[]>();
    taskTree.forEach((task) => {
      const key = task.sprint_id || null;
      if (!sprintGroups.has(key)) sprintGroups.set(key, []);
      sprintGroups.get(key)!.push(task);
    });

    for (const sprint of sprints) {
      items.push({ _type: "sprint-header", sprint });
      const roots = sprintGroups.get(sprint.id) || [];
      flattenTaskTree(roots, expandedIds)
        .filter((t) => t._visible)
        .forEach((t) => items.push(t as FlatTaskItem));
    }

    const backlogRoots = sprintGroups.get(null) || [];
    if (backlogRoots.length > 0) {
      items.push({
        _type: "sprint-header",
        sprint: { id: "backlog", name: "Backlog", status: "backlog" },
      });
      flattenTaskTree(backlogRoots, expandedIds)
        .filter((t) => t._visible)
        .forEach((t) => items.push(t as FlatTaskItem));
    }

    return items;
  }, [taskTree, sprints, expandedIds]);

  const visibleTaskItems = useMemo(
    () =>
      groupedRenderList.filter(
        (item): item is FlatTaskItem => !("_type" in item),
      ),
    [groupedRenderList],
  );

  const sortableIds = useMemo(
    () => visibleTaskItems.map((t) => t.id),
    [visibleTaskItems],
  );

  // ── Selection ─────────────────────────────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === visibleTaskItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleTaskItems.map((t) => t.id)));
  }, [visibleTaskItems, selectedIds]);

  // ── Cell editing ──────────────────────────────────────────────────────────────
  const handleStartEdit = useCallback(
    (id: string, field: string, value: string) => {
      setEditingCell({ id, field });
      setEditValue(value);
    },
    [],
  );

  const calcDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const [sy, sm, sd] = start.split("T")[0].split("-").map(Number);
    const [ey, em, ed] = end.split("T")[0].split("-").map(Number);
    const diff =
      new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime();
    const days = Math.ceil(diff / 86400000) + 1;
    return days > 0 ? days : 1;
  };

  const calcEndDate = (start: string, days: number) => {
    const [y, m, d] = start.split("T")[0].split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days - 1);
    return date.toISOString().split("T")[0];
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    let updateValue: unknown = editValue;
    const extra: Record<string, unknown> = {};

    if (field === "percent_complete") {
      updateValue = Math.min(100, Math.max(0, parseInt(editValue) || 0));
      const newPct = updateValue as number;
      // Bidirectional sync for leaf tasks only (parent % is computed, not stored)
      const isLeaf = !tasks.some((t) => t.parent_task_id === task.id);
      if (isLeaf) {
        if (newPct === 100 && task.status !== "done") {
          extra.status = "done";
          extra.completed_at = new Date().toISOString();
        } else if (newPct < 100 && task.status === "done") {
          extra.status = "in-progress";
          extra.completed_at = null;
        }
      }
    } else if (["planned_duration", "story_points"].includes(field)) {
      updateValue = parseInt(editValue) || 0;
    }
    if (field === "start_date" && editValue) {
      if (task.end_date)
        extra.planned_duration = calcDuration(editValue, task.end_date);
      else if (task.planned_duration)
        extra.end_date = calcEndDate(editValue, task.planned_duration);
    }
    if (field === "end_date" && editValue && task.start_date) {
      extra.planned_duration = calcDuration(task.start_date, editValue);
    }
    if (field === "planned_duration" && updateValue && task.start_date) {
      extra.end_date = calcEndDate(
        task.start_date.split("T")[0],
        updateValue as number,
      );
    }

    await updateTask.mutateAsync({
      id,
      projectId,
      updates: { [field]: updateValue, ...extra },
    });
    setEditingCell(null);
    setEditValue("");

    // Milestone check when a leaf task reaches 100% and auto-transitions to done
    if (
      field === "percent_complete" &&
      extra.status === "done" &&
      user &&
      task.assigned_to === user.id
    ) {
      void checkAndNotifyMilestone(user.id);
    }

    // Propagate percent_complete up the ancestor chain.
    // Blocked siblings are excluded from each parent's average.
    if (field === "percent_complete" && task.parent_task_id) {
      let workingTasks = tasks.map((t) =>
        t.id === id ? { ...t, percent_complete: updateValue as number } : t,
      );
      let childId = id;

      while (true) {
        const child = workingTasks.find((t) => t.id === childId);
        if (!child?.parent_task_id) break;

        const parentId = child.parent_task_id;
        const activeChildren = workingTasks.filter(
          (t) => t.parent_task_id === parentId && t.status !== "blocked",
        );
        if (activeChildren.length === 0) break;

        const avg = Math.round(
          activeChildren.reduce(
            (sum, c) => sum + (c.percent_complete || 0),
            0,
          ) / activeChildren.length,
        );
        await supabase
          .from("tasks")
          .update({ percent_complete: avg })
          .eq("id", parentId);
        workingTasks = workingTasks.map((t) =>
          t.id === parentId ? { ...t, percent_complete: avg } : t,
        );
        childId = parentId;
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.hierarchy(projectId),
      });
    }
  }, [editingCell, editValue, tasks, updateTask, projectId, queryClient, user, checkAndNotifyMilestone]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSaveEdit();
      else if (e.key === "Escape") {
        setEditingCell(null);
        setEditValue("");
      }
    },
    [handleSaveEdit],
  );

  // ── Task CRUD ─────────────────────────────────────────────────────────────────
  const handleAddTask = useCallback(
    async (
      parentId?: string,
      sprintId?: string | null,
      afterTaskId?: string, // when set, insert as same-level sibling directly below this task
    ) => {
      // ── Insert below a specific task ───────────────────────────────────────────
      if (afterTaskId) {
        const anchor = tasks.find((t) => t.id === afterTaskId);
        if (anchor) {
          // Shift every same-level sibling that sits after the anchor
          const siblingsBehind = tasks.filter(
            (t) =>
              t.parent_task_id === anchor.parent_task_id &&
              t.order_index > anchor.order_index,
          );
          if (siblingsBehind.length > 0) {
            await Promise.all(
              siblingsBehind.map((s) =>
                supabase
                  .from("tasks")
                  .update({ order_index: s.order_index + 1 })
                  .eq("id", s.id),
              ),
            );
          }
          const { error } = await supabase.from("tasks").insert([
            {
              project_id: projectId,
              title: "Nova Tarefa",
              parent_task_id: anchor.parent_task_id,
              hierarchy_level: anchor.hierarchy_level,
              sprint_id: anchor.sprint_id,
              order_index: anchor.order_index + 1,
              status: "todo",
              priority: "medium",
              task_type: "task",
              percent_complete: 0,
            },
          ]);
          if (error) {
            toast.error("Erro ao criar tarefa");
          } else {
            toast.success("Tarefa criada");
            queryClient.invalidateQueries({
              queryKey: queryKeys.tasks.hierarchy(projectId),
            });
          }
          return;
        }
      }

      // ── Default: append at end of parent / sprint ──────────────────────────────
      const parent = parentId ? tasks.find((t) => t.id === parentId) : null;
      const resolvedSprintId =
        sprintId !== undefined ? sprintId : (parent?.sprint_id ?? null);

      await createTask.mutateAsync({
        project_id: projectId,
        title: "Nova Tarefa",
        parent_task_id: parentId || null,
        hierarchy_level: parent ? (parent.hierarchy_level || 0) + 1 : 0,
        sprint_id: resolvedSprintId,
      });

      if (parentId) setExpandedIds((prev) => new Set([...prev, parentId]));
    },
    [tasks, createTask, projectId, queryClient],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedIds.size) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir ${selectedIds.size} tarefa(s)?`,
      )
    )
      return;
    for (const id of selectedIds)
      await deleteTask.mutateAsync({ id, projectId });
    setSelectedIds(new Set());
  }, [selectedIds, deleteTask, projectId]);

  const handleIndent = useCallback(async () => {
    for (const id of selectedIds) {
      const task = tasks.find((t) => t.id === id);
      if (task)
        try {
          await indentTask.mutateAsync({ task, tasks });
        } catch {
          /* handled */
        }
    }
  }, [selectedIds, tasks, indentTask]);

  const handleOutdent = useCallback(async () => {
    for (const id of selectedIds) {
      const task = tasks.find((t) => t.id === id);
      if (task)
        try {
          await outdentTask.mutateAsync({ task, tasks });
        } catch {
          /* handled */
        }
    }
  }, [selectedIds, tasks, outdentTask]);

  // ── Status / blocking ────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (task: HierarchicalTask, newStatus: TaskStatus) => {
      if (newStatus === "blocked" && task.status !== "blocked") {
        setPendingBlockTask({ id: task.id, title: task.title });
        setBlockReasonModalOpen(true);
        return;
      }

      const isParent = tasks.some((t) => t.parent_task_id === task.id);

      // Mother task: must have at least one direct child with status "done"
      // before it can be marked as "Concluído"
      if (isParent && newStatus === "done") {
        const hasChildDone = tasks.some(
          (t) => t.parent_task_id === task.id && t.status === "done",
        );
        if (!hasChildDone) {
          setNoChildDoneTask({ title: task.title });
          return;
        }
      }

      const updates: Record<string, unknown> = { status: newStatus };
      if (task.status === "blocked" && newStatus !== "blocked")
        updates.blocked_comment_id = null;
      if (newStatus === "done") {
        updates.completed_at = new Date().toISOString();
        // Sync percent to 100 for leaf tasks (parent % is always computed)
        if (!isParent) updates.percent_complete = 100;
      } else if (task.status === "done") {
        updates.completed_at = null;
      }

      try {
        await updateTask.mutateAsync({ id: task.id, projectId, updates });

        if (
          newStatus === "done" &&
          task.status !== "done" &&
          user &&
          task.assigned_to === user.id
        ) {
          void checkAndNotifyMilestone(user.id);
        }

        // Propagate the changed task's effective percent up to its parent(s).
        // This also handles blocked-status changes, which alter the active pool.
        if (task.parent_task_id) {
          const newPct =
            !isParent && newStatus === "done"
              ? 100
              : task.percent_complete || 0;
          let workingTasks = tasks.map((t) =>
            t.id === task.id
              ? { ...t, status: newStatus, percent_complete: newPct }
              : t,
          );
          let childId = task.id;

          while (true) {
            const child = workingTasks.find((t) => t.id === childId);
            if (!child?.parent_task_id) break;

            const parentId = child.parent_task_id;
            const activeChildren = workingTasks.filter(
              (t) => t.parent_task_id === parentId && t.status !== "blocked",
            );
            if (activeChildren.length === 0) break;

            const avg = Math.round(
              activeChildren.reduce(
                (sum, c) => sum + (c.percent_complete || 0),
                0,
              ) / activeChildren.length,
            );
            await supabase
              .from("tasks")
              .update({ percent_complete: avg })
              .eq("id", parentId);
            workingTasks = workingTasks.map((t) =>
              t.id === parentId ? { ...t, percent_complete: avg } : t,
            );
            childId = parentId;
          }

          queryClient.invalidateQueries({
            queryKey: queryKeys.tasks.hierarchy(projectId),
          });
        }
      } catch {
        // mutation onError already shows a toast
      }
    },
    [updateTask, projectId, user, checkAndNotifyMilestone, tasks, queryClient],
  );

  const handleBlockConfirm = useCallback(
    async (reason: string) => {
      if (!pendingBlockTask || !user) return;
      try {
        const { data: commentData, error } = await supabase
          .from("comments")
          .insert({
            task_id: pendingBlockTask.id,
            user_id: user.id,
            content: `🚫 **Motivo do Bloqueio:** ${reason}`,
          })
          .select()
          .single();
        if (error) throw error;
        await updateTask.mutateAsync({
          id: pendingBlockTask.id,
          projectId,
          updates: {
            status: "blocked" as TaskStatus,
            blocked_comment_id: commentData.id,
          },
        });
        toast.success("Tarefa bloqueada");
      } catch {
        toast.error("Erro ao bloquear tarefa");
      }
      setBlockReasonModalOpen(false);
      setPendingBlockTask(null);
    },
    [pendingBlockTask, user, updateTask, projectId],
  );

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveDragId(String(active.id));
  }, []);

  const executeSprintMove = useCallback(
    async (
      task: HierarchicalTask,
      targetSprintId: string | null,
      descendants: HierarchicalTask[],
    ) => {
      try {
        await updateTask.mutateAsync({
          id: task.id,
          projectId,
          updates: { sprint_id: targetSprintId },
        });

        if (descendants.length > 0) {
          await Promise.all(
            descendants.map((d) =>
              supabase
                .from("tasks")
                .update({ sprint_id: targetSprintId })
                .eq("id", d.id),
            ),
          );
          queryClient.invalidateQueries({
            queryKey: queryKeys.tasks.hierarchy(projectId),
          });
        }

        const sprintName = targetSprintId
          ? (sprints.find((s) => s.id === targetSprintId)?.name ?? "Sprint")
          : "Backlog";
        toast.success(`Tarefa movida para ${sprintName}`);
      } catch {
        toast.error("Erro ao mover tarefa");
      }
    },
    [updateTask, projectId, sprints, queryClient],
  );

  const executeReorder = useCallback(
    async (draggedTask: HierarchicalTask, targetTask: HierarchicalTask) => {
      // Scope = all tasks at the same hierarchy level
      const scope = tasks
        .filter(
          (t) => t.parent_task_id === (draggedTask.parent_task_id ?? null),
        )
        .sort((a, b) => a.order_index - b.order_index);

      const dragIdx = scope.findIndex((t) => t.id === draggedTask.id);
      const targetIdx = scope.findIndex((t) => t.id === targetTask.id);

      if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return;

      // Move dragged to target position
      const reordered = [...scope];
      reordered.splice(dragIdx, 1);
      const insertAt = targetIdx > dragIdx ? targetIdx - 1 : targetIdx;
      reordered.splice(insertAt, 0, draggedTask);

      const updates = reordered.map((t, i) => ({
        id: t.id,
        order_index: i + 1,
      }));

      // Cross-sprint detection (only for root tasks)
      const isCrossSprint =
        !draggedTask.parent_task_id &&
        draggedTask.sprint_id !== targetTask.sprint_id;

      if (isCrossSprint) {
        const targetSprintId = targetTask.sprint_id || null;
        const descendants = getTaskDescendants(draggedTask.id, tasks);

        const doMove = async () => {
          await executeSprintMove(draggedTask, targetSprintId, descendants);
          await reorderTasks.mutateAsync({ projectId, updates });
        };

        if (descendants.length > 0) {
          const sprintName = targetSprintId
            ? (sprints.find((s) => s.id === targetSprintId)?.name ?? "Sprint")
            : "Backlog";
          setConfirmMove({
            taskTitle: draggedTask.title,
            childrenCount: descendants.length,
            targetSprintName: sprintName,
            onConfirm: doMove,
          });
          return;
        }

        await doMove();
        return;
      }

      await reorderTasks.mutateAsync({ projectId, updates });
    },
    [tasks, reorderTasks, projectId, executeSprintMove, sprints],
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveDragId(null);
      if (!over || active.id === over.id) return;

      const draggedTask = tasks.find((t) => t.id === String(active.id));
      if (!draggedTask) return;

      const overId = String(over.id);

      if (overId.startsWith("sprint-header-")) {
        // ── Dropped on sprint header ──────────────────────────────────
        const rawSprintId = overId.replace("sprint-header-", "");
        const targetSprintId = rawSprintId === "backlog" ? null : rawSprintId;

        if (draggedTask.sprint_id === targetSprintId) return;

        if (draggedTask.parent_task_id) {
          toast.error("Mova a tarefa pai para mudar o sprint de uma subtarefa");
          return;
        }

        const descendants = getTaskDescendants(draggedTask.id, tasks);

        if (descendants.length > 0) {
          const sprintName = targetSprintId
            ? (sprints.find((s) => s.id === targetSprintId)?.name ?? "Sprint")
            : "Backlog";
          setConfirmMove({
            taskTitle: draggedTask.title,
            childrenCount: descendants.length,
            targetSprintName: sprintName,
            onConfirm: () =>
              executeSprintMove(draggedTask, targetSprintId, descendants),
          });
        } else {
          await executeSprintMove(draggedTask, targetSprintId, []);
        }
      } else {
        // ── Dropped on another task (reorder) ─────────────────────────
        const targetTask = tasks.find((t) => t.id === overId);
        if (!targetTask) return;
        await executeReorder(draggedTask, targetTask);
      }
    },
    [tasks, sprints, executeSprintMove, executeReorder],
  );

  // ── Handlers bundle (passed to SortableTaskRow) ──────────────────────────────
  const taskHandlers: TaskHandlers = useMemo(
    () => ({
      editingCell,
      editValue,
      setEditValue,
      onStartEdit: handleStartEdit,
      onSaveEdit: handleSaveEdit,
      onKeyDown: handleKeyDown,
      onStatusChange: handleStatusChange,
      onUpdate: (id: string, updates: Record<string, unknown>) =>
        updateTask.mutate({ id, projectId, updates }),
      teamMembers,
      expandedIds,
      onToggleExpand: toggleExpand,
      projectId,
      isDarkMode,
    }),
    [
      editingCell,
      editValue,
      handleStartEdit,
      handleSaveEdit,
      handleKeyDown,
      handleStatusChange,
      updateTask,
      projectId,
      teamMembers,
      expandedIds,
      toggleExpand,
      isDarkMode,
    ],
  );

  // ── Active drag task (for overlay) ───────────────────────────────────────────
  const activeDragTask = useMemo(
    () => (activeDragId ? tasks.find((t) => t.id === activeDragId) : null),
    [activeDragId, tasks],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <GridToolbar
        selectedCount={selectedIds.size}
        onAddTask={() => {
          // If exactly one row is selected, insert the new task immediately below it
          // at the same hierarchy level / sprint. Otherwise append at the end.
          const afterId =
            selectedIds.size === 1 ? Array.from(selectedIds)[0] : undefined;
          void handleAddTask(undefined, null, afterId);
        }}
        onAddSubtask={() => {
          const firstSelected = Array.from(selectedIds)[0];
          if (firstSelected) handleAddTask(firstSelected);
        }}
        onDelete={handleDeleteSelected}
        onIndent={handleIndent}
        onOutdent={handleOutdent}
        canIndent={selectedIds.size > 0}
        canOutdent={
          selectedIds.size > 0 &&
          Array.from(selectedIds).some((id) => {
            const task = tasks.find((t) => t.id === id);
            return task?.parent_task_id != null;
          })
        }
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <TableContainer
            component={Paper}
            sx={{
              flex: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "auto",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {/* Drag handle col */}
                  <TableCell
                    sx={{
                      width: 28,
                      p: 0,
                      bgcolor: isDarkMode
                        ? "rgba(30, 41, 59, 0.95)"
                        : "grey.50",
                      borderBottom: isDarkMode
                        ? "1px solid rgba(255, 255, 255, 0.1)"
                        : undefined,
                    }}
                  />
                  <TableCell
                    padding="checkbox"
                    sx={{
                      bgcolor: isDarkMode
                        ? "rgba(30, 41, 59, 0.95)"
                        : "grey.50",
                      borderBottom: isDarkMode
                        ? "1px solid rgba(255, 255, 255, 0.1)"
                        : undefined,
                    }}
                  >
                    <Checkbox
                      indeterminate={
                        selectedIds.size > 0 &&
                        selectedIds.size < visibleTaskItems.length
                      }
                      checked={
                        visibleTaskItems.length > 0 &&
                        selectedIds.size === visibleTaskItems.length
                      }
                      onChange={selectAll}
                    />
                  </TableCell>
                  {[
                    { label: "WBS", width: 60 },
                    { label: "Nome da Tarefa", width: 300 },
                    { label: "Responsável", width: 150 },
                    { label: "Início", width: 120 },
                    { label: "Término", width: 120 },
                    { label: "Duração", width: 80 },
                    { label: "% Concluído", width: 140 },
                    { label: "Status", width: 130 },
                    { label: "Prioridade", width: 110 },
                    { label: "Ações", width: 60 },
                  ].map(({ label, width }) => (
                    <TableCell
                      key={label}
                      sx={{
                        bgcolor: isDarkMode
                          ? "rgba(30, 41, 59, 0.95)"
                          : "grey.50",
                        minWidth: width,
                        fontWeight: 600,
                        borderBottom: isDarkMode
                          ? "1px solid rgba(255, 255, 255, 0.1)"
                          : undefined,
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {groupedRenderList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <RadioButtonUnchecked
                          sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
                        />
                        <Typography
                          variant="h6"
                          color="text.secondary"
                          gutterBottom
                        >
                          Nenhuma tarefa ainda
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Clique em "Nova Tarefa" para começar
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedRenderList.map((item, index) => {
                    if ("_type" in item && item._type === "sprint-header") {
                      return (
                        <DroppableSprintHeaderRow
                          key={`sprint-${item.sprint.id}-${index}`}
                          sprint={item.sprint}
                          isDarkMode={isDarkMode}
                          isAnyDragging={!!activeDragId}
                          onAddTask={handleAddTask.bind(null, undefined)}
                        />
                      );
                    }

                    const task = item as FlatTaskItem;
                    return (
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        selected={selectedIds.has(task.id)}
                        onToggleSelect={toggleSelect}
                        activeDragId={activeDragId}
                        handlers={taskHandlers}
                        onAddSubtask={(parentId) => handleAddTask(parentId)}
                        onDelete={(id) => {
                          if (window.confirm("Excluir esta tarefa?")) {
                            deleteTask.mutate({ id, projectId });
                          }
                        }}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SortableContext>

        {/* Floating drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeDragTask && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1,
                bgcolor: "background.paper",
                border: "2px solid",
                borderColor: "#6366f1",
                borderRadius: 1.5,
                boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
                maxWidth: 380,
                pointerEvents: "none",
              }}
            >
              <DragIndicator
                sx={{ color: "#6366f1", fontSize: 18, flexShrink: 0 }}
              />
              <Typography variant="body2" fontWeight={600} noWrap>
                {activeDragTask.title}
              </Typography>
              {activeDragTask.is_summary && (
                <Chip
                  label={`+filhos`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    bgcolor: alpha("#6366f1", 0.1),
                    color: "#6366f1",
                    ml: 0.5,
                  }}
                />
              )}
            </Box>
          )}
        </DragOverlay>
      </DndContext>

      {/* Confirm sprint move dialog */}
      <ConfirmMoveDialog
        state={confirmMove}
        onClose={() => setConfirmMove(null)}
      />

      {/* Cannot-complete dialog: shown when a mother task has no done children */}
      <CannotCompleteDialog
        taskTitle={noChildDoneTask?.title ?? null}
        onClose={() => setNoChildDoneTask(null)}
      />

      {/* Block reason modal */}
      <BlockReasonModal
        open={blockReasonModalOpen}
        onClose={() => {
          setBlockReasonModalOpen(false);
          setPendingBlockTask(null);
        }}
        onConfirm={handleBlockConfirm}
        storyTitle={pendingBlockTask?.title}
      />
    </Box>
  );
}
