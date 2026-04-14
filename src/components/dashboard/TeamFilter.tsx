import { useState, useEffect, useRef } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { ExpandMore, Groups } from "@mui/icons-material";
import { useTheme as useMUITheme } from "@mui/material/styles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Team {
  id: string;
  name: string;
}

interface TeamFilterProps {
  value: string | null;
  onChange: (teamId: string | null) => void;
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

  const selectedTeam = teams.find((t) => t.id === value) ?? null;
  const label = selectedTeam?.name ?? "Todos os times";

  // Don't render if user belongs to 0 or 1 team
  if (teams.length < 2) return null;

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
            : "transparent",
          transition: "all 0.18s ease",
          "&:hover": {
            bgcolor: pillBgHover,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
          },
        }}
      >
        <Groups
          sx={{
            fontSize: 15,
            color: value ? activeColor : "text.disabled",
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: value ? 600 : 500,
            color: value ? activeColor : "text.secondary",
            letterSpacing: "0.01em",
            lineHeight: 1,
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
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
            minWidth: 180,
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
          {/* "All teams" option */}
          <Box
            onClick={() => { onChange(null); setOpen(false); }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              cursor: "pointer",
              transition: "background 0.15s ease",
              bgcolor: value === null ? `${activeColor}12` : "transparent",
              "&:hover": { bgcolor: value === null ? `${activeColor}18` : itemHoverBg },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: value === null ? activeColor : "transparent",
                border: "1.5px solid",
                borderColor: value === null ? activeColor : "text.disabled",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: value === null ? 600 : 400,
                color: value === null ? activeColor : "text.secondary",
                lineHeight: 1,
              }}
            >
              Todos os times
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ height: "1px", bgcolor: dropdownBorder, mx: 1.5, my: 0.25 }} />

          {/* Team options */}
          {teams.map((team) => {
            const isActive = value === team.id;
            return (
              <Box
                key={team.id}
                onClick={() => { onChange(team.id); setOpen(false); }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  bgcolor: isActive ? `${activeColor}12` : "transparent",
                  "&:hover": { bgcolor: isActive ? `${activeColor}18` : itemHoverBg },
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: isActive ? activeColor : "transparent",
                    border: "1.5px solid",
                    borderColor: isActive ? activeColor : "text.disabled",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? activeColor : "text.secondary",
                    lineHeight: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  {team.name}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
