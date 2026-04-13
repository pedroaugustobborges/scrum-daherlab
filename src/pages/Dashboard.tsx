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
  CheckCircle,
  AddTask,
  DirectionsRun,
  FolderOpen,
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
import {
  WidgetCustomizationModal,
  TeamMemberDetailModal,
  TasksByStatusModal,
} from "@/components/dashboard";
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

type ActivityType =
  | "task_done"
  | "task_created"
  | "sprint_created"
  | "project_created";

interface Activity {
  id: string;
  type: ActivityType;
  label: string;
  name: string;
  time: string;
  created_at: string;
  projectName?: string;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { Icon: React.ComponentType<any>; color: string; bg: string }
> = {
  task_done: {
    Icon: CheckCircle,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
  },
  task_created: {
    Icon: AddTask,
    color: "#6366f1",
    bg: "rgba(99, 102, 241, 0.1)",
  },
  sprint_created: {
    Icon: DirectionsRun,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
  },
  project_created: {
    Icon: FolderOpen,
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.1)",
  },
};

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

interface ProductivityData {
  label: string;
  completed: number;
  created: number;
}

type ProductivityPeriod =
  | "week"
  | "month"
  | "quarter"
  | "semester"
  | "year"
  | "triennium"
  | "quinquennium";

const PRODUCTIVITY_PERIODS: {
  key: ProductivityPeriod;
  label: string;
  shortLabel: string;
}[] = [
  { key: "week", label: "Semana", shortLabel: "7D" },
  { key: "month", label: "Mês", shortLabel: "1M" },
  { key: "quarter", label: "Trimestre", shortLabel: "3M" },
  { key: "semester", label: "Semestre", shortLabel: "6M" },
  { key: "year", label: "Ano", shortLabel: "1A" },
  { key: "triennium", label: "Triênio", shortLabel: "3A" },
  { key: "quinquennium", label: "Quinquênio", shortLabel: "5A" },
];

