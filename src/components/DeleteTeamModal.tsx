import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Slide,
  IconButton,
  useTheme,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import {
  Warning,
  Close,
  DeleteForever,
  FolderOpen,
  Assignment,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import React from "react";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Team {
  id: string;
  name: string;
}

interface DeleteTeamModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  team: Team | null;
}

interface LinkedData {
  projects: number;
  tasks: number;
  loading: boolean;
  error: string | null;
}

export default function DeleteTeamModal({
  open,
  onClose,
  onConfirm,
  team,
}: DeleteTeamModalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [linked, setLinked] = useState<LinkedData>({
    projects: 0,
    tasks: 0,
    loading: true,
    error: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && team?.id) {
      checkLinkedData();
    }
  }, [open, team?.id]);

  const checkLinkedData = async () => {
    if (!team?.id) return;
    setLinked({ projects: 0, tasks: 0, loading: true, error: null });

    try {
      // Fetch sprint IDs and project_ids linked to this team in one query
      const { data: sprints, error: sprintsError } = await supabase
        .from("sprints")
        .select("id, project_id")
        .eq("team_id", team.id);

      if (sprintsError) throw sprintsError;

      const sprintIds = (sprints ?? []).map((s) => s.id);
      const projectCount = new Set(
        (sprints ?? []).map((s) => s.project_id).filter(Boolean),
      ).size;

      let taskCount = 0;
      if (sprintIds.length > 0) {
        const { count, error: taskError } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("sprint_id", sprintIds);

        if (taskError) throw taskError;
        taskCount = count || 0;
      }

      setLinked({ projects: projectCount, tasks: taskCount, loading: false, error: null });
    } catch (error) {
      console.error("Error checking linked data:", error);
      setLinked({
        projects: 0,
        tasks: 0,
        loading: false,
        error: "Erro ao verificar dados associados ao time",
      });
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) onClose();
  };

  const hasLinked = linked.projects > 0 || linked.tasks > 0;
  const canDelete = !linked.loading && !linked.error && !hasLinked;

  // Build the blocking description
  const blockingParts: string[] = [];
  if (linked.projects > 0)
    blockingParts.push(
      `${linked.projects} ${linked.projects === 1 ? "projeto" : "projetos"}`,
    );
  if (linked.tasks > 0)
    blockingParts.push(
      `${linked.tasks} ${linked.tasks === 1 ? "tarefa/história" : "tarefas/histórias"}`,
    );
  const blockingText = blockingParts.join(" e ");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: isDarkMode
            ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
          border: "2px solid rgba(239, 68, 68, 0.2)",
          boxShadow: isDarkMode
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            : "0 25px 50px -12px rgba(239, 68, 68, 0.25)",
          overflow: "visible",
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
          color: "white",
          fontWeight: 800,
          fontSize: "1.5rem",
          letterSpacing: "-0.01em",
          py: 3,
          px: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Warning sx={{ fontSize: 28 }} />
          Excluir Time
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={deleting}
          sx={{
            color: "white",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              transform: "rotate(90deg)",
            },
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, mt: 2 }}>
        {linked.loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
              gap: 2,
            }}
          >
            <CircularProgress size={40} sx={{ color: "#ef4444" }} />
            <Typography color="text.secondary">
              Verificando dados associados...
            </Typography>
          </Box>
        ) : linked.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {linked.error}
          </Alert>
        ) : hasLinked ? (
          <Box>
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              sx={{ mb: 3, "& .MuiAlert-icon": { color: "#dc2626" } }}
            >
              <Typography fontWeight={600}>
                Não é possível excluir este time
              </Typography>
            </Alert>

            {/* Linked counters */}
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              {linked.projects > 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2.5,
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                    borderRadius: 2,
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FolderOpen sx={{ color: "#ef4444", fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700} color="#dc2626">
                      {linked.projects}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {linked.projects === 1 ? "projeto associado" : "projetos associados"}
                    </Typography>
                  </Box>
                </Box>
              )}

              {linked.tasks > 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2.5,
                    bgcolor: "rgba(239, 68, 68, 0.05)",
                    borderRadius: 2,
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Assignment sx={{ color: "#ef4444", fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700} color="#dc2626">
                      {linked.tasks}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {linked.tasks === 1
                        ? "tarefa/história associada"
                        : "tarefas/histórias associadas"}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              O time <strong>"{team?.name}"</strong> possui{" "}
              <strong>{blockingText}</strong> vinculados. Para excluí-lo, remova
              primeiro cada item individualmente.
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                p: 2,
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: 2,
                border: "1px dashed rgba(0, 0, 0, 0.1)",
              }}
            >
              <strong>Dica:</strong> Acesse os projetos vinculados, exclua as
              tarefas e histórias de usuário primeiro, e depois retorne para
              excluir o time.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Alert
              severity="warning"
              icon={<Warning />}
              sx={{ mb: 3, "& .MuiAlert-icon": { color: "#d97706" } }}
            >
              <Typography fontWeight={600}>
                Esta ação não pode ser desfeita!
              </Typography>
            </Alert>

            <Typography variant="body1" sx={{ mb: 2 }}>
              Você está prestes a excluir permanentemente o time:
            </Typography>

            <Box
              sx={{
                p: 3,
                bgcolor: "rgba(239, 68, 68, 0.05)",
                borderRadius: 2,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                {team?.name}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Ao confirmar, todos os dados relacionados a este time serão
              excluídos permanentemente, incluindo:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2, color: "text.secondary" }}>
              <li>
                <Typography variant="body2">Membros do time</Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Associações com projetos
                </Typography>
              </li>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, pt: 0, gap: 2 }}>
        <Button
          onClick={handleClose}
          disabled={deleting}
          variant="outlined"
          sx={{
            px: 4,
            py: 1.5,
            borderWidth: 2,
            borderColor: "rgba(0, 0, 0, 0.2)",
            color: "text.secondary",
            fontWeight: 600,
            "&:hover": {
              borderWidth: 2,
              borderColor: "rgba(0, 0, 0, 0.3)",
              bgcolor: "rgba(0, 0, 0, 0.02)",
            },
          }}
        >
          Cancelar
        </Button>

        {canDelete && (
          <Button
            onClick={handleConfirmDelete}
            disabled={deleting}
            variant="contained"
            startIcon={
              deleting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DeleteForever />
              )
            }
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: "#dc2626",
              fontWeight: 600,
              "&:hover": { bgcolor: "#b91c1c" },
              "&:disabled": { bgcolor: "rgba(220, 38, 38, 0.5)" },
            }}
          >
            {deleting ? "Excluindo..." : "Excluir Time"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
