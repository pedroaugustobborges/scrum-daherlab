import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  Collapse,
  IconButton,
  alpha,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  TipsAndUpdates,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Warning,
} from "@mui/icons-material";
import AdaModal from "./AdaModal";

interface RetrospectiveItem {
  id: string;
  category: "went_well" | "to_improve" | "action_item";
  content: string;
  votes: number;
  status: string;
  assigned_to_profile?: { full_name: string };
}

interface AdaSprintAssistantProps {
  loading?: boolean;
  hasData: boolean;
  sprintName: string;
  moodRating: number;
  actionItems: RetrospectiveItem[];
  improvementPoints: RetrospectiveItem[];
  pendingActions: RetrospectiveItem[];
  sprintCount?: number;
  isLoadingCount?: boolean;
}

/**
 * Generates a contextual message from Ada based on retrospective data.
 * The message is professional, modern, supportive, and contextual.
 */
function generateAdaMessage(
  hasData: boolean,
  sprintName: string,
  moodRating: number,
  improvementPoints: RetrospectiveItem[],
  pendingActions: RetrospectiveItem[],
): string {
  const parts: string[] = [];

  if (!hasData) {
    parts.push(
      `Este parece ser um novo começo para o time. Estabelecer rituais de retrospectiva ajudará a construir uma cultura de melhoria contínua.`,
    );
  } else {
    const topImprovements = improvementPoints.slice(0, 3);
    const topPendingActions = pendingActions.slice(0, 2);

    // Opening based on mood
    if (moodRating >= 4) {
      parts.push(
        `O time encerrou a ${sprintName} com energia positiva. Ótimo sinal para manter o ritmo neste novo ciclo.`,
      );
    } else if (moodRating === 3) {
      parts.push(
        `Analisando a ${sprintName}, identifiquei oportunidades de evolução que podem elevar a performance do time.`,
      );
    } else if (moodRating > 0) {
      parts.push(
        `A ${sprintName} trouxe alguns desafios. Este novo sprint é uma oportunidade de aplicar os aprendizados.`,
      );
    } else {
      parts.push(
        `Analisando os dados da ${sprintName}, encontrei insights relevantes.`,
      );
    }

    // Key improvements identified
    if (topImprovements.length > 0) {
      const improvementTexts = topImprovements.map((item) => item.content);
      if (improvementTexts.length === 1) {
        parts.push(
          `O time identificou como ponto de melhoria: "${improvementTexts[0]}".`,
        );
      } else {
        parts.push(
          `Os principais pontos de melhoria identificados foram: ${improvementTexts
            .slice(0, 2)
            .map((t) => `"${t}"`)
            .join(" e ")}.`,
        );
      }
    }

    // Pending actions reminder
    if (topPendingActions.length > 0) {
      const actionTexts = topPendingActions.map((item) => {
        if (item.assigned_to_profile?.full_name) {
          return `"${item.content}" (${item.assigned_to_profile.full_name})`;
        }
        return `"${item.content}"`;
      });
      parts.push(
        `${topPendingActions.length > 1 ? "Existem ações" : "Há uma ação"} pendente${topPendingActions.length > 1 ? "s" : ""} da retrospectiva anterior: ${actionTexts.join(", ")}.`,
      );
    }
  }

  return parts.join(" ");
}

/**
 * Generates the sprint counting message from Ada
 */
function generateSprintCountingMessage(sprintCount?: number): string {
  if (sprintCount === undefined) return "";

  if (sprintCount === 0) {
    return `Essa será a Sprint de Kick Off do projeto, o primeiro passo da jornada. Estou contando com você, por isso mesmo pode contar comigo 😉`;
  }

  return `Essa será a Sprint ${sprintCount + 1}, estou contando para você, por isso mesmo pode contar comigo 😉`;
}

