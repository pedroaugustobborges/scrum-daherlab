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
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import {
  Warning,
  Close,
  DeleteForever,
  Assignment,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import React from "react";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Project {
  id: string;
  name: string;
}

interface DeleteProjectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  project: Project | null;
}

interface TaskCount {
  tasks: number;
  loading: boolean;
  error: string | null;
}

export default function DeleteProjectModal({
  open,
  onClose,
  onConfirm,
  project,
}: DeleteProjectModalProps) {
  const [taskCount, setTaskCount] = useState<TaskCount>({
    tasks: 0,
    loading: true,
    error: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && project?.id) {
      checkProjectTasks();
    }
  }, [open, project?.id]);

  const checkProjectTasks = async () => {
    if (!project?.id) return;

    setTaskCount({ tasks: 0, loading: true, error: null });

    try {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id);

      if (error) throw error;

      setTaskCount({
        tasks: count || 0,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error checking project tasks:", error);
      setTaskCount({
        tasks: 0,
        loading: false,
        error: "Erro ao verificar tarefas do projeto",
      });
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      // onConfirm will handle navigation and closing the modal on success
    } catch (error) {
      // Error is already handled in onConfirm with toast
      // Just reset the deleting state so user can try again
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onClose();
    }
  };

  const hasTasks = taskCount.tasks > 0;
  const canDelete = !taskCount.loading && !taskCount.error && !hasTasks;

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
          background: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
          border: "2px solid rgba(239, 68, 68, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.25)",
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
          Excluir Projeto
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
        {taskCount.loading ? (
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
              Verificando tarefas associadas...
            </Typography>
          </Box>
        ) : taskCount.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {taskCount.error}
          </Alert>
        ) : hasTasks ? (
          <Box>
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              sx={{
                mb: 3,
                "& .MuiAlert-icon": {
                  color: "#dc2626",
                },
              }}
            >
              <Typography fontWeight={600}>
                Não é possível excluir este projeto
              </Typography>
            </Alert>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 3,
                bgcolor: "rgba(239, 68, 68, 0.05)",
                borderRadius: 2,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Assignment sx={{ color: "#ef4444", fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="#dc2626">
                  {taskCount.tasks}
                </Typography>
                <Typography color="text.secondary" fontWeight={500}>
                  {taskCount.tasks === 1
                    ? "tarefa associada"
                    : "tarefas associadas"}
                </Typography>
              </Box>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              O projeto <strong>"{project?.name}"</strong> possui tarefas ou
              histórias do usuário associadas. Para excluir o projeto, você deve
              primeiro remover todas as tarefas.
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
              <strong>Dica:</strong> Acesse o projeto e exclua as tarefas
              individualmente, ou utilize a visualização de backlog para
              gerenciar as histórias de usuário.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Alert
              severity="warning"
              icon={<Warning />}
              sx={{
                mb: 3,
                "& .MuiAlert-icon": {
                  color: "#d97706",
                },
              }}
            >
              <Typography fontWeight={600}>
                Esta ação não pode ser desfeita!
              </Typography>
            </Alert>

            <Typography variant="body1" sx={{ mb: 2 }}>
              Você está prestes a excluir permanentemente o projeto:
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
                {project?.name}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Ao confirmar, todos os dados relacionados a este projeto serão
              excluídos permanentemente, incluindo:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2, color: "text.secondary" }}>
              <li>
                <Typography variant="body2">Sprints</Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Configurações do projeto
                </Typography>
              </li>
              <li>
                <Typography variant="body2">Associações com times</Typography>
              </li>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 4,
          pb: 4,
          pt: 0,
          gap: 2,
        }}
      >
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
              "&:hover": {
                bgcolor: "#b91c1c",
              },
              "&:disabled": {
                bgcolor: "rgba(220, 38, 38, 0.5)",
              },
            }}
          >
            {deleting ? "Excluindo..." : "Excluir Projeto"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
