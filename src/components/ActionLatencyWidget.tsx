import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  HourglassEmpty,
  KeyboardArrowUp,
  KeyboardArrowDown,
  FolderOpen,
  CalendarToday,
} from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import { IOSWidget } from "./ui";

interface ProjectLatency {
  id: string;
  name: string;
  /** Days since the last movement (task created, updated, or completed). -1 = no tasks yet. */
  idleDays: number;
  /** ISO string of the last activity timestamp, null when no tasks exist */
  lastActivityAt: string | null;
}

interface ActionLatencyWidgetProps {
  teamId?: string | null;
  strategicFilter?: "all" | "yes" | "no";
}

const ITEMS_PER_PAGE = 4;

/** Returns the most recent ISO timestamp among created_at, updated_at, completed_at */
function latestTimestamp(
  createdAt: string | null,
  updatedAt: string | null,
  completedAt: string | null,
): number | null {
  const candidates = [createdAt, updatedAt, completedAt]
    .filter(Boolean)
    .map((t) => new Date(t!).getTime())
    .filter((n) => !isNaN(n));
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function daysSince(isoTs: string | null): number {
  if (!isoTs) return -1;
  const ms = Date.now() - new Date(isoTs).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function latencyChip(days: number): {
  label: string;
  bgcolor: string;
  color: string;
} {
  if (days < 0)
    return {
      label: "Sem tarefas",
      bgcolor: "rgba(107,114,128,0.12)",
      color: "#6b7280",
    };
  if (days === 0)
    return {
      label: "Hoje",
      bgcolor: "rgba(16,185,129,0.12)",
      color: "#10b981",
    };
  if (days <= 3)
    return {
      label: `${days}d`,
      bgcolor: "rgba(16,185,129,0.12)",
      color: "#10b981",
    };
  if (days <= 7)
    return {
      label: `${days}d`,
      bgcolor: "rgba(245,158,11,0.12)",
      color: "#f59e0b",
    };
  if (days <= 14)
    return {
      label: `${days}d`,
      bgcolor: "rgba(249,115,22,0.12)",
      color: "#f97316",
    };
  return {
    label: `${days}d`,
    bgcolor: "rgba(239,68,68,0.12)",
    color: "#ef4444",
  };
}

export default function ActionLatencyWidget({
  teamId,
  strategicFilter = "all",
}: ActionLatencyWidgetProps = {}) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectLatency[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProjects = projects.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchLatency();
  }, [teamId, strategicFilter]);

  const fetchLatency = async () => {
    try {
      setLoading(true);

      // ── 1. Resolve active project IDs respecting filters ──────────────────
      let activeProjectIds: string[] | null = null;

      if (strategicFilter !== "all") {
        const { data: filtered } = await supabase
          .from("projects")
          .select("id")
          .eq("status", "active")
          .eq("strategic_planning", strategicFilter === "yes");
        activeProjectIds = (filtered ?? []).map((p: any) => p.id);
      } else {
        const { data: all } = await supabase
          .from("projects")
          .select("id")
          .eq("status", "active");
        activeProjectIds = (all ?? []).map((p: any) => p.id);
      }

      // Apply team filter: keep only projects that have at least one sprint
      // belonging to the selected team
      if (teamId && activeProjectIds && activeProjectIds.length > 0) {
        const { data: teamSprints } = await supabase
          .from("sprints")
          .select("project_id")
          .eq("team_id", teamId)
          .in("project_id", activeProjectIds);
        const teamProjectIds = new Set(
          (teamSprints ?? []).map((s: any) => s.project_id).filter(Boolean),
        );
        activeProjectIds = activeProjectIds.filter((id) =>
          teamProjectIds.has(id),
        );
      }

      if (!activeProjectIds || activeProjectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // ── 2. Fetch project names ─────────────────────────────────────────────
      const { data: projectRows } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", activeProjectIds);

      if (!projectRows || projectRows.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // ── 3. Fetch all tasks for those projects (only timestamps needed) ─────
      // We pull created_at, updated_at, completed_at so we can find the latest
      // movement event regardless of whether it was a creation, update, or completion.
      const { data: taskRows } = await supabase
        .from("tasks")
        .select("project_id, created_at, updated_at, completed_at")
        .in("project_id", activeProjectIds);

      // ── 4. Build a map project_id → max timestamp (ms) ────────────────────
      const latestMs = new Map<string, number>();
      for (const row of taskRows ?? []) {
        const ts = latestTimestamp(
          row.created_at,
          row.updated_at,
          row.completed_at,
        );
        if (ts === null) continue;
        const prev = latestMs.get(row.project_id) ?? 0;
        if (ts > prev) latestMs.set(row.project_id, ts);
      }

      // ── 5. Compute idle days and sort ──────────────────────────────────────
      const now = Date.now();
      const result: ProjectLatency[] = projectRows.map((p: any) => {
        const maxTs = latestMs.get(p.id) ?? null;
        const idleDays =
          maxTs !== null
            ? Math.max(0, Math.floor((now - maxTs) / 86_400_000))
            : -1;
        return {
          id: p.id,
          name: p.name,
          idleDays,
          lastActivityAt: maxTs !== null ? new Date(maxTs).toISOString() : null,
        };
      });

      // Most stale first; projects with no tasks go to bottom
      result.sort((a, b) => {
        if (a.idleDays < 0 && b.idleDays >= 0) return 1;
        if (b.idleDays < 0 && a.idleDays >= 0) return -1;
        return b.idleDays - a.idleDays;
      });

      setProjects(result);
    } catch (err) {
      console.error("ActionLatencyWidget error:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const accentColor = "#f97316";

  if (loading) {
    return (
      <IOSWidget accentColor={accentColor}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress size={40} sx={{ color: accentColor }} />
        </Box>
      </IOSWidget>
    );
  }

  // Highest idle days among projects that have tasks
  const maxIdle = projects
    .filter((p) => p.idleDays >= 0)
    .reduce((m, p) => Math.max(m, p.idleDays), 0);

  return (
    <IOSWidget accentColor={accentColor}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(249,115,22,0.3)",
              flexShrink: 0,
            }}
          >
            <HourglassEmpty sx={{ color: "white", fontSize: 28 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{ color: accentColor, mb: 0.5 }}
            >
              {maxIdle >= 0 ? `${maxIdle}d` : "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Latência de Ações
            </Typography>
          </Box>
        </Box>

        {/* Subtitle info box — matches ActiveProjectsWidget / ActiveSprintsWidget pattern */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "rgba(249,115,22,0.08)",
          }}
        >
          <CalendarToday sx={{ fontSize: 18, color: accentColor }} />
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: accentColor }}
          >
            Dias sem movimentação em um projeto ativo
          </Typography>
        </Box>

        {/* Project list */}
        {projects.length > 0 ? (
          <>
            <Stack spacing={1} sx={{ flex: 1, overflowY: "auto" }}>
              {paginatedProjects.map((project) => {
                const chip = latencyChip(project.idleDays);
                return (
                  <Box
                    key={project.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isDarkMode ? "#1e293b" : "white",
                      border: `1px solid ${chip.bgcolor}`,
                    }}
                  >
                    <FolderOpen
                      sx={{ fontSize: 18, color: chip.color, flexShrink: 0 }}
                    />

                    <Tooltip title={project.name} placement="top">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.8rem",
                        }}
                      >
                        {project.name}
                      </Typography>
                    </Tooltip>

                    <Chip
                      label={chip.label}
                      size="small"
                      sx={{
                        bgcolor: chip.bgcolor,
                        color: chip.color,
                        fontWeight: 700,
                        fontSize: "0.68rem",
                        height: 22,
                        flexShrink: 0,
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>

            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  mt: 2,
                  pt: 1.5,
                  borderTop: `1px solid rgba(249,115,22,0.1)`,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  sx={{
                    color: accentColor,
                    "&:disabled": { color: "rgba(249,115,22,0.3)" },
                    "&:hover": { bgcolor: "rgba(249,115,22,0.1)" },
                  }}
                >
                  <KeyboardArrowUp fontSize="small" />
                </IconButton>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: accentColor }}
                >
                  {currentPage} / {totalPages}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  sx={{
                    color: accentColor,
                    "&:disabled": { color: "rgba(249,115,22,0.3)" },
                    "&:hover": { bgcolor: "rgba(249,115,22,0.1)" },
                  }}
                >
                  <KeyboardArrowDown fontSize="small" />
                </IconButton>
              </Box>
            )}
          </>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 2 }}
          >
            Nenhum projeto ativo encontrado
          </Typography>
        )}
      </Box>
    </IOSWidget>
  );
}
