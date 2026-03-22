import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  CircularProgress,
  IconButton,
  Avatar,
  AvatarGroup,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Settings,
  TrendingUp,
} from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTheme as useMUITheme } from "@mui/material/styles";
import Navbar from "@/components/Navbar";
import ActiveProjectsWidget from "@/components/ActiveProjectsWidget";
import ActiveSprintsWidget from "@/components/ActiveSprintsWidget";
import ActionItemsWidget from "@/components/ActionItemsWidget";
import { WidgetCustomizationModal, TeamMemberDetailModal, TasksByStatusModal } from "@/components/dashboard";
import { IOSWidget } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { WidgetType } from "@/types";

interface TaskStats {
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  blocked: number;
  total: number;
}

interface Activity {
  id: string;
  action: string;
  task: string;
  time: string;
  created_at: string;
}

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  tasks_count: number;
  completed_count: number;
}

interface WeeklyData {
  day: string;
  completed: number;
  created: number;
}

const ACTIVITIES_PER_PAGE = 4;
const TEAM_WORKLOAD_PER_PAGE = 4;

// Widget component mapping
const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType | null> = {
  activeProjects: ActiveProjectsWidget,
  activeSprints: ActiveSprintsWidget,
  actionItems: ActionItemsWidget,
  activityOverview: null,
  taskDistribution: null,
  recentActivity: null,
  productivityTrend: null,
  teamWorkload: null,
};

// Widget grid sizes - widgets that take half width on large screens
const LARGE_WIDGETS: WidgetType[] = [
  "productivityTrend",
  "teamWorkload",
];

