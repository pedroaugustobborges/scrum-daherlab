import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import ActiveProjectsWidget from "@/components/ActiveProjectsWidget";
import ActiveSprintsWidget from "@/components/ActiveSprintsWidget";
import TeamMetricsWidget from "@/components/TeamMetricsWidget";
import ActionItemsWidget from "@/components/ActionItemsWidget";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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

const ACTIVITIES_PER_PAGE = 4;

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);

  const totalActivitiesPages = Math.ceil(
    recentActivities.length / ACTIVITIES_PER_PAGE,
  );
  const activitiesStartIndex = (activitiesPage - 1) * ACTIVITIES_PER_PAGE;
  const paginatedActivities = recentActivities.slice(
    activitiesStartIndex,
    activitiesStartIndex + ACTIVITIES_PER_PAGE,
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch ALL tasks (same as Planner page)
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("status");

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

      // Fetch recent activities
      // Get recent tasks
      const { data: recentTasks, error: tasksActivityError } = await supabase
        .from("tasks")
        .select("id, title, created_at, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (tasksActivityError) throw tasksActivityError;

      // Get recent sprints
      const { data: recentSprints, error: sprintsActivityError } =
        await supabase
          .from("sprints")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

      if (sprintsActivityError) throw sprintsActivityError;

      // Get recent projects
      const { data: recentProjects, error: projectsActivityError } =
        await supabase
          .from("projects")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

      if (projectsActivityError) throw projectsActivityError;

      // Combine and format activities
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

      // Sort by created_at and take top 20 for pagination
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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            mb: 5,
            p: 4,
            borderRadius: 4,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "white",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background:
                "radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)",
            },
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Typography
              variant="h3"
              fontWeight={800}
              gutterBottom
              sx={{ letterSpacing: "-0.02em" }}
            >
              Bem-vindo(a), {user?.user_metadata?.full_name || "Usuário"}!
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 400 }}>
              Veja o que está acontecendo com seus projetos hoje
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <ActiveProjectsWidget />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActiveSprintsWidget />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TeamMetricsWidget />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActionItemsWidget />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7} lg={5}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: "100%",
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "2px solid",
                borderColor: "rgba(99, 102, 241, 0.1)",
              }}
            >
              <Typography
                variant="h5"
                fontWeight={800}
                gutterBottom
                sx={{ mb: 3 }}
              >
                Visão Geral das Atividades
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : taskStats && taskStats.total > 0 ? (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        Total de Atividades
                      </Typography>
                      <Chip
                        label={`${taskStats.total} tarefas`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2">
                          Tarefas Concluidas
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {taskStats.done} / {taskStats.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={calculateProgress()}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>

                  <Box
                    sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 3 }}
                  >
                    <Box sx={{ flex: 1, minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary">
                        A Fazer
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ color: "#6b7280" }}
                      >
                        {taskStats.todo}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary">
                        Em Progresso
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ color: "#f59e0b" }}
                      >
                        {taskStats.in_progress}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary">
                        Em Revisao
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ color: "#8b5cf6" }}
                      >
                        {taskStats.review}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary">
                        Concluido
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ color: "#10b981" }}
                      >
                        {taskStats.done}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary">
                        Bloqueado
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ color: "#ef4444" }}
                      >
                        {taskStats.blocked}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nenhuma atividade encontrada
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Donut Chart - Activities per Status */}
          <Grid item xs={12} md={5} lg={3}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: "100%",
                minHeight: 380,
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "2px solid",
                borderColor: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h5"
                fontWeight={800}
                gutterBottom
                sx={{ mb: 2 }}
              >
                Distribuição de Tarefas
              </Typography>

              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : taskStats && taskStats.total > 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{ position: "relative", width: "100%", height: 260 }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "A Fazer",
                              value: taskStats.todo,
                              color: "#6b7280",
                            },
                            {
                              name: "Em Progresso",
                              value: taskStats.in_progress,
                              color: "#f59e0b",
                            },
                            {
                              name: "Em Revisao",
                              value: taskStats.review,
                              color: "#8b5cf6",
                            },
                            {
                              name: "Concluido",
                              value: taskStats.done,
                              color: "#10b981",
                            },
                            {
                              name: "Bloqueado",
                              value: taskStats.blocked,
                              color: "#ef4444",
                            },
                          ].filter((item) => item.value > 0)}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {[
                            {
                              name: "A Fazer",
                              value: taskStats.todo,
                              color: "#6b7280",
                            },
                            {
                              name: "Em Progresso",
                              value: taskStats.in_progress,
                              color: "#f59e0b",
                            },
                            {
                              name: "Em Revisao",
                              value: taskStats.review,
                              color: "#8b5cf6",
                            },
                            {
                              name: "Concluido",
                              value: taskStats.done,
                              color: "#10b981",
                            },
                            {
                              name: "Bloqueado",
                              value: taskStats.blocked,
                              color: "#ef4444",
                            },
                          ]
                            .filter((item) => item.value > 0)
                            .map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                style={{
                                  filter:
                                    "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
                                }}
                              />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "2px solid rgba(99, 102, 241, 0.2)",
                            borderRadius: 12,
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            padding: "12px 16px",
                          }}
                          formatter={(value, name) => [
                            `${value} tarefas`,
                            name,
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          iconSize={10}
                          formatter={(value) => (
                            <span
                              style={{
                                color: "#4b5563",
                                fontSize: "13px",
                                fontWeight: 500,
                              }}
                            >
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center text overlay */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: "45%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <Typography
                        variant="h4"
                        fontWeight={800}
                        color="primary.main"
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
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma tarefa no sprint atual
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={7} lg={4}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: "100%",
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "2px solid",
                borderColor: "rgba(99, 102, 241, 0.1)",
              }}
            >
              <Typography
                variant="h5"
                fontWeight={800}
                gutterBottom
                sx={{ mb: 3 }}
              >
                Atividade Recente
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : recentActivities.length > 0 ? (
                <>
                  <Box
                    sx={{
                      mt: 3,
                      maxHeight: 280,
                      overflowY: "auto",
                      pr: 1,
                      "&::-webkit-scrollbar": {
                        width: 6,
                      },
                      "&::-webkit-scrollbar-track": {
                        backgroundColor: "rgba(99, 102, 241, 0.05)",
                        borderRadius: 3,
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "rgba(99, 102, 241, 0.2)",
                        borderRadius: 3,
                        "&:hover": {
                          backgroundColor: "rgba(99, 102, 241, 0.4)",
                        },
                      },
                    }}
                  >
                    {paginatedActivities.map((item, index) => (
                      <Box
                        key={item.id}
                        sx={{
                          pb: 2,
                          mb: 2,
                          borderBottom:
                            index < paginatedActivities.length - 1
                              ? "1px solid"
                              : "none",
                          borderColor: "divider",
                          transition: "all 0.2s ease",
                          borderRadius: 1,
                          p: 1.5,
                          mx: -1.5,
                          "&:hover": {
                            bgcolor: "rgba(99, 102, 241, 0.04)",
                          },
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {item.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.task}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
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
                        gap: 1.5,
                        mt: 2,
                        pt: 2,
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
                        sx={{
                          color: "#6366f1",
                          "&:disabled": { color: "rgba(99, 102, 241, 0.3)" },
                          "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" },
                        }}
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
                        sx={{
                          color: "#6366f1",
                          "&:disabled": { color: "rgba(99, 102, 241, 0.3)" },
                          "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" },
                        }}
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
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
