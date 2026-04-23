import { Box, IconButton, Tooltip, Divider, Typography } from "@mui/material";
import {
  NearMe as SelectIcon,
  TextFields as TextIcon,
  CropSquare as RectIcon,
  RadioButtonUnchecked as CircleIcon,
  Diamond as DiamondIcon,
  DeleteSweep as ClearIcon,
  RestartAlt as ResetIcon,
  FileDownload as ExportIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import type { ToolType } from "./types";
import { PRESET_COLORS } from "./types";

interface Tool {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  hint: string;
}

const TOOLS: Tool[] = [
  {
    id: "select",
    icon: <SelectIcon />,
    label: "Selecionar",
    hint: "Mover e selecionar itens (S)",
  },
  {
    id: "text",
    icon: <TextIcon />,
    label: "Texto",
    hint: "Clique na área de desenho para adicionar texto (T)",
  },
  {
    id: "rect",
    icon: <RectIcon />,
    label: "Retângulo",
    hint: "Arraste na área de desenho para desenhar (R)",
  },
  {
    id: "circle",
    icon: <CircleIcon />,
    label: "Círculo",
    hint: "Arraste na área de desenho para desenhar (C)",
  },
  {
    id: "diamond",
    icon: <DiamondIcon />,
    label: "Losango",
    hint: "Arraste na área de desenho para desenhar (D)",
  },
];

interface Props {
  activeTool: ToolType;
  activeColor: string;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onClearAll: () => void;
  onReset: () => void;
  onExport: () => void;
}

export default function TimelineToolbar({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange,
  onClearAll,
  onReset,
  onExport,
}: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(99,102,241,0.12)",
        flexShrink: 0,
        flexWrap: "wrap",
        rowGap: 0.5,
      }}
    >
      {/* Tool group */}
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: "#9ca3af", mr: 0.5, letterSpacing: 0.5 }}
      >
        FERRAMENTAS
      </Typography>

      <Box sx={{ display: "flex", gap: 0.5 }}>
        {TOOLS.map((tool) => (
          <Tooltip
            key={tool.id}
            title={`${tool.label} — ${tool.hint}`}
            arrow
            placement="bottom"
          >
            <IconButton
              size="small"
              onClick={() => onToolChange(tool.id)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background:
                  activeTool === tool.id
                    ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                    : "transparent",
                color: activeTool === tool.id ? "white" : "#6b7280",
                border:
                  activeTool === tool.id ? "none" : "1.5px solid transparent",
                "&:hover": {
                  background:
                    activeTool === tool.id
                      ? "linear-gradient(135deg, #4f52e0 0%, #7c4fef 100%)"
                      : "rgba(99,102,241,0.08)",
                  color: activeTool === tool.id ? "white" : "#6366f1",
                  borderColor: "rgba(99,102,241,0.2)",
                },
                transition: "all 0.15s ease",
              }}
            >
              {tool.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

      {/* Color palette */}
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: "#9ca3af", mr: 0.5, letterSpacing: 0.5 }}
      >
        COR
      </Typography>
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        {PRESET_COLORS.map((color) => (
          <Tooltip key={color} title={color} arrow placement="bottom">
            <Box
              component="button"
              onClick={() => onColorChange(color)}
              sx={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: color,
                border:
                  activeColor === color
                    ? "3px solid white"
                    : "2px solid transparent",
                outline: activeColor === color ? `2px solid ${color}` : "none",
                cursor: "pointer",
                transition: "transform 0.12s, outline 0.12s",
                "&:hover": { transform: "scale(1.2)" },
              }}
            />
          </Tooltip>
        ))}
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

      {/* Actions */}
      <Tooltip title="Exportar como PNG" arrow placement="bottom">
        <IconButton
          size="small"
          onClick={onExport}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            color: "#6366f1",
            "&:hover": { background: "rgba(99,102,241,0.08)" },
          }}
        >
          <ExportIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Limpar todo a área de desenho" arrow placement="bottom">
        <IconButton
          size="small"
          onClick={onClearAll}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            color: "#ef4444",
            "&:hover": { background: "rgba(239,68,68,0.08)" },
          }}
        >
          <ClearIcon />
        </IconButton>
      </Tooltip>

      <Tooltip
        title="Restaurar área de desenho — recoloca todas as tarefas na ordem original"
        arrow
        placement="bottom"
      >
        <IconButton
          size="small"
          onClick={onReset}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            color: "#f59e0b",
            "&:hover": { background: "rgba(245,158,11,0.08)" },
          }}
        >
          <ResetIcon />
        </IconButton>
      </Tooltip>

      <Box sx={{ flex: 1 }} />

      {/* Hint */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color: "#9ca3af",
        }}
      >
        <InfoIcon sx={{ fontSize: 14 }} />
        <Typography
          variant="caption"
          sx={{ display: { xs: "none", md: "block" } }}
        >
          Adicione tarefas pelo painel esquerdo · Arraste para mover · Delete
          para remover
        </Typography>
      </Box>
    </Box>
  );
}