export default function Dashboard() {
  const { user } = useAuth();
  const { dashboardConfig } = useDashboardConfig();
  const muiTheme = useMUITheme();
  const isDarkMode = muiTheme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<TeamMember[]>([]);
  const [teamWorkloadPage, setTeamWorkloadPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<{
    key: string;
    label: string;
    color: string;
  } | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const totalActivitiesPages = Math.ceil(
    recentActivities.length / ACTIVITIES_PER_PAGE,
  );
  const activitiesStartIndex = (activitiesPage - 1) * ACTIVITIES_PER_PAGE;
  const paginatedActivities = recentActivities.slice(
    activitiesStartIndex,
    activitiesStartIndex + ACTIVITIES_PER_PAGE,
  );

  // Sort team workload by tasks_count (descending) and paginate
  const sortedTeamWorkload = useMemo(() => {
    return [...teamWorkload].sort((a, b) => b.tasks_count - a.tasks_count);
  }, [teamWorkload]);

  const totalTeamWorkloadPages = Math.ceil(
    sortedTeamWorkload.length / TEAM_WORKLOAD_PER_PAGE,
  );
  const teamWorkloadStartIndex =
    (teamWorkloadPage - 1) * TEAM_WORKLOAD_PER_PAGE;
  const paginatedTeamWorkload = sortedTeamWorkload.slice(
    teamWorkloadStartIndex,
    teamWorkloadStartIndex + TEAM_WORKLOAD_PER_PAGE,
  );

  // Get visible widgets sorted by order
  const visibleWidgets = useMemo(() => {
    return dashboardConfig.widgets
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);
  }, [dashboardConfig.widgets]);

  // Get grid size for a widget type
  const getWidgetGridSize = (type: WidgetType) => {
    if (LARGE_WIDGETS.includes(type)) {
      return { xs: 12, lg: 6 };
    }
    return { xs: 12, md: 6, lg: 4 };
  };

  // Get user's first name
  const firstName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || "";
    return fullName.split(" ")[0] || "Usuário";
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch ALL tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("status, assigned_to, created_at");

      if (tasksError) throw tasksError;

      const stats: TaskStats = {
        todo: tasks?.filter((t) => t.status === "todo").length || 0,
        in_progress:
          tasks?.filter((t) => t.status === "in-progress").length || 0,
        review: tasks?.filter((t) => t.status === "review").length || 0,
        done: tasks?.filter((t) => t.status === "done").length || 0,
        blocked: tasks?.filter((t) => t.status === "blocked").length || 0,
        total: tasks?.length || 0,
      };

      setTaskStats(stats);

      // Fetch project stats
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("status");

      if (projectsError) throw projectsError;

      const pStats: ProjectStats = {
        total: projects?.length || 0,
        active: projects?.filter((p) => p.status === "active").length || 0,
        completed:
          projects?.filter((p) => p.status === "completed").length || 0,
        onHold: projects?.filter((p) => p.status === "on-hold").length || 0,
      };

      setProjectStats(pStats);

      // Fetch weekly productivity data (last 7 days)
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: weeklyTasks, error: weeklyError } = await supabase
        .from("tasks")
        .select("status, created_at, updated_at")
        .gte("created_at", weekAgo.toISOString());

      if (!weeklyError && weeklyTasks) {
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const weekData: WeeklyData[] = [];

        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dayStart = new Date(date.setHours(0, 0, 0, 0));
          const dayEnd = new Date(date.setHours(23, 59, 59, 999));

          const created = weeklyTasks.filter((t) => {
            const createdAt = new Date(t.created_at);
            return createdAt >= dayStart && createdAt <= dayEnd;
          }).length;

          const completed = weeklyTasks.filter((t) => {
            if (t.status !== "done") return false;
            const updatedAt = new Date(t.updated_at);
            return updatedAt >= dayStart && updatedAt <= dayEnd;
          }).length;

          weekData.push({
            day: dayNames[
              new Date(now.getTime() - i * 24 * 60 * 60 * 1000).getDay()
            ],
            created,
            completed,
          });
        }

        setWeeklyData(weekData);
      }

      // Fetch team workload with profile photos
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .limit(6);

      if (!profilesError && profiles && tasks) {
        const workloadData: TeamMember[] = profiles
          .map((profile) => {
            const memberTasks = tasks.filter(
              (t) => t.assigned_to === profile.id,
            );
            return {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              tasks_count: memberTasks.length,
              completed_count: memberTasks.filter((t) => t.status === "done")
                .length,
            };
          })
          .filter((m) => m.tasks_count > 0);

        setTeamWorkload(workloadData);
      }

      // Fetch recent activities
      const { data: recentTasks, error: tasksActivityError } = await supabase
        .from("tasks")
        .select("id, title, created_at, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (tasksActivityError) throw tasksActivityError;

      const { data: recentSprints, error: sprintsActivityError } =
        await supabase
          .from("sprints")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

      if (sprintsActivityError) throw sprintsActivityError;

      const { data: recentProjects, error: projectsActivityError } =
        await supabase
          .from("projects")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

      if (projectsActivityError) throw projectsActivityError;

      const activities: Activity[] = [];

      recentTasks?.forEach((task) => {
        if (task.status === "done") {
          activities.push({
            id: task.id,
            action: "Tarefa concluída",
            task: task.title,
            time: formatTimeAgo(task.created_at),
            created_at: task.created_at,
          });
        }
      });

      recentSprints?.forEach((sprint) => {
        activities.push({
          id: sprint.id,
          action: "Sprint criado",
          task: sprint.name,
          time: formatTimeAgo(sprint.created_at),
          created_at: sprint.created_at,
        });
      });

      recentProjects?.forEach((project) => {
        activities.push({
          id: project.id,
          action: "Projeto criado",
          task: project.name,
          time: formatTimeAgo(project.created_at),
          created_at: project.created_at,
        });
      });

      activities.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRecentActivities(activities.slice(0, 20));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60)
      return `há ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
    if (diffHours < 24)
      return `há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    return `há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
  };

  const calculateProgress = () => {
    if (!taskStats || taskStats.total === 0) return 0;
    return Math.round((taskStats.done / taskStats.total) * 100);
  };

  // Generate summary text
  const summaryText = useMemo(() => {
    if (!projectStats) return "";
    const parts: string[] = [];
    if (projectStats.completed > 0)
      parts.push(`${projectStats.completed} projetos concluídos`);
    if (projectStats.active > 0)
      parts.push(`${projectStats.active} projetos ativos`);
    if (projectStats.onHold > 0) parts.push(`${projectStats.onHold} em espera`);
    return parts.join(" · ") || "Nenhum projeto ainda";
  }, [projectStats]);

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle member click to open detail modal
  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setMemberDetailOpen(true);
  };

  // Handle status click to open tasks modal
  const handleStatusClick = (statusKey: string, label: string, color: string) => {
    setSelectedStatus({ key: statusKey, label, color });
    setStatusModalOpen(true);
  };

  // Render a widget by type
  const renderWidget = (type: WidgetType) => {
    // Component-based widgets
    const Component = WIDGET_COMPONENTS[type];
    if (Component) {
      return <Component />;
    }

    // Inline widgets
    switch (type) {
      case "productivityTrend":
        return (
          <IOSWidget accentColor="#10b981">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Produtividade Semanal
              </Typography>
              <Chip
                icon={<TrendingUp sx={{ fontSize: 16 }} />}
                label="Últimos 7 dias"
                size="small"
                sx={{
                  bgcolor: "rgba(16, 185, 129, 0.1)",
                  color: "#059669",
                  fontWeight: 600,
                  "& .MuiChip-icon": { color: "#059669" },
                }}
              />
            </Box>

            {loading ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", py: 6 }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                        border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        boxShadow: isDarkMode ? "0 10px 25px rgba(0, 0, 0, 0.4)" : "0 10px 25px rgba(0, 0, 0, 0.1)",
                        padding: "12px 16px",
                        color: isDarkMode ? "#f1f5f9" : "#1e293b",
                      }}
                      formatter={(value, name) => [
                        value,
                        name === "completed" ? "Concluídas" : "Criadas",
                      ]}
                    />
                    <Legend
                      formatter={(value) => (
                        <span
                          style={{
                            color: isDarkMode ? "#94a3b8" : "#4b5563",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {value === "completed"
                            ? "Concluídas"
                            : "Criadas"}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ fill: "#10b981", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ fill: "#6366f1", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </IOSWidget>
        );

      case "teamWorkload":
        return (
          <IOSWidget accentColor="#7c3aed">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Carga de Trabalho do Time
              </Typography>
              <AvatarGroup
                max={4}
                sx={{
                  "& .MuiAvatar-root": {
                    width: 28,
                    height: 28,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "2px solid white",
                  },
                }}
              >
                {teamWorkload.map((member) => (
                  <Avatar
                    key={member.id}
                    src={member.avatar_url}
                    alt={member.full_name}
                    sx={{ bgcolor: "#7c3aed" }}
                  >
                    {getInitials(member.full_name)}
                  </Avatar>
                ))}
              </AvatarGroup>
            </Box>

            {loading ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", py: 6 }}
              >
                <CircularProgress />
              </Box>
            ) : sortedTeamWorkload.length > 0 ? (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                {paginatedTeamWorkload.map((member) => {
                  const progress =
                    member.tasks_count > 0
                      ? Math.round(
                          (member.completed_count / member.tasks_count) *
                            100,
                        )
                      : 0;

                  return (
                    <Box
                      key={member.id}
                      onClick={() => handleMemberClick(member)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 1,
                        mx: -1,
                        borderRadius: 2,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "rgba(124, 58, 237, 0.06)",
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <MuiTooltip title={`Ver detalhes de ${member.full_name}`} arrow>
                        <Avatar
                          src={member.avatar_url}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "#7c3aed",
                            border: "2px solid",
                            borderColor: "rgba(124, 58, 237, 0.2)",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: "#7c3aed",
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          {getInitials(member.full_name)}
                        </Avatar>
                      </MuiTooltip>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{ maxWidth: 150 }}
                          >
                            {member.full_name.split(" ")[0]}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {member.completed_count}/{member.tasks_count}{" "}
                            tarefas
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "rgba(124, 58, 237, 0.1)",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                              bgcolor:
                                progress >= 75
                                  ? "#10b981"
                                  : progress >= 50
                                    ? "#f59e0b"
                                    : "#7c3aed",
                            },
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          color:
                            progress >= 75
                              ? "#10b981"
                              : progress >= 50
                                ? "#f59e0b"
                                : "#7c3aed",
                          minWidth: 36,
                          textAlign: "right",
                        }}
                      >
                        {progress}%
                      </Typography>
                    </Box>
                  );
                })}

                {/* Pagination Controls */}
                {totalTeamWorkloadPages > 1 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      mt: 2,
                      pt: 2,
                      borderTop: "1px solid",
                      borderColor: "rgba(124, 58, 237, 0.1)",
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() =>
                        setTeamWorkloadPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={teamWorkloadPage === 1}
                      sx={{
                        bgcolor: "rgba(124, 58, 237, 0.1)",
                        "&:hover": { bgcolor: "rgba(124, 58, 237, 0.2)" },
                        "&.Mui-disabled": {
                          bgcolor: "rgba(124, 58, 237, 0.05)",
                        },
                      }}
                    >
                      <KeyboardArrowLeft
                        sx={{
                          color:
                            teamWorkloadPage === 1
                              ? "text.disabled"
                              : "#7c3aed",
                        }}
                      />
                    </IconButton>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: "#7c3aed", minWidth: 60, textAlign: "center" }}
                    >
                      {teamWorkloadPage} / {totalTeamWorkloadPages}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setTeamWorkloadPage((prev) =>
                          Math.min(totalTeamWorkloadPages, prev + 1)
                        )
                      }
                      disabled={teamWorkloadPage === totalTeamWorkloadPages}
                      sx={{
                        bgcolor: "rgba(124, 58, 237, 0.1)",
                        "&:hover": { bgcolor: "rgba(124, 58, 237, 0.2)" },
                        "&.Mui-disabled": {
                          bgcolor: "rgba(124, 58, 237, 0.05)",
                        },
                      }}
                    >
                      <KeyboardArrowRight
                        sx={{
                          color:
                            teamWorkloadPage === totalTeamWorkloadPages
                              ? "text.disabled"
                              : "#7c3aed",
                        }}
                      />
                    </IconButton>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma tarefa atribuída
                </Typography>
              </Box>
            )}
          </IOSWidget>
        );

      case "activityOverview":
        return (
          <IOSWidget accentColor="#6366f1">
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Visão Geral
            </Typography>

            {loading ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", py: 6 }}
              >
                <CircularProgress />
              </Box>
            ) : taskStats && taskStats.total > 0 ? (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Progresso Geral
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {taskStats.done}/{taskStats.total}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Grid container spacing={1.5}>
                  {[
                    {
                      key: "todo",
                      label: "A Fazer",
                      value: taskStats.todo,
                      color: "#6b7280",
                    },
                    {
                      key: "in-progress",
                      label: "Em Progresso",
                      value: taskStats.in_progress,
                      color: "#f59e0b",
                    },
                    {
                      key: "review",
                      label: "Em Revisão",
                      value: taskStats.review,
                      color: "#8b5cf6",
                    },
                    {
                      key: "done",
                      label: "Concluído",
                      value: taskStats.done,
                      color: "#10b981",
                    },
                    {
                      key: "blocked",
                      label: "Bloqueado",
                      value: taskStats.blocked,
                      color: "#ef4444",
                    },
                  ].map((stat) => (
                    <Grid item xs={6} key={stat.label}>
                      <Box
                        onClick={() => stat.value > 0 && handleStatusClick(stat.key, stat.label, stat.color)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: `${stat.color}08`,
                          border: "1px solid",
                          borderColor: `${stat.color}20`,
                          cursor: stat.value > 0 ? "pointer" : "default",
                          transition: "all 0.2s ease",
                          "&:hover": stat.value > 0 ? {
                            transform: "translateY(-2px)",
                            boxShadow: `0 4px 12px ${stat.color}25`,
                            borderColor: `${stat.color}40`,
                            bgcolor: `${stat.color}12`,
                          } : {},
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {stat.label}
                        </Typography>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{ color: stat.color }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma atividade encontrada
                </Typography>
              </Box>
            )}
          </IOSWidget>
        );

      case "taskDistribution": {
        // Generate insight text for data storytelling
        const getInsightText = () => {
          if (!taskStats || taskStats.total === 0) return "";

          const completedPercent = Math.round((taskStats.done / taskStats.total) * 100);

          // Priority: blocked tasks (alert), then completion rate
          if (taskStats.blocked > 0) {
            return `${taskStats.blocked} ${taskStats.blocked === 1 ? "tarefa bloqueada" : "tarefas bloqueadas"} requer atenção`;
          }
          if (completedPercent >= 75) {
            return `${completedPercent}% das tarefas concluídas`;
          }
          if (taskStats.in_progress > 0) {
            return `${taskStats.in_progress} ${taskStats.in_progress === 1 ? "tarefa" : "tarefas"} em andamento`;
          }
          return `${completedPercent}% das tarefas concluídas`;
        };

        const taskStatusData = [
          { name: "A Fazer", value: taskStats?.todo || 0, color: "#6b7280" },
          { name: "Em Progresso", value: taskStats?.in_progress || 0, color: "#f59e0b" },
          { name: "Em Revisão", value: taskStats?.review || 0, color: "#8b5cf6" },
          { name: "Concluído", value: taskStats?.done || 0, color: "#10b981" },
          { name: "Bloqueado", value: taskStats?.blocked || 0, color: "#ef4444" },
        ].filter((item) => item.value > 0);

        const insightText = getInsightText();
        const insightColor = taskStats?.blocked && taskStats.blocked > 0 ? "#ef4444" : "#6b7280";

        return (
          <IOSWidget accentColor="#8b5cf6">
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="h6" fontWeight={700}>
                Status das Tarefas
              </Typography>
              {taskStats && taskStats.total > 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: insightColor,
                    fontWeight: 500,
                    mt: 0.5,
                  }}
                >
                  {insightText}
                </Typography>
              )}
            </Box>

            {loading ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", py: 6 }}
              >
                <CircularProgress />
              </Box>
            ) : taskStats && taskStats.total > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Donut Chart - Centered and larger */}
                <Box sx={{ position: "relative", width: 200, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} tarefas`, name]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                          border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.1)",
                          color: isDarkMode ? "#f1f5f9" : "#1e293b",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{ color: isDarkMode ? "#818cf8" : "#6366f1" }}
                    >
                      {taskStats.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      Total
                    </Typography>
                  </Box>
                </Box>

                {/* Labels - Below the chart */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 1.5,
                    mt: 2,
                    width: "100%",
                  }}
                >
                  {taskStatusData.map((item) => {
                    const percentage = Math.round((item.value / taskStats.total) * 100);
                    return (
                      <Box
                        key={item.name}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: `${item.color}10`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: item.color,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: item.color,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        >
                          {item.name} {percentage}%
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma tarefa
                </Typography>
              </Box>
            )}
          </IOSWidget>
        );
      }

      case "recentActivity":
        return (
          <IOSWidget accentColor="#6366f1">
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Atividade Recente
              </Typography>

              {loading ? (
                <Box
                  sx={{ display: "flex", justifyContent: "center", py: 4 }}
                >
                  <CircularProgress />
                </Box>
              ) : recentActivities.length > 0 ? (
                <>
                  <Box sx={{ flex: 1, overflowY: "auto" }}>
                    {paginatedActivities.map((item, index) => (
                      <Box
                        key={item.id}
                        sx={{
                          py: 1.5,
                          borderBottom:
                            index < paginatedActivities.length - 1
                              ? "1px solid"
                              : "none",
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {item.action}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {item.task}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ mt: 0.25 }}
                        >
                          {item.time}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  {totalActivitiesPages > 1 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        mt: 2,
                        pt: 1.5,
                        borderTop: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setActivitiesPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={activitiesPage === 1}
                      >
                        <KeyboardArrowLeft fontSize="small" />
                      </IconButton>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                      >
                        {activitiesPage} / {totalActivitiesPages}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setActivitiesPage((prev) =>
                            Math.min(prev + 1, totalActivitiesPages),
                          )
                        }
                        disabled={activitiesPage === totalActivitiesPages}
                      >
                        <KeyboardArrowRight fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma atividade recente
                  </Typography>
                </Box>
              )}
            </Box>
          </IOSWidget>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {/* Clean Header Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            mb: 4,
            textAlign: "center",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: "text.primary",
                letterSpacing: "-0.01em",
                mb: 0.5,
              }}
            >
              Olá, {firstName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
              }}
            >
              {loading ? (
                <CircularProgress size={12} sx={{ mr: 1 }} />
              ) : (
                summaryText
              )}
            </Typography>
          </Box>

          <IconButton
            onClick={() => setCustomizeModalOpen(true)}
            sx={{
              position: "absolute",
              right: 0,
              bgcolor: "rgba(99, 102, 241, 0.08)",
              color: "#6366f1",
              "&:hover": {
                bgcolor: "rgba(99, 102, 241, 0.15)",
              },
            }}
          >
            <Settings fontSize="small" />
          </IconButton>
        </Box>

        {/* All Widgets - Rendered in user's chosen order */}
        {visibleWidgets.length > 0 && (
          <Grid container spacing={2.5}>
            {visibleWidgets.map((widget) => {
              const gridSize = getWidgetGridSize(widget.type);
              return (
                <Grid item {...gridSize} key={widget.id}>
                  {renderWidget(widget.type)}
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Empty state */}
        {visibleWidgets.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum widget visível
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure seu dashboard
            </Typography>
            <IconButton
              onClick={() => setCustomizeModalOpen(true)}
              sx={{ bgcolor: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}
            >
              <Settings />
            </IconButton>
          </Box>
        )}
      </Container>

      <WidgetCustomizationModal
        open={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
      />

      <TeamMemberDetailModal
        open={memberDetailOpen}
        onClose={() => {
          setMemberDetailOpen(false);
          setSelectedMember(null);
        }}
        memberId={selectedMember?.id || null}
        memberName={selectedMember?.full_name || ""}
        memberAvatar={selectedMember?.avatar_url}
      />

      <TasksByStatusModal
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setSelectedStatus(null);
        }}
        status={selectedStatus?.key || null}
        statusLabel={selectedStatus?.label || ""}
        statusColor={selectedStatus?.color || "#6366f1"}
      />
    </Box>
  );
}
