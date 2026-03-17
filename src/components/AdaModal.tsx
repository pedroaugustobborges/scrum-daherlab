import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Slide,
  Chip,
  Divider,
  alpha,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import {
  Close,
  AutoAwesome,
  TipsAndUpdates,
  Psychology,
  Timeline,
  EmojiObjects,
} from "@mui/icons-material";
import React, { useRef } from "react";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface AdaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AdaModal({ open, onClose }: AdaModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = () => {
    if (videoRef.current) {
      // Pauses for 2000 milliseconds (2 seconds) before restarting
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(console.error);
        }
      }, 2000);
    }
  };

  const adaFeatures = [
    {
      icon: <TipsAndUpdates />,
      title: "Dicas Inteligentes",
      description:
        "Analisa o contexto do seu sprint e oferece sugestões personalizadas para melhorar a produtividade da equipe.",
    },
    {
      icon: <Psychology />,
      title: "Análise de Padrões",
      description:
        "Identifica padrões no seu fluxo de trabalho e sugere otimizações baseadas nas melhores práticas ágeis.",
    },
    {
      icon: <Timeline />,
      title: "Insights de Progresso",
      description:
        "Acompanha o progresso das tarefas e fornece insights sobre o andamento do sprint em tempo real.",
    },
    {
      icon: <EmojiObjects />,
      title: "Recomendações Proativas",
      description:
        "Antecipa possíveis obstáculos e sugere ações preventivas para manter o projeto no caminho certo.",
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
          borderRadius: 4,
          background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
          border: "2px solid rgba(139, 92, 246, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(139, 92, 246, 0.25)",
          overflow: "hidden",
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        },
      }}
    >
      {/* Header with gradient */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #ec4899 100%)",
          pt: 4,
          pb: 6,
          px: 4,
          position: "relative",
          textAlign: "center",
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "white",
            bgcolor: "rgba(255, 255, 255, 0.1)",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.2)",
              transform: "rotate(90deg)",
            },
            transition: "all 0.3s ease",
          }}
        >
          <Close />
        </IconButton>

        {/* Decorative sparkles */}
        <AutoAwesome
          sx={{
            position: "absolute",
            top: 20,
            left: 30,
            color: "rgba(255, 255, 255, 0.3)",
            fontSize: 24,
          }}
        />
        <AutoAwesome
          sx={{
            position: "absolute",
            bottom: 40,
            right: 40,
            color: "rgba(255, 255, 255, 0.2)",
            fontSize: 18,
          }}
        />

        {/* Ada's Avatar */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            overflow: "hidden",
            border: "4px solid rgba(255, 255, 255, 0.9)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            mx: "auto",
            mb: 2,
          }}
        >
          <video
            ref={videoRef}
            src="/ADA.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Box>

        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            color: "white",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            mb: 0.5,
          }}
        >
          Ada
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "rgba(255, 255, 255, 0.9)",
            fontWeight: 500,
          }}
        >
          Sua assistente inteligente de projetos
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Bio Section */}
        <Box sx={{ p: 4, pb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip
              label="Em homenagem a Ada Lovelace"
              size="small"
              sx={{
                bgcolor: alpha("#8b5cf6", 0.1),
                color: "#8b5cf6",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
            <Chip
              label="1815 - 1852"
              size="small"
              variant="outlined"
              sx={{
                borderColor: alpha("#8b5cf6", 0.3),
                color: "text.secondary",
                fontSize: "0.75rem",
              }}
            />
          </Box>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.8, mb: 2 }}
          >
            <strong>Augusta Ada King, Condessa de Lovelace</strong>, foi uma
            matemática e escritora inglesa, reconhecida como a{" "}
            <strong>primeira programadora da história</strong>. Filha do poeta
            Lord Byron, Ada trabalhou com Charles Babbage na Máquina Analítica,
            onde escreveu o que é considerado o primeiro algoritmo destinado a
            ser processado por uma máquina.
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.8 }}
          >
            Ada foi visionária ao perceber que computadores poderiam ir além de
            simples cálculos, antecipando conceitos como inteligência artificial
            e música computacional. Sua contribuição pioneira inspira gerações
            de programadoras e programadores até hoje.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: alpha("#8b5cf6", 0.1) }} />

        {/* Why Ada Section */}
        <Box sx={{ p: 4, pb: 3 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AutoAwesome sx={{ color: "white", fontSize: 18 }} />
            </Box>
            Por que Ada?
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.8 }}
          >
            Escolhemos homenagear Ada Lovelace porque ela representa a essência
            da <strong>inovar é cuidar do futuro</strong>. Assim como Ada viu o
            potencial das máquinas além do óbvio, nossa assistente Ada foi
            pensada para enxergar além dos dados brutos do seu projeto,
            oferecendo insights que ajudam você a tomar melhores decisões e
            alcançar seus objetivos.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: alpha("#8b5cf6", 0.1) }} />

        {/* Features Section */}
        <Box sx={{ p: 4 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              mb: 3,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TipsAndUpdates sx={{ color: "white", fontSize: 18 }} />
            </Box>
            Como Ada pode ajudar você
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {adaFeatures.map((feature, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha("#8b5cf6", 0.03),
                  border: "1px solid",
                  borderColor: alpha("#8b5cf6", 0.1),
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: alpha("#8b5cf6", 0.06),
                    borderColor: alpha("#8b5cf6", 0.2),
                    transform: "translateX(4px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: alpha("#8b5cf6", 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8b5cf6",
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            bgcolor: alpha("#8b5cf6", 0.03),
            borderTop: "1px solid",
            borderColor: alpha("#8b5cf6", 0.1),
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            "A Máquina Analítica não tem pretensões de originar nada. Ela pode
            fazer tudo o que soubermos como ordená-la a executar."
          </Typography>
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 0.5, color: "#8b5cf6", fontWeight: 600 }}
          >
            — Ada Lovelace, 1843
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