export default function AdaSprintAssistant({
  loading = false,
  hasData,
  sprintName,
  moodRating,
  actionItems,
  improvementPoints,
  pendingActions,
  sprintCount,
  isLoadingCount = false,
}: AdaSprintAssistantProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(true);
  const [adaModalOpen, setAdaModalOpen] = useState(false);

  const adaMessage = useMemo(() => {
    if (loading) return "";
    return generateAdaMessage(
      hasData,
      sprintName,
      moodRating,
      improvementPoints,
      pendingActions,
    );
  }, [loading, hasData, sprintName, moodRating, improvementPoints, pendingActions]);

  const sprintCountingMessage = useMemo(() => {
    if (loading || isLoadingCount) return "";
    return generateSprintCountingMessage(sprintCount);
  }, [loading, isLoadingCount, sprintCount]);

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha("#8b5cf6", 0.05)} 0%, ${alpha("#6366f1", 0.05)} 100%)`,
          border: `2px solid ${alpha("#8b5cf6", 0.15)}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Skeleton
            variant="circular"
            width={44}
            height={44}
            sx={{
              border: "2px solid",
              borderColor: "rgba(139, 92, 246, 0.2)",
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={80} />
            <Skeleton variant="text" width={180} />
          </Box>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: isDarkMode ? alpha("#1e293b", 0.5) : alpha("#fff", 0.5),
          }}
        >
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="70%" />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${alpha("#8b5cf6", 0.05)} 0%, ${alpha("#6366f1", 0.05)} 100%)`,
        border: `2px solid ${alpha("#8b5cf6", 0.15)}`,
        transition: "all 0.3s ease",
        "&:hover": {
          borderColor: alpha("#8b5cf6", 0.25),
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {/* Ada Avatar - Clickable to open AdaModal */}
        <Tooltip title="Conheça a Ada">
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setAdaModalOpen(true);
            }}
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
              border: "2px solid",
              borderColor: "rgba(139, 92, 246, 0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: "0 6px 16px rgba(139, 92, 246, 0.4)",
                borderColor: "rgba(139, 92, 246, 0.5)",
              },
            }}
          >
            <img
              src="/ADA.png"
              alt="Ada"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>
        </Tooltip>

        <Box
          sx={{ flex: 1, cursor: "pointer", userSelect: "none" }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Ada
            </Typography>
            <Chip
              label="Assistente"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.65rem",
                bgcolor: alpha("#8b5cf6", 0.1),
                color: "#8b5cf6",
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Insights da última retrospectiva
          </Typography>
        </Box>

        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {/* Message Content */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: isDarkMode ? alpha("#1e293b", 0.8) : "white",
              border: `1px solid ${alpha("#8b5cf6", 0.1)}`,
            }}
          >
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TipsAndUpdates
                sx={{
                  color: "#8b5cf6",
                  fontSize: 20,
                  mt: 0.25,
                  flexShrink: 0,
                }}
              />
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary",
                    lineHeight: 1.7,
                    fontStyle: "normal",
                  }}
                >
                  {adaMessage}
                </Typography>
                {sprintCountingMessage && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.primary",
                      lineHeight: 1.7,
                      fontStyle: "normal",
                      mt: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    {sprintCountingMessage}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Quick Stats */}
          {hasData &&
            (pendingActions.length > 0 ||
              improvementPoints.length > 0 ||
              actionItems.length > 0) && (
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                {pendingActions.length > 0 && (
                  <Chip
                    icon={<Warning sx={{ fontSize: 14 }} />}
                    label={`${pendingActions.length} ${pendingActions.length === 1 ? "ação pendente" : "ações pendentes"}`}
                    size="small"
                    sx={{
                      bgcolor: alpha("#f59e0b", 0.1),
                      color: "#f59e0b",
                      fontWeight: 600,
                      "& .MuiChip-icon": { color: "#f59e0b" },
                    }}
                  />
                )}
                {improvementPoints.length > 0 && (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                    label={`${improvementPoints.length} ${improvementPoints.length === 1 ? "ponto de melhoria" : "pontos de melhoria"}`}
                    size="small"
                    sx={{
                      bgcolor: alpha("#6366f1", 0.1),
                      color: "#6366f1",
                      fontWeight: 600,
                      "& .MuiChip-icon": { color: "#6366f1" },
                    }}
                  />
                )}
                {actionItems.length > pendingActions.length && (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                    label={`${actionItems.length - pendingActions.length} ${actionItems.length - pendingActions.length === 1 ? "ação concluída" : "ações concluídas"}`}
                    size="small"
                    sx={{
                      bgcolor: alpha("#10b981", 0.1),
                      color: "#10b981",
                      fontWeight: 600,
                      "& .MuiChip-icon": { color: "#10b981" },
                    }}
                  />
                )}
              </Box>
            )}
        </Box>
      </Collapse>

      {/* Ada Modal */}
      <AdaModal open={adaModalOpen} onClose={() => setAdaModalOpen(false)} />
    </Paper>
  );
}
