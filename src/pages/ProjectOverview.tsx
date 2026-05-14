import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
  Avatar,
  Skeleton,
  Dialog,
  Tooltip,
} from "@mui/material";
import {
  Assignment,
  CalendarToday,
  CheckCircle,
  Functions,
  Groups,
  TrendingUp,
  Speed,
  Timeline,
  Person,
} from "@mui/icons-material";
import { useProjectContext } from "./ProjectDetail";
import { supabase } from "@/lib/supabase";

interface ProjectMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  product_owner: { label: "Product Owner", color: "#6366f1" },
  scrum_master: { label: "Scrum Master", color: "#8b5cf6" },
  developer: { label: "Desenvolvedor", color: "#10b981" },
  member: { label: "Membro", color: "#6b7280" },
};

// Role priority for deduplication (lower index = higher priority kept)
const ROLE_PRIORITY = ["product_owner", "scrum_master", "developer", "member"];

export default function ProjectOverview() {
  const { project, config } = useProjectContext();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Não definida";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const [progressMode, setProgressMode] = useState<"tasks" | "points">("tasks");
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    totalPoints: 0,
    completedPoints: 0,
  });

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberTaskCounts, setMemberTaskCounts] = useState<
    Record<string, number>
  >({});
  const [medalModal, setMedalModal] = useState<ProjectMember | null>(null);

  useEffect(() => {
    if (!project?.id) return;
    supabase
      .from("tasks")
      .select("status, story_points")
      .eq("project_id", project.id)
      .then(({ data }) => {
        if (!data) return;
        setTaskStats({
          total: data.length,
          completed: data.filter((t) => t.status === "done").length,
          totalPoints: data.reduce((s, t) => s + (t.story_points || 0), 0),
          completedPoints: data
            .filter((t) => t.status === "done")
            .reduce((s, t) => s + (t.story_points || 0), 0),
        });
      });
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const { data: projectTeams } = await supabase
          .from("project_teams")
          .select("team_id")
          .eq("project_id", project.id);

        const teamIds = (projectTeams || []).map((pt: any) => pt.team_id);
        if (teamIds.length === 0) {
          setMembers([]);
          return;
        }

        const { data: teamMembersData } = await supabase
          .from("team_members")
          .select(
            "role, user_profile:profiles!user_id(id, full_name, avatar_url)",
          )
          .in("team_id", teamIds);

        // Deduplicate: keep the highest-priority role when a user appears in multiple teams
        const unique = new Map<string, ProjectMember>();
        (teamMembersData || []).forEach((tm: any) => {
          const p = tm.user_profile;
          if (!p?.id) return;
          const existing = unique.get(p.id);
          if (!existing) {
            unique.set(p.id, {
              id: p.id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              role: tm.role,
            });
          } else {
            // Upgrade role if the new one has higher priority
            const existingPriority = ROLE_PRIORITY.indexOf(existing.role);
            const newPriority = ROLE_PRIORITY.indexOf(tm.role);
            if (
              newPriority !== -1 &&
              (existingPriority === -1 || newPriority < existingPriority)
            ) {
              unique.set(p.id, { ...existing, role: tm.role });
            }
          }
        });

        setMembers(
          Array.from(unique.values()).sort((a, b) => {
            const pa = ROLE_PRIORITY.indexOf(a.role);
            const pb = ROLE_PRIORITY.indexOf(b.role);
            if (pa !== pb) return pa - pb;
            return a.full_name.localeCompare(b.full_name);
          }),
        );
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;
    supabase
      .from("tasks")
      .select("assigned_to")
      .eq("project_id", project.id)
      .eq("status", "done")
      .not("assigned_to", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        (data as { assigned_to: string }[]).forEach((t) => {
          counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
        });
        setMemberTaskCounts(counts);
      });
  }, [project?.id]);

  const tasksProgress =
    taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;
  const pointsProgress =
    taskStats.totalPoints > 0
      ? Math.round((taskStats.completedPoints / taskStats.totalPoints) * 100)
      : 0;
  const progress = progressMode === "tasks" ? tasksProgress : pointsProgress;
  const progressColor = progressMode === "tasks" ? "#6366f1" : "#f59e0b";
  const progressBarGradient =
    progressMode === "tasks"
      ? "linear-gradient(90deg, #818cf8 0%, #6366f1 100%)"
      : "linear-gradient(90deg, #fde68a 0%, #f59e0b 100%)";

  const methodologyInfo = {
    agile: {
      label: "Metodologia Ágil",
      description: "Sprints, Kanban e entregas iterativas",
      color: "#6366f1",
      icon: <Speed />,
    },
    predictive: {
      label: "Metodologia Preditiva",
      description: "Gantt, WBS e planejamento detalhado",
      color: "#10b981",
      icon: <Timeline />,
    },
    hybrid: {
      label: "Metodologia Híbrida",
      description: "Combinação de Ágil e Preditivo",
      color: "#f59e0b",
      icon: <TrendingUp />,
    },
  };

  const methodology = config
    ? methodologyInfo[config.methodology]
    : methodologyInfo.agile;

  const getMedal = (count: number) => {
    if (count >= 30)
      return {
        emoji: "🥇",
        label: "Ouro",
        color: "#f59e0b",
        tier: "gold" as const,
      };
    if (count >= 20)
      return {
        emoji: "🥈",
        label: "Prata",
        color: "#94a3b8",
        tier: "silver" as const,
      };
    if (count >= 10)
      return {
        emoji: "🥉",
        label: "Bronze",
        color: "#cd7f32",
        tier: "bronze" as const,
      };
    return null;
  };

  const getFirstName = (fullName: string) => fullName.split(" ")[0];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Visão Geral
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Resumo e informações principais do projeto
      </Typography>

      <Grid container spacing={3}>
        {/* Progress Card */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              border: "1px solid",
              borderColor: "rgba(99, 102, 241, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(progressColor, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: progressColor,
                  transition: "all 0.3s ease",
                }}
              >
                {progressMode === "tasks" ? <CheckCircle /> : <Functions />}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Progresso do Projeto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progressMode === "tasks"
                    ? "Baseado nas tarefas concluídas"
                    : "Baseado nos pontos concluídos"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ToggleButtonGroup
                  value={progressMode}
                  exclusive
                  onChange={(_, v) => v && setProgressMode(v)}
                  size="small"
                  sx={{
                    bgcolor: "rgba(99, 102, 241, 0.07)",
                    borderRadius: 2,
                    p: 0.4,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: "0 !important",
                      borderRadius: "10px !important",
                      px: 1.5,
                      py: 0.3,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "none",
                      color: "text.secondary",
                      minWidth: 64,
                      "&.Mui-selected": {
                        bgcolor: "background.paper",
                        color: "#6366f1",
                        boxShadow: "0 1px 4px rgba(99, 102, 241, 0.2)",
                      },
                      "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)" },
                    },
                  }}
                >
                  <ToggleButton value="tasks">Tarefas</ToggleButton>
                  <ToggleButton value="points">Pontos</ToggleButton>
                </ToggleButtonGroup>
                <Chip
                  label={`${progress}%`}
                  sx={{
                    bgcolor: alpha(progressColor, 0.1),
                    color: progressColor,
                    fontWeight: 700,
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                  }}
                />
              </Box>
            </Box>

            {/* Glossy progress bar */}
            <Box
              sx={{
                position: "relative",
                height: 12,
                borderRadius: 6,
                bgcolor: "rgba(0, 0, 0, 0.07)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  right: "auto",
                  width: `${progress}%`,
                  borderRadius: 6,
                  background: progressBarGradient,
                  transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.28) 0%, transparent 55%)",
                    pointerEvents: "none",
                  },
                }}
              />
            </Box>

            {/* Insight chip — visible whenever the two metrics diverge meaningfully */}
            {taskStats.total > 0 &&
              taskStats.totalPoints > 0 &&
              Math.abs(pointsProgress - tasksProgress) >= 10 && (
                <Box
                  sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}
                >
                  <Chip
                    label={
                      pointsProgress > tasksProgress
                        ? `📈 Tarefas mais pesadas priorizadas — pontos (${pointsProgress}%) à frente das tarefas (${tasksProgress}%)`
                        : `⚠️ Muitas tarefas leves concluídas — pontos (${pointsProgress}%) atrás das tarefas (${tasksProgress}%)`
                    }
                    size="small"
                    sx={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      height: "auto",
                      py: 0.5,
                      "& .MuiChip-label": {
                        whiteSpace: "normal",
                        textAlign: "center",
                      },
                      bgcolor:
                        pointsProgress > tasksProgress
                          ? "rgba(16, 185, 129, 0.08)"
                          : "rgba(245, 158, 11, 0.08)",
                      color:
                        pointsProgress > tasksProgress ? "#059669" : "#d97706",
                      border: `1px solid ${pointsProgress > tasksProgress ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                    }}
                  />
                </Box>
              )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Início: <strong>{formatDate(project.start_date)}</strong>
                </Typography>
              </Box>
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ color: progressColor }}
              >
                {progressMode === "tasks"
                  ? `${taskStats.completed} / ${taskStats.total} tarefas`
                  : `${taskStats.completedPoints} / ${taskStats.totalPoints} pts`}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Término: <strong>{formatDate(project.end_date)}</strong>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Methodology Card */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              border: "1px solid",
              borderColor: alpha(methodology.color, 0.3),
              bgcolor: alpha(methodology.color, 0.02),
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: alpha(methodology.color, 0.15),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: methodology.color,
                mb: 2,
              }}
            >
              {methodology.icon}
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {methodology.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {methodology.description}
            </Typography>
          </Paper>
        </Grid>

        {/* Description Card */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Descrição
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {project.description ||
                "Nenhuma descrição adicionada para este projeto."}
            </Typography>
          </Paper>
        </Grid>

        {/* Envolvidos no Projeto */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              border: "1px solid rgba(99,102,241,0.15)",
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(99,102,241,0.03)"
                  : "rgba(99,102,241,0.015)",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6366f1",
                  }}
                >
                  <Groups />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ lineHeight: 1.2 }}
                  >
                    Participação no Projeto
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {membersLoading
                      ? "Carregando..."
                      : `${members.length} ${members.length === 1 ? "pessoa envolvida" : "pessoas envolvidas"}`}
                  </Typography>
                </Box>
              </Box>
              {!membersLoading && members.length > 0 && (
                <Chip
                  label={members.length}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: "rgba(99,102,241,0.1)",
                    color: "#6366f1",
                    fontSize: "0.8rem",
                    height: 26,
                  }}
                />
              )}
            </Box>

            {/* Loading skeletons */}
            {membersLoading ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {[...Array(4)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2.5,
                      border: "1.5px solid rgba(0,0,0,0.08)",
                      width: 200,
                    }}
                  >
                    <Skeleton variant="circular" width={44} height={44} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" height={16} />
                      <Skeleton
                        variant="rounded"
                        width="50%"
                        height={14}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : members.length === 0 ? (
              /* Empty state */
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 4,
                  gap: 1,
                  color: "text.secondary",
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    bgcolor: "rgba(99,102,241,0.07)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Person
                    sx={{ fontSize: 28, color: "rgba(99,102,241,0.4)" }}
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  Nenhum membro encontrado
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Associe times ao projeto para ver os envolvidos
                </Typography>
              </Box>
            ) : (
              /* Member cards */
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {members.map((member) => {
                  const role = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
                  return (
                    <Box
                      key={member.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        borderRadius: 2.5,
                        border: "1.5px solid",
                        borderColor: alpha(role.color, 0.18),
                        bgcolor: alpha(role.color, 0.05),
                        cursor: "default",
                        transition: "all 0.22s ease",
                        "&:hover": {
                          borderColor: alpha(role.color, 0.45),
                          bgcolor: alpha(role.color, 0.09),
                          transform: "translateY(-3px)",
                          boxShadow: `0 8px 20px ${alpha(role.color, 0.15)}`,
                        },
                      }}
                    >
                      <Box sx={{ position: "relative", flexShrink: 0 }}>
                        <Avatar
                          src={member.avatar_url ?? undefined}
                          alt={member.full_name}
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: role.color,
                            fontWeight: 700,
                            fontSize: "1rem",
                            border: `2px solid ${alpha(role.color, 0.25)}`,
                            boxShadow: `0 2px 8px ${alpha(role.color, 0.3)}`,
                          }}
                        >
                          {member.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </Avatar>
                        {(() => {
                          const count = memberTaskCounts[member.id] ?? 0;
                          const medal = getMedal(count);
                          if (!medal) return null;
                          return (
                            <Tooltip
                              title={`Medalha de ${medal.label} — ${count} tarefas concluídas`}
                              placement="top"
                            >
                              <Box
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMedalModal(member);
                                }}
                                sx={{
                                  position: "absolute",
                                  top: -7,
                                  right: -7,
                                  fontSize: "0.95rem",
                                  lineHeight: 1,
                                  cursor: "pointer",
                                  filter:
                                    "drop-shadow(0 1px 4px rgba(0,0,0,0.3))",
                                  transition: "transform 0.2s ease",
                                  "&:hover": { transform: "scale(1.4)" },
                                  userSelect: "none",
                                }}
                              >
                                {medal.emoji}
                              </Box>
                            </Tooltip>
                          );
                        })()}
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ lineHeight: 1.3, color: "text.primary" }}
                        >
                          {member.full_name}
                        </Typography>
                        <Chip
                          label={role.label}
                          size="small"
                          sx={{
                            mt: 0.5,
                            height: 18,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            bgcolor: role.color,
                            color: "white",
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Acesso Rápido
          </Typography>
          <Grid container spacing={2}>
            {config?.module_kanban && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(99, 102, 241, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6366f1",
                      mx: "auto",
                      mb: 1,
                    }}
                  >
                    <Assignment />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Kanban
                  </Typography>
                </Paper>
              </Grid>
            )}
            {config?.module_gantt && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                      mx: "auto",
                      mb: 1,
                    }}
                  >
                    <Timeline />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Gantt
                  </Typography>
                </Paper>
              </Grid>
            )}
            {config?.module_wbs && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(245, 158, 11, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f59e0b",
                      mx: "auto",
                      mb: 1,
                    }}
                  >
                    <Groups />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    WBS
                  </Typography>
                </Paper>
              </Grid>
            )}
            {config?.module_sprints && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(139, 92, 246, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#8b5cf6",
                      mx: "auto",
                      mb: 1,
                    }}
                  >
                    <Speed />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Sprints
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* Ada Medal Modal */}
      {medalModal &&
        (() => {
          const count = memberTaskCounts[medalModal.id] ?? 0;
          const medal = getMedal(count);
          if (!medal) return null;
          const firstName = getFirstName(medalModal.full_name);
          const adaMessages = {
            bronze: `Medalha de Bronze neste projeto para ${firstName}! 🥉 Com ${count} tarefa${count !== 1 ? "s" : ""} concluída${count !== 1 ? "s" : ""}, fica evidente o comprometimento com as entregas. Cada passo conta — e ${firstName} está claramente no caminho certo!`,
            silver: `Que conquista incrível! 🥈 ${firstName} recebeu a Medalha de Prata de forma mais que merecida: ${count} tarefas concluídas neste projeto revelam dedicação e consistência. ${firstName} é um pilar deste projeto!`,
            gold: `${firstName} atingiu o mais alto nível! 🥇 A Medalha de Ouro celebra ${count} tarefas concluídas neste projeto — um feito que inspira todo o time. ${firstName} é um verdadeiro exemplo de comprometimento com este projeto. Orgulho!`,
          };
          const glowColor = medal.color;
          return (
            <Dialog
              open
              onClose={() => setMedalModal(null)}
              maxWidth="xs"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow:
                    "0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(99,102,241,0.1)",
                },
              }}
            >
              {/* Ada header */}
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
                  px: 3,
                  py: 2.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.4)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
                    flexShrink: 0,
                  }}
                >
                  <video
                    src="/ADA.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    color="white"
                    sx={{ lineHeight: 1.2 }}
                  >
                    Ada parabeniza:
                  </Typography>
                  {/* <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    Concedi esta medalha!
                  </Typography> */}
                </Box>
                <Box
                  sx={{
                    fontSize: "2.2rem",
                    filter: `drop-shadow(0 2px 10px ${glowColor}99)`,
                    lineHeight: 1,
                  }}
                >
                  {medal.emoji}
                </Box>
              </Box>

              {/* Content */}
              <Box sx={{ p: 3 }}>
                {/* Member row */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2.5,
                  }}
                >
                  <Avatar
                    src={medalModal.avatar_url ?? undefined}
                    alt={medalModal.full_name}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: ROLE_CONFIG[medalModal.role]?.color ?? "#6b7280",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      border: `2px solid ${alpha(glowColor, 0.4)}`,
                      boxShadow: `0 0 12px ${alpha(glowColor, 0.35)}`,
                    }}
                  >
                    {medalModal.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {medalModal.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ROLE_CONFIG[medalModal.role]?.label ?? "Membro"}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${count} tarefas`}
                    size="small"
                    sx={{
                      ml: "auto",
                      bgcolor: alpha(glowColor, 0.12),
                      color: glowColor,
                      fontWeight: 700,
                      border: `1px solid ${alpha(glowColor, 0.3)}`,
                      fontSize: "0.72rem",
                    }}
                  />
                </Box>

                {/* Speech bubble */}
                <Box
                  sx={{
                    bgcolor: "rgba(99,102,241,0.05)",
                    border: "1px solid rgba(99,102,241,0.14)",
                    borderRadius: 3,
                    p: 2.5,
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: -8,
                      left: 20,
                      width: 14,
                      height: 14,
                      bgcolor: "rgba(99,102,241,0.05)",
                      border: "1px solid rgba(99,102,241,0.14)",
                      borderRight: "none",
                      borderBottom: "none",
                      transform: "rotate(45deg)",
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ lineHeight: 1.8, color: "text.primary" }}
                  >
                    {adaMessages[medal.tier]}
                  </Typography>
                </Box>
              </Box>
            </Dialog>
          );
        })()}
    </Box>
  );
}
