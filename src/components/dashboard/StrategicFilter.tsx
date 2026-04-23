import { useRef, useState, useEffect } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { ExpandMore, Insights } from "@mui/icons-material";
import { useTheme as useMUITheme } from "@mui/material/styles";

export type StrategicValue = "all" | "yes" | "no";

interface StrategicFilterProps {
  value: StrategicValue;
  onChange: (value: StrategicValue) => void;
}

const OPTIONS: { value: StrategicValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
];

export default function StrategicFilter({
  value,
  onChange,
}: StrategicFilterProps) {
  const muiTheme = useMUITheme();
  const isDark = muiTheme.palette.mode === "dark";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = value !== "all";
  const label = OPTIONS.find((o) => o.value === value)?.label ?? "Todos";

  const pillBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const pillBgHover = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  const pillBgOpen = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  const dropdownBg = isDark ? "#1e293b" : "#ffffff";
  const dropdownBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const itemHoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const activeColor = "#6366f1";

  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      {/* Trigger pill */}
      <Box
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.75,
          borderRadius: 99,
          cursor: "pointer",
          userSelect: "none",
          bgcolor: open ? pillBgOpen : pillBg,
          border: "1px solid",
          borderColor: open
            ? isDark
              ? "rgba(255,255,255,0.14)"
              : "rgba(0,0,0,0.12)"
            : "transparent",
          transition: "all 0.18s ease",
          "&:hover": {
            bgcolor: pillBgHover,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
          },
        }}
      >
        <Insights
          sx={{
            fontSize: 15,
            color: isActive ? activeColor : "text.disabled",
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: isActive ? 600 : 500,
            color: isActive ? activeColor : "text.secondary",
            letterSpacing: "0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {isActive ? `Estratégico: ${label}` : "Estratégico"}
        </Typography>
        <ExpandMore
          sx={{
            fontSize: 14,
            color: "text.disabled",
            flexShrink: 0,
            transition: "transform 0.18s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      {/* Dropdown */}
      <Collapse in={open} timeout={160}>
        <Box
          sx={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 160,
            bgcolor: dropdownBg,
            border: "1px solid",
            borderColor: dropdownBorder,
            borderRadius: 2.5,
            boxShadow: isDark
              ? "0 8px 24px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(0,0,0,0.10)",
            overflow: "hidden",
            zIndex: 1400,
            py: 0.5,
          }}
        >
          {OPTIONS.map((opt, idx) => {
            const isSelected = value === opt.value;
            return (
              <Box key={opt.value}>
                {idx === 1 && (
                  <Box
                    sx={{
                      height: "1px",
                      bgcolor: dropdownBorder,
                      mx: 1.5,
                      my: 0.25,
                    }}
                  />
                )}
                <Box
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    bgcolor: isSelected ? `${activeColor}12` : "transparent",
                    "&:hover": {
                      bgcolor: isSelected ? `${activeColor}18` : itemHoverBg,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: isSelected ? activeColor : "transparent",
                      border: "1.5px solid",
                      borderColor: isSelected ? activeColor : "text.disabled",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? activeColor : "text.secondary",
                      lineHeight: 1,
                    }}
                  >
                    {opt.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
