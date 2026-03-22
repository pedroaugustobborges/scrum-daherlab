import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Avatar,
  IconButton,
  Slide,
  CircularProgress,
  Grid,
  LinearProgress,
  Chip,
  useTheme,
} from "@mui/material";
import {
  Close,
  Groups,
  FolderCopy,
  Speed,
  Assignment,
  CheckCircle,
  PlayCircle,
  RateReview,
  Block,
  PendingActions,
} from "@mui/icons-material";
import { TransitionProps } from "@mui/material/transitions";
import { forwardRef } from "react";
import { supabase } from "@/lib/supabase";

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface TeamMemberDetailModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string | null;
  memberName: string;
  memberAvatar?: string;
}

interface MemberStats {
  teamsCount: number;
  projectsCount: number;
  velocity: number;
  totalTasks: number;
  tasksByStatus: {
    todo: number;
    "in-progress": number;
    review: number;
    done: number;
    blocked: number;
  };
}

export default function TeamMemberDetailModal({
  open,
  onClose,
  memberId,
  memberName,
  memberAvatar,
}: TeamMemberDetailModalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats | null>(null);

  useEffect(() => {
    if (open && memberId) {
      fetchMemberStats();
    }
  }, [open, memberId]);

  const fetchMemberStats = async () => {
    if (!memberId) return;

    setLoading(true);
    try {
      // Fetch teams count
      const { data: teamMemberships, error: teamsError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", memberId);

      if (teamsError) throw teamsError;

      // Fetch all tasks assigned to this member
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, status, story_points, project_id, sprint_id")
        .eq("assigned_to", memberId);

      if (tasksError) throw tasksError;

      // Calculate unique projects
      const uniqueProjects = new Set(
        tasks?.map((t) => t.project_id).filter(Boolean),
      );

      // Calculate velocity (average story points completed per sprint)
      const completedTasks = tasks?.filter((t) => t.status === "done") || [];
      const totalStoryPoints = completedTasks.reduce(
        (sum, t) => sum + (t.story_points || 0),
        0,
      );
      const uniqueSprints = new Set(
        completedTasks.map((t) => t.sprint_id).filter(Boolean),
      );
      const velocity =
        uniqueSprints.size > 0
          ? Math.round(totalStoryPoints / uniqueSprints.size)
          : totalStoryPoints;

      // Calculate tasks by status
      const tasksByStatus = {
        todo: tasks?.filter((t) => t.status === "todo").length || 0,
        "in-progress":
          tasks?.filter((t) => t.status === "in-progress").length || 0,
        review: tasks?.filter((t) => t.status === "review").length || 0,
        done: tasks?.filter((t) => t.status === "done").length || 0,
        blocked: tasks?.filter((t) => t.status === "blocked").length || 0,
      };

      setStats({
        teamsCount: teamMemberships?.length || 0,
        projectsCount: uniqueProjects.size,
        velocity,
        totalTasks: tasks?.length || 0,
        tasksByStatus,
      });
    } catch (error) {
      console.error("Error fetching member stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const completionRate = stats
    ? stats.totalTasks > 0
      ? Math.round((stats.tasksByStatus.done / stats.totalTasks) * 100)
      : 0
    : 0;

  const statusItems = [
    {
      key: "todo",
      label: "A Fazer",
      color: "#6b7280",
      icon: <PendingActions sx={{ fontSize: 18 }} />,
    },
    {
      key: "in-progress",
      label: "Em Progresso",
      color: "#f59e0b",
      icon: <PlayCircle sx={{ fontSize: 18 }} />,
    },
    {
      key: "review",
      label: "Em Revisão",
      color: "#8b5cf6",
      icon: <RateReview sx={{ fontSize: 18 }} />,
    },
    {
      key: "done",
      label: "Concluído",
      color: "#10b981",
      icon: <CheckCircle sx={{ fontSize: 18 }} />,
    },
    {
      key: "blocked",
      label: "Bloqueado",
      color: "#ef4444",
      icon: <Block sx={{ fontSize: 18 }} />,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,251,252,0.95) 100%)",
          border: "1px solid rgba(124, 58, 237, 0.15)",
          boxShadow: `
            0 0 0 1px rgba(0,0,0,0.03),
            0 25px 50px rgba(124, 58, 237, 0.15),
            0 8px 24px rgba(0,0,0,0.08)
          `,
          overflow: "hidden",
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
        },
      }}
    >
      {/* Header with gradient */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)",
          pt: 4,
          pb: 6,
          px: 3,
          position: "relative",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "white",
            bgcolor: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.25)",
              transform: "rotate(90deg)",
            },
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Close />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          <Avatar
            src={memberAvatar}
            sx={{
              width: 72,
              height: 72,
              bgcolor: "rgba(255,255,255,0.2)",
              border: "3px solid rgba(255,255,255,0.4)",
              fontSize: "1.5rem",
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            {getInitials(memberName)}
          </Avatar>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {memberName}
            </Typography>
            <Chip
              label={`${completionRate}% concluído`}
              size="small"
              sx={{
                mt: 1,
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 600,
                backdropFilter: "blur(10px)",
                "& .MuiChip-label": { px: 1.5 },
              }}
            />
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Stats Cards - Pulled up over header */}
        <Box sx={{ px: 3, mt: 3 }}>
          <Grid container spacing={1.5}>
            {[
              {
                icon: <Groups />,
                label: "Times",
                value: stats?.teamsCount ?? "-",
                color: "#6366f1",
              },
              {
                icon: <FolderCopy />,
                label: "Projetos",
                value: stats?.projectsCount ?? "-",
                color: "#0891b2",
              },
              {
                icon: <Speed />,
                label: "Velocidade",
                value: stats?.velocity ?? "-",
                suffix: "pts",
                color: "#059669",
              },
              {
                icon: <Assignment />,
                label: "Tarefas",
                value: stats?.totalTasks ?? "-",
                color: "#7c3aed",
              },
            ].map((stat) => (
              <Grid item xs={6} sm={3} key={stat.label}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "16px",
                    bgcolor: isDarkMode ? "#1e293b" : "white",
                    border: "1px solid",
                    borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: `${stat.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 1,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: stat.color }} />
                  ) : (
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{ color: stat.color, lineHeight: 1 }}
                    >
                      {stat.value}
                      {stat.suffix && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ ml: 0.5, fontWeight: 600 }}
                        >
                          {stat.suffix}
                        </Typography>
                      )}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Tasks by Status */}
        <Box sx={{ px: 3, pt: 3, pb: 4 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Atividades por Status
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} sx={{ color: "#7c3aed" }} />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {statusItems.map((item) => {
                const count =
                  stats?.tasksByStatus[
                    item.key as keyof typeof stats.tasksByStatus
                  ] || 0;
                const percentage = stats?.totalTasks
                  ? Math.round((count / stats.totalTasks) * 100)
                  : 0;

                return (
                  <Box
                    key={item.key}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                      borderRadius: "12px",
                      bgcolor: `${item.color}08`,
                      border: "1px solid",
                      borderColor: `${item.color}15`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: `${item.color}12`,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        bgcolor: `${item.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {item.label}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: item.color }}
                        >
                          {count}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: `${item.color}15`,
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor: item.color,
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        color: item.color,
                        minWidth: 36,
                        textAlign: "right",
                      }}
                    >
                      {percentage}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
