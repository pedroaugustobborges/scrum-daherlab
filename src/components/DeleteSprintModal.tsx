import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Slide,
  alpha,
  useTheme,
  IconButton,
} from "@mui/material";
import {
  Close,
  DeleteForever,
  Warning,
  Inbox,
  CheckCircle,
} from "@mui/icons-material";
import { TransitionProps } from "@mui/material/transitions";
import React from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  story_points: number | null;
}

type ModalPhase =
  | "loading"
  | "no-tasks"
  | "has-tasks"
  | "moving"
  | "moved"
  | "deleting";

interface DeleteSprintModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  sprint: {
    id: string;
    name: string;
    project_id?: string | null;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: "A fazer", color: "#94a3b8" },
  "in-progress": { label: "Em andamento", color: "#6366f1" },
  review: { label: "Em revisão", color: "#f59e0b" },
  done: { label: "Concluído", color: "#10b981" },
  blocked: { label: "Bloqueado", color: "#ef4444" },
};

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function DeleteSprintModal({
  open,
  onClose,
  onDeleted,
  sprint,
}: DeleteSprintModalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [phase, setPhase] = useState<ModalPhase>("loading");
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (open && sprint?.id) {
      fetchTasks();
    }
  }, [open, sprint?.id]);

  const fetchTasks = async () => {
    setPhase("loading");
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, story_points")
        .eq("sprint_id", sprint.id);

      if (error) throw error;

      setTasks(data || []);
      setPhase(data && data.length > 0 ? "has-tasks" : "no-tasks");
    } catch (err) {
      console.error("Error fetching sprint tasks:", err);
      toast.error("Erro ao verificar tarefas do sprint");
      onClose();
    }
  };

  const handleSendToBacklog = async () => {
    setPhase("moving");
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ sprint_id: null })
        .eq("sprint_id", sprint.id);

      if (error) throw error;

      setPhase("moved");
    } catch (err) {
      console.error("Error sending tasks to backlog:", err);
      toast.error("Erro ao enviar tarefas para o backlog");
      setPhase("has-tasks");
    }
  };

  const handleDeleteSprint = async () => {
    setPhase("deleting");
    try {
      const { error } = await supabase
        .from("sprints")
        .delete()
        .eq("id", sprint.id);

      if (error) throw error;

      toast.success("Sprint excluído com sucesso!");
      onDeleted();
      handleClose();
    } catch (err) {
      console.error("Error deleting sprint:", err);
      toast.error("Erro ao excluir sprint");
      setPhase(tasks.length > 0 ? "moved" : "no-tasks");
    }
  };

  const handleClose = () => {
    setPhase("loading");
    setTasks([]);
    onClose();
  };

  const isProcessing =
    phase === "loading" || phase === "moving" || phase === "deleting";

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          background: isDarkMode
            ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: isDarkMode
            ? "2px solid rgba(239, 68, 68, 0.2)"
            : "2px solid rgba(239, 68, 68, 0.15)",
          boxShadow: isDarkMode
            ? "0 25px 50px -12px rgba(0,0,0,0.6)"
            : "0 25px 50px -12px rgba(0,0,0,0.2)",
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(8px)",
          backgroundColor: isDarkMode ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.4)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background:
            phase === "moved"
              ? "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
              : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          px: 3,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.5s ease",
        }}
      >
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ color: "white", letterSpacing: "-0.01em" }}
        >
          {phase === "moved" ? "Pronto para excluir" : "Excluir Sprint"}
        </Typography>
        {!isProcessing && (
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                transform: "rotate(90deg)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <Close />
          </IconButton>
        )}
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* ── LOADING ─────────────────────────────────── */}
        {phase === "loading" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 5,
              gap: 2,
            }}
          >
            <CircularProgress sx={{ color: "#6366f1" }} />
            <Typography color="text.secondary" variant="body2">
              Verificando tarefas do sprint…
            </Typography>
          </Box>
        )}

        {/* ── NO TASKS — simple confirm ────────────────── */}
        {phase === "no-tasks" && (
          <Box>
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                background: alpha("#ef4444", 0.06),
                border: `1.5px solid ${alpha("#ef4444", 0.18)}`,
                mb: 3,
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
              }}
            >
              <Warning sx={{ color: "#ef4444", mt: 0.3, flexShrink: 0 }} />
              <Box>
                <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                  Excluir "{sprint.name}"?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Este sprint não possui tarefas associadas. A exclusão é
                  permanente e não pode ser desfeita.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                sx={{
                  borderRadius: 3,
                  borderColor: alpha("#6366f1", 0.3),
                  color: "#6366f1",
                  fontWeight: 600,
                  px: 3,
                  "&:hover": {
                    borderColor: "#6366f1",
                    bgcolor: alpha("#6366f1", 0.05),
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleDeleteSprint}
                startIcon={<DeleteForever />}
                sx={{
                  borderRadius: 3,
                  fontWeight: 700,
                  px: 3,
                  background:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.4)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    boxShadow: "0 6px 20px rgba(239,68,68,0.5)",
                  },
                }}
              >
                Excluir Sprint
              </Button>
            </Box>
          </Box>
        )}

        {/* ── HAS TASKS — Ada warning ──────────────────── */}
        {(phase === "has-tasks" || phase === "moving") && (
          <Box>
            {/* Ada speaking card */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha("#8b5cf6", 0.07)} 0%, ${alpha("#6366f1", 0.07)} 100%)`,
                border: `2px solid ${alpha("#8b5cf6", 0.2)}`,
                mb: 2.5,
              }}
            >
              {/* Ada header */}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    overflow: "hidden",
                    boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
                    border: `2px solid ${alpha("#8b5cf6", 0.35)}`,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/ADA.png"
                    alt="Ada"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Ada
                    </Typography>
                    <Chip
                      label="Assistente"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.62rem",
                        bgcolor: alpha("#8b5cf6", 0.12),
                        color: "#8b5cf6",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Aviso importante
                  </Typography>
                </Box>
              </Box>

              {/* Ada message bubble */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? alpha("#1e293b", 0.8) : "white",
                  border: `1px solid ${alpha("#8b5cf6", 0.12)}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ lineHeight: 1.75, color: "text.primary" }}
                >
                  Percebi que o sprint{" "}
                  <Box
                    component="span"
                    fontWeight={700}
                    sx={{ color: "#6366f1" }}
                  >
                    "{sprint.name}"
                  </Box>{" "}
                  possui{" "}
                  <Box
                    component="span"
                    fontWeight={700}
                    sx={{ color: "#ef4444" }}
                  >
                    {tasks.length}{" "}
                    {tasks.length === 1
                      ? "tarefa associada"
                      : "tarefas associadas"}
                  </Box>
                  . Você precisa removê-las antes de excluir o sprint. Posso
                  enviar todas para o{" "}
                  <Box
                    component="span"
                    fontWeight={700}
                    sx={{ color: "#8b5cf6" }}
                  >
                    backlog do projeto
                  </Box>{" "}
                  para você. Quer que eu faça isso?
                </Typography>
              </Box>
            </Box>

            {/* Task list */}
            <Box
              sx={{
                borderRadius: 2.5,
                border: `1.5px solid ${alpha("#6366f1", 0.12)}`,
                overflow: "hidden",
                mb: 2.5,
                maxHeight: 220,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: alpha("#6366f1", 0.25),
                  borderRadius: 4,
                },
              }}
            >
              {tasks.map((task, idx) => {
                const st = statusLabels[task.status] ?? {
                  label: task.status,
                  color: "#94a3b8",
                };
                return (
                  <Box
                    key={task.id}
                    sx={{
                      px: 2,
                      py: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      borderBottom:
                        idx < tasks.length - 1
                          ? `1px solid ${alpha("#6366f1", 0.07)}`
                          : "none",
                      bgcolor: isDarkMode
                        ? idx % 2 === 0
                          ? alpha("#1e293b", 0.4)
                          : "transparent"
                        : idx % 2 === 0
                          ? alpha("#f8fafc", 1)
                          : "white",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: priorityColors[task.priority] ?? "#94a3b8",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "text.primary",
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Chip
                      label={st.label}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        bgcolor: alpha(st.color, 0.1),
                        color: st.color,
                        flexShrink: 0,
                      }}
                    />
                    {task.story_points != null && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#8b5cf6",
                          fontWeight: 700,
                          minWidth: 28,
                          textAlign: "right",
                        }}
                      >
                        {task.story_points}pt
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={phase === "moving"}
                sx={{
                  borderRadius: 3,
                  borderColor: alpha("#6366f1", 0.3),
                  color: "#6366f1",
                  fontWeight: 600,
                  px: 3,
                  "&:hover": {
                    borderColor: "#6366f1",
                    bgcolor: alpha("#6366f1", 0.05),
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSendToBacklog}
                disabled={phase === "moving"}
                startIcon={
                  phase === "moving" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Inbox />
                  )
                }
                sx={{
                  borderRadius: 3,
                  fontWeight: 700,
                  px: 3,
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                    boxShadow: "0 6px 20px rgba(99,102,241,0.5)",
                  },
                }}
              >
                {phase === "moving"
                  ? "Enviando…"
                  : "Sim, enviar para o backlog"}
              </Button>
            </Box>
          </Box>
        )}

        {/* ── MOVED — Ada success + delete confirm ──────── */}
        {(phase === "moved" || phase === "deleting") && (
          <Box>
            {/* Ada success card */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha("#8b5cf6", 0.07)} 0%, ${alpha("#10b981", 0.07)} 100%)`,
                border: `2px solid ${alpha("#10b981", 0.25)}`,
                mb: 3,
              }}
            >
              {/* Ada header */}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    overflow: "hidden",
                    boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
                    border: `2px solid ${alpha("#10b981", 0.4)}`,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/ADA.png"
                    alt="Ada"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Ada
                    </Typography>
                    <Chip
                      label="Assistente"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.62rem",
                        bgcolor: alpha("#10b981", 0.12),
                        color: "#10b981",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Missão cumprida
                  </Typography>
                </Box>
              </Box>

              {/* Ada success message */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? alpha("#1e293b", 0.8) : "white",
                  border: `1px solid ${alpha("#10b981", 0.15)}`,
                }}
              >
                <Box
                  sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                >
                  <CheckCircle
                    sx={{
                      color: "#10b981",
                      fontSize: 20,
                      mt: 0.2,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ lineHeight: 1.75, color: "text.primary" }}
                  >
                    Prontinho!{" "}
                    <Box
                      component="span"
                      fontWeight={700}
                      sx={{ color: "#8b5cf6" }}
                    >
                      Adoro poder ajudar! ✨
                    </Box>{" "}
                    Movi{" "}
                    <Box
                      component="span"
                      fontWeight={700}
                      sx={{ color: "#10b981" }}
                    >
                      {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
                    </Box>{" "}
                    para o backlog do projeto com sucesso. Agora você pode
                    excluir o sprint sem perder nenhum trabalho.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Delete confirm */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                background: alpha("#ef4444", 0.05),
                border: `1.5px solid ${alpha("#ef4444", 0.15)}`,
                mb: 2.5,
                display: "flex",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <Warning sx={{ color: "#ef4444", fontSize: 18, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Confirme a exclusão permanente do sprint{" "}
                <Box
                  component="span"
                  fontWeight={700}
                  sx={{ color: "text.primary" }}
                >
                  "{sprint.name}"
                </Box>
                . Esta ação não pode ser desfeita.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={phase === "deleting"}
                sx={{
                  borderRadius: 3,
                  borderColor: alpha("#6366f1", 0.3),
                  color: "#6366f1",
                  fontWeight: 600,
                  px: 3,
                  "&:hover": {
                    borderColor: "#6366f1",
                    bgcolor: alpha("#6366f1", 0.05),
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleDeleteSprint}
                disabled={phase === "deleting"}
                startIcon={
                  phase === "deleting" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DeleteForever />
                  )
                }
                sx={{
                  borderRadius: 3,
                  fontWeight: 700,
                  px: 3,
                  background:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.4)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    boxShadow: "0 6px 20px rgba(239,68,68,0.5)",
                  },
                }}
              >
                {phase === "deleting" ? "Excluindo…" : "Excluir Sprint"}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
