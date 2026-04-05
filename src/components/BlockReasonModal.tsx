import { useState, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Slide,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Close, Block, Send } from "@mui/icons-material";
import { TransitionProps } from "@mui/material/transitions";

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface BlockReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  storyTitle?: string;
}

export default function BlockReasonModal({
  open,
  onClose,
  onConfirm,
  storyTitle,
}: BlockReasonModalProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (error) {
      console.error("Error blocking story:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: isDarkMode
            ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,251,252,0.95) 100%)",
          border: "1px solid",
          borderColor: isDarkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(239, 68, 68, 0.3)",
          boxShadow: isDarkMode
            ? "0 25px 50px rgba(0,0,0,0.5)"
            : "0 25px 50px rgba(239, 68, 68, 0.15)",
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
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          pt: 3,
          pb: 3,
          px: 3,
          position: "relative",
        }}
      >
        <IconButton
          onClick={handleClose}
          disabled={submitting}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "white",
            bgcolor: "rgba(255,255,255,0.15)",
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
            <Block sx={{ color: "white", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Bloquear História
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.8)", mt: 0.25 }}
            >
              Informe o motivo do bloqueio
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {storyTitle && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              História a ser bloqueada:
            </Typography>
            <Typography variant="subtitle2" fontWeight={600}>
              {storyTitle}
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Para bloquear esta história, é necessário informar o motivo. Este
          comentário será registrado e ficará visível para o time.
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo do bloqueio..."
          autoFocus
          disabled={submitting}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&.Mui-focused": {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#ef4444",
                },
              },
            },
          }}
        />

        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
            mt: 3,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={submitting}
            sx={{
              borderRadius: 2,
              px: 3,
              borderColor: "rgba(0,0,0,0.2)",
              color: "text.secondary",
              "&:hover": {
                borderColor: "rgba(0,0,0,0.3)",
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            startIcon={
              submitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Send />
              )
            }
            sx={{
              borderRadius: 2,
              px: 3,
              bgcolor: "#ef4444",
              "&:hover": {
                bgcolor: "#dc2626",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(239, 68, 68, 0.3)",
              },
            }}
          >
            {submitting ? "Bloqueando..." : "Confirmar Bloqueio"}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
