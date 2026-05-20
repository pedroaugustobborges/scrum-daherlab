import { useState, useEffect, useRef } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { ExpandMore, Groups, Check } from "@mui/icons-material";
import { useTheme as useMUITheme } from "@mui/material/styles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Team {
  id: string;
  name: string;
}

interface TeamFilterProps {
  /** Array of selected team IDs. Empty array = all teams (no filter). */
  value: string[];
  onChange: (teamIds: string[]) => void;
}

export default function TeamFilter({ value, onChange }: TeamFilterProps) {
  const { user } = useAuth();
  const muiTheme = useMUITheme();
  const isDark = muiTheme.palette.mode === "dark";

  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchTeams = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("teams(id, name)")
        .eq("user_id", user.id);
      if (data) {
        const parsed: Team[] = data
          .map((row: any) => row.teams)
          .filter(Boolean)
          .sort((a: Team, b: Team) => a.name.localeCompare(b.name));
        setTeams(parsed);
      }
    };
    fetchTeams();
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Don't render if user belongs to 0 or 1 team
  if (teams.length < 2) return null;

  const selectedCount = value.length;
  const isActive = selectedCount > 0;

  const label =
    selectedCount === 0
      ? "Todos os times"
      : selectedCount === 1
        ? (teams.find((t) => t.id === value[0])?.name ?? "1 time")
        : `${selectedCount} times`;

  const toggleTeam = (teamId: string) => {
    if (value.includes(teamId)) {
      onChange(value.filter((id) => id !== teamId));
    } else {
      onChange([...value, teamId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const pillBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const pillBgHover = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
  const pillBgOpen = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
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
            ? isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"
            : isActive ? `${activeColor}50` : "transparent",
          transition: "all 0.18s ease",
          "&:hover": {
            bgcolor: pillBgHover,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
          },
        }}
      >
        <Groups sx={{ fontSize: 15, color: isActive ? activeColor : "text.disabled", flexShrink: 0 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: isActive ? 600 : 500,
            color: isActive ? activeColor : "text.secondary",
            letterSpacing: "0.01em",
            lineHeight: 1,
            maxWidth: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
        {/* Compact count badge for multiple selections */}
        {selectedCount > 1 && (
          <Box
            sx={{
              minWidth: 18,
              height: 18,
              borderRadius: 99,
              bgcolor: activeColor,
              color: "white",
              fontSize: "0.65rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 0.5,
              flexShrink: 0,
            }}
          >
            {selectedCount}
          </Box>
        )}
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

      {/* Dropdown — stays open while multi-selecting */}
      <Collapse in={open} timeout={160}>
        <Box
          sx={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 200,
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
          {/* "All teams" option — clears selection and closes */}
          <Box
            onClick={clearAll}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              cursor: "pointer",
              transition: "background 0.15s ease",
              bgcolor: !isActive ? `${activeColor}12` : "transparent",
              "&:hover": { bgcolor: !isActive ? `${activeColor}18` : itemHoverBg },
            }}
          >
            {/* Circle indicator */}
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "1.5px solid",
                borderColor: !isActive ? activeColor : "text.disabled",
                bgcolor: !isActive ? `${activeColor}20` : "transparent",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!isActive && (
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: activeColor }} />
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: !isActive ? 600 : 400,
                color: !isActive ? activeColor : "text.secondary",
                lineHeight: 1,
              }}
            >
              Todos os times
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ height: "1px", bgcolor: dropdownBorder, mx: 1.5, my: 0.25 }} />

          {/* Multi-select team rows */}
          {teams.map((team) => {
            const isChecked = value.includes(team.id);
            return (
              <Box
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.875,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  bgcolor: isChecked ? `${activeColor}10` : "transparent",
                  "&:hover": { bgcolor: isChecked ? `${activeColor}18` : itemHoverBg },
                }}
              >
                {/* Square checkbox indicator */}
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "4px",
                    border: "1.5px solid",
                    borderColor: isChecked ? activeColor : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
                    bgcolor: isChecked ? activeColor : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isChecked && <Check sx={{ fontSize: 11, color: "white" }} />}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isChecked ? 600 : 400,
                    color: isChecked ? activeColor : "text.secondary",
                    lineHeight: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                    flex: 1,
                  }}
                >
                  {team.name}
                </Typography>
              </Box>
            );
          })}

          {/* Footer hint when something is selected */}
          {isActive && (
            <>
              <Box sx={{ height: "1px", bgcolor: dropdownBorder, mx: 1.5, mt: 0.25 }} />
              <Box sx={{ px: 1.5, py: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{ color: "text.disabled", fontSize: "0.65rem" }}
                >
                  Clique em "Todos os times" para limpar
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