const ACTIVITIES_PER_PAGE = 5;
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
const LARGE_WIDGETS: WidgetType[] = ["productivityTrend", "teamWorkload"];

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
  const [productivityData, setProductivityData] = useState<ProductivityData[]>(
    [],
  );
  const [productivityPeriod, setProductivityPeriod] =
    useState<ProductivityPeriod>("week");
  const [productivityLoading, setProductivityLoading] = useState(false);
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

      // Fetch team workload - get all users who have tasks assigned
      if (tasks && tasks.length > 0) {
        // Get unique user IDs from tasks that have an assigned_to value
        const assignedUserIds = [
          ...new Set(
            tasks
              .map((t) => t.assigned_to)
              .filter((id): id is string => id !== null && id !== undefined),
          ),
        ];

        if (assignedUserIds.length > 0) {
          // Fetch profiles only for users who have tasks assigned
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", assignedUserIds);

          if (!profilesError && profiles) {
            const workloadData: TeamMember[] = profiles.map((profile) => {
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
            });

            setTeamWorkload(workloadData);
          }
        } else {
          setTeamWorkload([]);
        }
      } else {
        setTeamWorkload([]);
      }

      // Fetch recent activities
      const [tasksRes, sprintsRes2, projectsRes2] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, project_id, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(15),
        supabase
          .from("sprints")
          .select("id, name, project_id, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("projects")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      // Batch-resolve project names for tasks and sprints
      const activityProjectIds = [
        ...new Set([
          ...(tasksRes.data || []).map((t) => t.project_id).filter(Boolean),
          ...(sprintsRes2.data || []).map((s) => s.project_id).filter(Boolean),
        ]),
      ];
      const projectNameMap: Record<string, string> = {};
      if (activityProjectIds.length > 0) {
        const { data: projectNames } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", activityProjectIds);
        projectNames?.forEach((p) => { projectNameMap[p.id] = p.name; });
      }

      const activities: Activity[] = [];

      tasksRes.data?.forEach((task) => {
        if (task.status === "done") {
          activities.push({
            id: `task-done-${task.id}`,
            type: "task_done",
            label: "Tarefa concluída",
            name: task.title,
            time: formatTimeAgo(task.updated_at || task.created_at),
            created_at: task.updated_at || task.created_at,
            projectName: task.project_id ? projectNameMap[task.project_id] : undefined,
          });
        } else {
          activities.push({
            id: `task-created-${task.id}`,
            type: "task_created",
            label: "Tarefa criada",
            name: task.title,
            time: formatTimeAgo(task.created_at),
            created_at: task.created_at,
            projectName: task.project_id ? projectNameMap[task.project_id] : undefined,
          });
        }
      });

      sprintsRes2.data?.forEach((sprint) => {
        activities.push({
          id: `sprint-${sprint.id}`,
          type: "sprint_created",
          label: "Sprint criado",
          name: sprint.name,
          time: formatTimeAgo(sprint.created_at),
          created_at: sprint.created_at,
          projectName: sprint.project_id ? projectNameMap[sprint.project_id] : undefined,
        });
      });

      projectsRes2.data?.forEach((project) => {
        activities.push({
          id: `project-${project.id}`,
          type: "project_created",
          label: "Projeto criado",
          name: project.name,
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

  // Fetch productivity data based on selected period
  const fetchProductivityData = async (period: ProductivityPeriod) => {
    setProductivityLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let intervals: { start: Date; end: Date; label: string }[] = [];

      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const monthNames = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];

      switch (period) {
        case "week":
          // Last 7 days
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            intervals.push({
              start: dayStart,
              end: dayEnd,
              label: dayNames[date.getDay()],
            });
          }
          break;

        case "month":
          // Last 30 days, grouped by week
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          for (let i = 4; i >= 0; i--) {
            const weekEnd = new Date(
              now.getTime() - i * 7 * 24 * 60 * 60 * 1000,
            );
            const weekStart = new Date(
              weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000,
            );
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(23, 59, 59, 999);
            const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
            intervals.push({
              start: weekStart,
              end: weekEnd,
              label: weekLabel,
            });
          }
          break;

        case "quarter":
          // Last 3 months, grouped by week
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 3);
          for (let i = 11; i >= 0; i--) {
            const weekEnd = new Date(
              now.getTime() - i * 7 * 24 * 60 * 60 * 1000,
            );
            const weekStart = new Date(
              weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000,
            );
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(23, 59, 59, 999);
            const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
            intervals.push({
              start: weekStart,
              end: weekEnd,
              label: weekLabel,
            });
          }
          break;

        case "semester":
          // Last 6 months, grouped by month
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 6);
          for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now);
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthStart = new Date(
              monthDate.getFullYear(),
              monthDate.getMonth(),
              1,
            );
            const monthEnd = new Date(
              monthDate.getFullYear(),
              monthDate.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
            intervals.push({
              start: monthStart,
              end: monthEnd,
              label: monthNames[monthDate.getMonth()],
            });
          }
          break;

        case "year":
          // Last 12 months, grouped by month
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(now);
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthStart = new Date(
              monthDate.getFullYear(),
              monthDate.getMonth(),
              1,
            );
            const monthEnd = new Date(
              monthDate.getFullYear(),
              monthDate.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
            intervals.push({
              start: monthStart,
              end: monthEnd,
              label: monthNames[monthDate.getMonth()],
            });
          }
          break;

        case "triennium":
          // Last 3 years, grouped by quarter
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 3);
          for (let i = 11; i >= 0; i--) {
            const quarterDate = new Date(now);
            quarterDate.setMonth(quarterDate.getMonth() - i * 3);
            const quarterStart = new Date(
              quarterDate.getFullYear(),
              Math.floor(quarterDate.getMonth() / 3) * 3,
              1,
            );
            const quarterEnd = new Date(
              quarterDate.getFullYear(),
              Math.floor(quarterDate.getMonth() / 3) * 3 + 3,
              0,
              23,
              59,
              59,
              999,
            );
            const quarterNum = Math.floor(quarterStart.getMonth() / 3) + 1;
            intervals.push({
              start: quarterStart,
              end: quarterEnd,
              label: `T${quarterNum}/${quarterStart.getFullYear().toString().slice(-2)}`,
            });
          }
          break;

        case "quinquennium":
          // Last 5 years, grouped by semester
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 5);
          for (let i = 9; i >= 0; i--) {
            const semesterDate = new Date(now);
            semesterDate.setMonth(semesterDate.getMonth() - i * 6);
            const semesterStart = new Date(
              semesterDate.getFullYear(),
              Math.floor(semesterDate.getMonth() / 6) * 6,
              1,
            );
            const semesterEnd = new Date(
              semesterDate.getFullYear(),
              Math.floor(semesterDate.getMonth() / 6) * 6 + 6,
              0,
              23,
              59,
              59,
              999,
            );
            const semesterNum = Math.floor(semesterStart.getMonth() / 6) + 1;
            intervals.push({
              start: semesterStart,
              end: semesterEnd,
              label: `S${semesterNum}/${semesterStart.getFullYear().toString().slice(-2)}`,
            });
          }
          break;
      }

      // Fetch tasks for the entire period
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("status, created_at, updated_at")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Process tasks into intervals
      const data: ProductivityData[] = intervals.map((interval) => {
        const created =
          tasks?.filter((t) => {
            const createdAt = new Date(t.created_at);
            return createdAt >= interval.start && createdAt <= interval.end;
          }).length || 0;

        const completed =
          tasks?.filter((t) => {
            if (t.status !== "done") return false;
            const updatedAt = new Date(t.updated_at);
            return updatedAt >= interval.start && updatedAt <= interval.end;
          }).length || 0;

        return { label: interval.label, created, completed };
      });

      setProductivityData(data);
    } catch (error) {
      console.error("Error fetching productivity data:", error);
    } finally {
      setProductivityLoading(false);
    }
  };

  // Fetch productivity data when period changes
  useEffect(() => {
    fetchProductivityData(productivityPeriod);
  }, [productivityPeriod]);

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
  const handleStatusClick = (
    statusKey: string,
    label: string,
    color: string,
  ) => {
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
      case "productivityTrend": {
        const currentPeriodConfig = PRODUCTIVITY_PERIODS.find(
          (p) => p.key === productivityPeriod,
        );
        return (
          <IOSWidget accentColor="#10b981">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Produtividade
                </Typography>
                <Chip
                  icon={<TrendingUp sx={{ fontSize: 14 }} />}
                  label={currentPeriodConfig?.label || "Semana"}
                  size="small"
                  sx={{
                    bgcolor: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    height: 24,
                    "& .MuiChip-icon": { color: "#059669" },
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  gap: 0.5,
                  bgcolor: isDarkMode
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                  borderRadius: 2,
                  p: 0.5,
                }}
              >
                {PRODUCTIVITY_PERIODS.map((period) => (
                  <Box
                    key={period.key}
                    onClick={() => setProductivityPeriod(period.key)}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      bgcolor:
                        productivityPeriod === period.key
                          ? "#10b981"
                          : "transparent",
                      color:
                        productivityPeriod === period.key
                          ? "white"
                          : isDarkMode
                            ? "#94a3b8"
                            : "#6b7280",
                      fontWeight: productivityPeriod === period.key ? 600 : 500,
                      fontSize: "0.7rem",
                      "&:hover": {
                        bgcolor:
                          productivityPeriod === period.key
                            ? "#10b981"
                            : isDarkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.08)",
                      },
                    }}
                  >
                    {period.shortLabel}
                  </Box>
                ))}
              </Box>
            </Box>

            {productivityLoading || loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={32} sx={{ color: "#10b981" }} />
              </Box>
            ) : (
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productivityData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={
                        isDarkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)"
                      }
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: isDarkMode ? "#94a3b8" : "#6b7280",
                        fontSize: 11,
                      }}
                      interval={
                        productivityPeriod === "year" ||
                        productivityPeriod === "triennium" ||
                        productivityPeriod === "quinquennium"
                          ? 1
                          : 0
                      }
                      angle={
                        productivityPeriod === "quarter" ||
                        productivityPeriod === "triennium" ||
                        productivityPeriod === "quinquennium"
                          ? -45
                          : 0
                      }
                      textAnchor={
                        productivityPeriod === "quarter" ||
                        productivityPeriod === "triennium" ||
                        productivityPeriod === "quinquennium"
                          ? "end"
                          : "middle"
                      }
                      height={
                        productivityPeriod === "quarter" ||
                        productivityPeriod === "triennium" ||
                        productivityPeriod === "quinquennium"
                          ? 50
                          : 30
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: isDarkMode ? "#94a3b8" : "#6b7280",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                        border: isDarkMode
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        boxShadow: isDarkMode
                          ? "0 10px 25px rgba(0, 0, 0, 0.4)"
                          : "0 10px 25px rgba(0, 0, 0, 0.1)",
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
                          {value === "completed" ? "Concluídas" : "Criadas"}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{
                        fill: "#10b981",
                        strokeWidth: 0,
                        r:
                          productivityPeriod === "triennium" ||
                          productivityPeriod === "year" ||
                          productivityPeriod === "quinquennium"
                            ? 3
                            : 4,
                      }}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{
                        fill: "#6366f1",
                        strokeWidth: 0,
                        r:
                          productivityPeriod === "triennium" ||
                          productivityPeriod === "year" ||
                          productivityPeriod === "quinquennium"
                            ? 3
                            : 4,
                      }}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </IOSWidget>
        );
      }

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
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : sortedTeamWorkload.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {paginatedTeamWorkload.map((member) => {
                  const progress =
                    member.tasks_count > 0
                      ? Math.round(
                          (member.completed_count / member.tasks_count) * 100,
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
                      <MuiTooltip
                        title={`Ver detalhes de ${member.full_name}`}
                        arrow
                      >
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
                          <Typography variant="caption" color="text.secondary">
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
                      sx={{
                        color: "#7c3aed",
                        minWidth: 60,
                        textAlign: "center",
                      }}
                    >
                      {teamWorkloadPage} / {totalTeamWorkloadPages}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setTeamWorkloadPage((prev) =>
                          Math.min(totalTeamWorkloadPages, prev + 1),
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
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
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
                        onClick={() =>
                          stat.value > 0 &&
                          handleStatusClick(stat.key, stat.label, stat.color)
                        }
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: `${stat.color}08`,
                          border: "1px solid",
                          borderColor: `${stat.color}20`,
                          cursor: stat.value > 0 ? "pointer" : "default",
                          transition: "all 0.2s ease",
                          "&:hover":
                            stat.value > 0
                              ? {
                                  transform: "translateY(-2px)",
                                  boxShadow: `0 4px 12px ${stat.color}25`,
                                  borderColor: `${stat.color}40`,
                                  bgcolor: `${stat.color}12`,
                                }
                              : {},
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
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

          const completedPercent = Math.round(
            (taskStats.done / taskStats.total) * 100,
          );

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
          {
            name: "Em Progresso",
            value: taskStats?.in_progress || 0,
            color: "#f59e0b",
          },
          {
            name: "Em Revisão",
            value: taskStats?.review || 0,
            color: "#8b5cf6",
          },
          { name: "Concluído", value: taskStats?.done || 0, color: "#10b981" },
          {
            name: "Bloqueado",
            value: taskStats?.blocked || 0,
            color: "#ef4444",
          },
        ].filter((item) => item.value > 0);

        const insightText = getInsightText();
        const insightColor =
          taskStats?.blocked && taskStats.blocked > 0 ? "#ef4444" : "#6b7280";

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
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : taskStats && taskStats.total > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
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
                          border: isDarkMode
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid rgba(0,0,0,0.08)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          boxShadow: isDarkMode
                            ? "0 4px 12px rgba(0,0,0,0.4)"
                            : "0 4px 12px rgba(0,0,0,0.1)",
                          color: isDarkMode ? "#f1f5f9" : "#1e293b",
                        }}
                        labelStyle={{
                          color: isDarkMode ? "#f1f5f9" : "#1e293b",
                        }}
                        itemStyle={{
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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={500}
                    >
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
                    const percentage = Math.round(
                      (item.value / taskStats.total) * 100,
                    );
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
            <Box
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
                Atividade Recente
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : recentActivities.length > 0 ? (
                <>
                  <Box sx={{ flex: 1 }}>
                    {paginatedActivities.map((item, index) => {
                      const cfg = ACTIVITY_CONFIG[item.type];
                      const isLast = index === paginatedActivities.length - 1;
                      return (
                        <Box
                          key={item.id}
                          sx={{
                            display: "flex",
                            gap: 1.5,
                            position: "relative",
                          }}
                        >
                          {/* Timeline column */}
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              flexShrink: 0,
                              width: 32,
                            }}
                          >
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                bgcolor: cfg.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                zIndex: 1,
                              }}
                            >
                              <cfg.Icon
                                sx={{ fontSize: 16, color: cfg.color }}
                              />
                            </Box>
                            {!isLast && (
                              <Box
                                sx={{
                                  width: "2px",
                                  flex: 1,
                                  minHeight: 12,
                                  bgcolor: "divider",
                                  my: 0.5,
                                }}
                              />
                            )}
                          </Box>

                          {/* Content */}
                          <Box
                            sx={{
                              flex: 1,
                              pb: isLast ? 0 : 2,
                              pt: 0.25,
                              minWidth: 0,
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flex: 1 }}>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ color: cfg.color, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1, flexShrink: 0 }}
                                >
                                  {item.label}
                                </Typography>
                                {item.projectName && (
                                  <>
                                    <Typography variant="caption" sx={{ color: "text.disabled", lineHeight: 1, flexShrink: 0 }}>·</Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "text.disabled", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                    >
                                      {item.projectName}
                                    </Typography>
                                  </>
                                )}
                              </Box>
                              <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, lineHeight: 1 }}>
                                {item.time}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{ mt: 0.4, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {item.name}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
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
