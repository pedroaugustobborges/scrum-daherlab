import { useState, useEffect, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Slide,
  CircularProgress,
  Avatar,
  Chip,
  Pagination,
  useTheme,
  Paper,
} from "@mui/material";
import { Close, FolderOutlined, PersonOutline, Block } from "@mui/icons-material";
import { TransitionProps } from "@mui/material/transitions";
import { supabase } from "@/lib/supabase";

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface TasksByStatusModalProps {
  open: boolean;
  onClose: () => void;
  status: string | null;
  statusLabel: string;
  statusColor: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  project: {
    id: string;
    name: string;
  } | null;
  assignee: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  blocked_reason?: {
    content: string;
    author_name: string;
    created_at: string;
  } | null;
}

const ITEMS_PER_PAGE = 10;

export default function TasksByStatusModal({
  open,
  onClose,
  status,
  statusLabel,
  statusColor,
}: TasksByStatusModalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open && status) {
      setPage(1);
      fetchTasks(1);
    }
  }, [open, status]);

  useEffect(() => {
    if (open && status) {
      fetchTasks(page);
    }
  }, [page]);

  const fetchTasks = async (currentPage: number) => {
    if (!status) return;

    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", status);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch tasks with project and assignee info
      // Try to fetch with blocked_comment_id first, fallback if column doesn't exist
      let tasksData: Array<{
        id: string;
        title: string;
        description: string | null;
        created_at: string;
        project_id: string;
        assigned_to: string | null;
        blocked_comment_id?: string | null;
      }> | null = null;

      // First try with blocked_comment_id (if migration has been applied)
      const { data: tasksWithBlockedId, error: tasksWithBlockedIdError } = await supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          description,
          created_at,
          project_id,
          assigned_to,
          blocked_comment_id
        `,
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .range(from, to);

      // If the column doesn't exist, fetch without it
      if (tasksWithBlockedIdError && tasksWithBlockedIdError.code === "42703") {
        const { data: tasksBasic, error: tasksBasicError } = await supabase
          .from("tasks")
          .select(
            `
            id,
            title,
            description,
            created_at,
            project_id,
            assigned_to
          `,
          )
          .eq("status", status)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (tasksBasicError) throw tasksBasicError;
        tasksData = tasksBasic;
      } else if (tasksWithBlockedIdError) {
        throw tasksWithBlockedIdError;
      } else {
        tasksData = tasksWithBlockedId;
      }

      // Fetch project names
      const projectIds = [
        ...new Set(tasksData?.map((t) => t.project_id).filter(Boolean)),
      ];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds.length > 0 ? projectIds : ["none"]);

      // Fetch assignee profiles
      const assigneeIds = [
        ...new Set(tasksData?.map((t) => t.assigned_to).filter(Boolean)),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", assigneeIds.length > 0 ? assigneeIds : ["none"]);

      // Fetch blocking comments if status is "blocked"
      let blockingComments: Record<string, { content: string; author_name: string; created_at: string }> = {};
      if (status === "blocked") {
        const blockedCommentIds = tasksData
          ?.map((t) => t.blocked_comment_id)
          .filter(Boolean) as string[];

        if (blockedCommentIds && blockedCommentIds.length > 0) {
          const { data: commentsData } = await supabase
            .from("comments")
            .select(`
              id,
              content,
              created_at,
              author:profiles!user_id(full_name)
            `)
            .in("id", blockedCommentIds);

          if (commentsData) {
            commentsData.forEach((comment) => {
              const authorData = comment.author as { full_name: string } | { full_name: string }[] | null;
              const authorName = Array.isArray(authorData)
                ? authorData[0]?.full_name
                : authorData?.full_name;
              blockingComments[comment.id] = {
                content: comment.content,
                author_name: authorName || "Usuário",
                created_at: comment.created_at,
              };
            });
          }
        }
      }

      // Map data
      const mappedTasks: TaskItem[] =
        tasksData?.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          created_at: task.created_at,
          project: projects?.find((p) => p.id === task.project_id) || null,
          assignee: profiles?.find((p) => p.id === task.assigned_to) || null,
          blocked_reason: task.blocked_comment_id
            ? blockingComments[task.blocked_comment_id] || null
            : null,
        })) || [];

      setTasks(mappedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          background: isDarkMode
            ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,251,252,0.95) 100%)",
          border: "1px solid",
          borderColor: isDarkMode
            ? "rgba(255,255,255,0.1)"
            : `${statusColor}30`,
          boxShadow: isDarkMode
            ? "0 25px 50px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)"
            : `0 0 0 1px rgba(0,0,0,0.03), 0 25px 50px ${statusColor}20, 0 8px 24px rgba(0,0,0,0.08)`,
          overflow: "hidden",
          maxHeight: "85vh",
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)`,
          pt: 3,
          pb: 3,
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

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "14px",
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography variant="h5" sx={{ color: "white", fontWeight: 800 }}>
              {totalCount}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {statusLabel}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.8)", mt: 0.25 }}
            >
              {totalCount === 1 ? "tarefa" : "tarefas"} neste status
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: statusColor }} />
          </Box>
        ) : tasks.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              Nenhuma tarefa encontrada
            </Typography>
          </Box>
        ) : (
          <>
            {/* Task List */}
            <Box sx={{ px: 2, py: 2 }}>
              {tasks.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    p: 2,
                    mx: 1,
                    mb: 1.5,
                    borderRadius: "16px",
                    bgcolor: isDarkMode ? "#1e293b" : "white",
                    border: "1px solid",
                    borderColor: isDarkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateX(4px)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      borderColor: `${statusColor}30`,
                    },
                  }}
                >
                  {/* Task Header */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{
                          color: "text.primary",
                          lineHeight: 1.3,
                          mb: 0.5,
                        }}
                      >
                        {task.title}
                      </Typography>
                      {task.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.5,
                          }}
                        >
                          {task.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={formatDate(task.created_at)}
                      size="small"
                      sx={{
                        ml: 2,
                        bgcolor: `${statusColor}10`,
                        color: statusColor,
                        fontWeight: 600,
                        fontSize: "0.7rem",
                        height: 24,
                      }}
                    />
                  </Box>

                  {/* Task Meta */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Project */}
                    {task.project && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "8px",
                          bgcolor: "rgba(99, 102, 241, 0.08)",
                        }}
                      >
                        <FolderOutlined
                          sx={{ fontSize: 16, color: "#6366f1" }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ color: "#6366f1" }}
                        >
                          {task.project.name}
                        </Typography>
                      </Box>
                    )}

                    {/* Assignee */}
                    {task.assignee ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "8px",
                          bgcolor: "rgba(124, 58, 237, 0.08)",
                        }}
                      >
                        <Avatar
                          src={task.assignee.avatar_url || undefined}
                          sx={{
                            width: 20,
                            height: 20,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            bgcolor: "#7c3aed",
                          }}
                        >
                          {getInitials(task.assignee.full_name)}
                        </Avatar>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ color: "#7c3aed" }}
                        >
                          {task.assignee.full_name}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "8px",
                          bgcolor: "rgba(107, 114, 128, 0.08)",
                        }}
                      >
                        <PersonOutline
                          sx={{ fontSize: 16, color: "#6b7280" }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ color: "#6b7280" }}
                        >
                          Não atribuído
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Blocking Reason (for blocked tasks) */}
                  {task.blocked_reason && (
                    <Paper
                      elevation={0}
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                        }}
                      >
                        <Block
                          sx={{
                            fontSize: 18,
                            color: "#ef4444",
                            mt: 0.25,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{ color: "#ef4444" }}
                            >
                              Motivo do Bloqueio
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.disabled"
                            >
                              por {task.blocked_reason.author_name}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {task.blocked_reason.content.replace(
                              /^🚫 \*\*Motivo do Bloqueio:\*\* /,
                              ""
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  )}
                </Box>
              ))}
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 2,
                  px: 3,
                  borderTop: "1px solid",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                  bgcolor: isDarkMode
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(0,0,0,0.02)",
                }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  size="medium"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": {
                      fontWeight: 600,
                      "&.Mui-selected": {
                        bgcolor: statusColor,
                        color: "white",
                        "&:hover": {
                          bgcolor: statusColor,
                        },
                      },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
