import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Avatar,
  Grid,
  Button,
  Modal as MuiModal,
  IconButton,
  Fade,
  Backdrop,
} from "@mui/material";
import {
  CalendarToday,
  TrendingUp,
  Inventory,
  SpaceDashboard,
  Person,
  Flag,
  Functions,
  Add,
  Image as ImageIcon,
  ZoomIn,
  Close,
  OpenInFull,
  ZoomOut,
} from "@mui/icons-material";
import Modal from "./Modal";
import SprintDetailsModal from "./SprintDetailsModal";
import CreateBacklogItemModal from "./CreateBacklogItemModal";
import CreateSprintModal from "./CreateSprintModal";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface ProjectDetailsModalProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    mapping_process_url?: string;
  };
}

interface Sprint {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  velocity: number;
  team_id: string;
}

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  story_points: number;
  assigned_to: string;
  assigned_to_profile?: { full_name: string };
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A Fazer", color: "#6b7280" },
  "in-progress": { label: "Em Progresso", color: "#f59e0b" },
  review: { label: "Em Revisão", color: "#8b5cf6" },
  done: { label: "Concluído", color: "#10b981" },
  blocked: { label: "Bloqueado", color: "#ef4444" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "#6b7280" },
  medium: { label: "Média", color: "#f59e0b" },
  high: { label: "Alta", color: "#ef4444" },
  urgent: { label: "Urgente", color: "#dc2626" },
};

const sprintStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: "Planejamento", color: "#6b7280" },
  active: { label: "Ativo", color: "#10b981" },
  completed: { label: "Concluído", color: "#6366f1" },
  cancelled: { label: "Cancelado", color: "#ef4444" },
};

const roleConfig: Record<string, { label: string; color: string }> = {
  product_owner: { label: "Product Owner", color: "#6366f1" },
  scrum_master: { label: "Scrum Master", color: "#8b5cf6" },
  developer: { label: "Developer", color: "#10b981" },
  member: { label: "Membro", color: "#6b7280" },
};

// Lightbox component for full-screen image viewing
function ImageLightbox({
  open,
  onClose,
  imageUrl,
  title,
}: {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <MuiModal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: { bgcolor: "rgba(0, 0, 0, 0.95)" },
        },
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            outline: "none",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              bgcolor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <Typography variant="h6" color="white" fontWeight={600}>
              {title}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                  "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                }}
              >
                <ZoomOut />
              </IconButton>
              <Chip
                label={`${Math.round(zoom * 100)}%`}
                sx={{
                  bgcolor: "rgba(99, 102, 241, 0.8)",
                  color: "white",
                  fontWeight: 600,
                }}
              />
              <IconButton
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                  "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                }}
              >
                <ZoomIn />
              </IconButton>
              <IconButton
                onClick={handleReset}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <OpenInFull />
              </IconButton>
              <IconButton
                onClick={onClose}
                sx={{
                  color: "white",
                  bgcolor: "rgba(239, 68, 68, 0.8)",
                  "&:hover": { bgcolor: "rgba(239, 68, 68, 1)" },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Image Container */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <Box
              component="img"
              src={imageUrl}
              alt="Mapa de Processos"
              sx={{
                maxWidth: zoom === 1 ? "90%" : "none",
                maxHeight: zoom === 1 ? "90%" : "none",
                objectFit: "contain",
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
                userSelect: "none",
                pointerEvents: "none",
              }}
              draggable={false}
            />
          </Box>

          {/* Footer hint */}
          <Box
            sx={{
              p: 2,
              textAlign: "center",
              bgcolor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
              Use os botoes de zoom para ampliar. {zoom > 1 && "Arraste para mover a imagem."}
            </Typography>
          </Box>
        </Box>
      </Fade>
    </MuiModal>
  );
}

export default function ProjectDetailsModal({
  open,
  onClose,
  project,
}: ProjectDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [sprintDetailsOpen, setSprintDetailsOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [backlogItemModalOpen, setBacklogItemModalOpen] = useState(false);
  const [selectedBacklogItem, setSelectedBacklogItem] =
    useState<BacklogItem | null>(null);
  const [createSprintModalOpen, setCreateSprintModalOpen] = useState(false);
  const [createBacklogModalOpen, setCreateBacklogModalOpen] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [processMapUrl, setProcessMapUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [statistics, setStatistics] = useState({
    totalBacklogItems: 0,
    totalSprints: 0,
    activeSprints: 0,
    completedSprints: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
  });

  useEffect(() => {
    if (open) {
      fetchProjectDetails();
    }
  }, [open, project.id]);

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      // Fetch project with mapping_process_url
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("mapping_process_url")
        .eq("id", project.id)
        .single();

      if (!projectError && projectData) {
        setProcessMapUrl(projectData.mapping_process_url || null);
      }

      // Fetch all data in parallel
      const [sprintsRes, backlogRes, statsRes] = await Promise.all([
        // Fetch sprints
        supabase
          .from("sprints")
          .select("id, name, status, start_date, end_date, velocity, team_id")
          .eq("project_id", project.id)
          .order("start_date", { ascending: false }),

        // Fetch backlog items (tasks not in a sprint)
        supabase
          .from("tasks")
          .select(
            "id, title, description, status, priority, story_points, assigned_to, assigned_to_profile:profiles!assigned_to(full_name)"
          )
          .eq("project_id", project.id)
          .is("sprint_id", null)
          .order("created_at", { ascending: false }),

        // Fetch all tasks for statistics
        supabase
          .from("tasks")
          .select("id, status, story_points")
          .eq("project_id", project.id),
      ]);

      if (sprintsRes.error) throw sprintsRes.error;
      if (backlogRes.error) throw backlogRes.error;
      if (statsRes.error) throw statsRes.error;

      setSprints(sprintsRes.data || []);

      // Transform backlog items to handle assigned_to_profile array
      const transformedBacklog = (backlogRes.data || []).map((item: any) => ({
        ...item,
        assigned_to_profile: Array.isArray(item.assigned_to_profile)
          ? item.assigned_to_profile[0]
          : item.assigned_to_profile,
      }));
      setBacklogItems(transformedBacklog);

      // Get unique team members from sprints
      const uniqueTeamIds = [
        ...new Set(
          (sprintsRes.data || []).map((s) => s.team_id).filter(Boolean)
        ),
      ];
      if (uniqueTeamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from("team_members")
          .select(
            "role, user_profile:profiles!user_id(id, full_name, avatar_url)"
          )
          .in("team_id", uniqueTeamIds);

        const uniqueMembers = teamsData
          ?.map((tm: any) => ({
            ...tm.user_profile,
            role: tm.role,
          }))
          .filter((m: any) => m)
          .reduce((acc: TeamMember[], curr: TeamMember) => {
            if (!acc.find((m) => m.id === curr.id)) {
              acc.push(curr);
            }
            return acc;
          }, []);

        setTeamMembers(uniqueMembers || []);
      }

      // Calculate statistics
      const allTasks = statsRes.data || [];
      const activeSprints = (sprintsRes.data || []).filter(
        (s) => s.status === "active"
      ).length;
      const completedSprints = (sprintsRes.data || []).filter(
        (s) => s.status === "completed"
      ).length;
      const totalStoryPoints = allTasks.reduce(
        (sum, task) => sum + (task.story_points || 0),
        0
      );
      const completedStoryPoints = allTasks
        .filter((task) => task.status === "done")
        .reduce((sum, task) => sum + (task.story_points || 0), 0);

      setStatistics({
        totalBacklogItems: (backlogRes.data || []).length,
        totalSprints: (sprintsRes.data || []).length,
        activeSprints,
        completedSprints,
        totalStoryPoints,
        completedStoryPoints,
      });
    } catch (error) {
      console.error("Error fetching project details:", error);
      toast.error("Erro ao carregar detalhes do projeto");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const calculateProgress = () => {
    if (statistics.totalStoryPoints === 0) return 0;
    return Math.round(
      (statistics.completedStoryPoints / statistics.totalStoryPoints) * 100
    );
  };

  const handleOpenSprintDetails = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setSprintDetailsOpen(true);
  };

  const handleCloseSprintDetails = () => {
    setSprintDetailsOpen(false);
    setSelectedSprint(null);
  };

  const handleOpenBacklogItem = (item: BacklogItem) => {
    setSelectedBacklogItem(item);
    setBacklogItemModalOpen(true);
  };

  const handleCloseBacklogItem = () => {
    setBacklogItemModalOpen(false);
    setSelectedBacklogItem(null);
  };

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title={project.name} maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={project.name} maxWidth="lg">
      <Box>
        {/* Project Overview Header */}
        <Card
          elevation={0}
          sx={{
            mb: 3,
            background:
              "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
            border: "2px solid rgba(99, 102, 241, 0.1)",
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {project.description || "Sem descricao"}
                </Typography>

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      Inicio
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <CalendarToday sx={{ fontSize: 14, color: "#6366f1" }} />
                      <Typography variant="body2" fontWeight={600}>
                        {formatDate(project.start_date)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      Termino
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <CalendarToday sx={{ fontSize: 14, color: "#6366f1" }} />
                      <Typography variant="body2" fontWeight={600}>
                        {formatDate(project.end_date)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {teamMembers.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ mb: 1.5, display: "block" }}
                    >
                      Membros do Time ({teamMembers.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                      {teamMembers.map((member) => {
                        const memberRole =
                          roleConfig[member.role] || roleConfig.member;
                        return (
                          <Card
                            key={member.id}
                            elevation={0}
                            sx={{
                              border: `2px solid ${memberRole.color}20`,
                              borderRadius: 2,
                              transition: "all 0.2s",
                              cursor: "pointer",
                              bgcolor: `${memberRole.color}08`,
                              "&:hover": {
                                border: `2px solid ${memberRole.color}`,
                                boxShadow: `0 4px 12px ${memberRole.color}30`,
                                transform: "translateY(-2px)",
                              },
                            }}
                          >
                            <CardContent
                              sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    bgcolor: memberRole.color,
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {member.full_name?.charAt(0) || "U"}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{
                                      color: "text.primary",
                                      lineHeight: 1.2,
                                      mb: 0.3,
                                    }}
                                  >
                                    {member.full_name}
                                  </Typography>
                                  <Chip
                                    label={memberRole.label}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      bgcolor: `${memberRole.color}`,
                                      color: "white",
                                      "& .MuiChip-label": {
                                        px: 1,
                                      },
                                    }}
                                  />
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "white",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <TrendingUp sx={{ fontSize: 20, color: "#6366f1" }} />
                      <Typography variant="body2" fontWeight={600}>
                        Progresso Geral
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{ color: "#6366f1", mb: 1 }}
                    >
                      {calculateProgress()}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress()}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: "rgba(99, 102, 241, 0.1)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "#6366f1",
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {statistics.completedStoryPoints} /{" "}
                      {statistics.totalStoryPoints} story points
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Box
                      sx={{
                        flex: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(16, 185, 129, 0.1)",
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: "#10b981" }}
                      >
                        {statistics.activeSprints}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        Sprints Ativos
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(245, 158, 11, 0.1)",
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: "#f59e0b" }}
                      >
                        {statistics.totalBacklogItems}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        No Backlog
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Process Map Section */}
        {processMapUrl && (
          <Card
            elevation={0}
            sx={{
              mb: 3,
              border: "2px solid rgba(99, 102, 241, 0.15)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: "rgba(99, 102, 241, 0.05)",
                borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ImageIcon sx={{ color: "#6366f1", fontSize: 22 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Mapa de Processos
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ZoomIn />}
                onClick={() => setLightboxOpen(true)}
                sx={{
                  borderColor: "#6366f1",
                  color: "#6366f1",
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: "#4f46e5",
                    bgcolor: "rgba(99, 102, 241, 0.05)",
                  },
                }}
              >
                Expandir
              </Button>
            </Box>
            <Box
              onClick={() => setLightboxOpen(true)}
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "rgba(248, 250, 252, 0.5)",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: "rgba(99, 102, 241, 0.03)",
                },
                "&:hover .zoom-overlay": {
                  opacity: 1,
                },
              }}
            >
              {/* Hover overlay */}
              <Box
                className="zoom-overlay"
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(99, 102, 241, 0.1)",
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "rgba(99, 102, 241, 0.9)",
                    color: "white",
                    px: 3,
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  <ZoomIn sx={{ fontSize: 20 }} />
                  <Typography variant="body2" fontWeight={600}>
                    Clique para ampliar
                  </Typography>
                </Box>
              </Box>

              {/* Process Map Image */}
              <Box
                component="img"
                src={processMapUrl}
                alt="Mapa de Processos do Projeto"
                sx={{
                  maxWidth: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  borderRadius: 2,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                }}
              />
            </Box>
          </Card>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
          >
            <Tab
              label="Sprints"
              icon={<SpaceDashboard />}
              iconPosition="start"
            />
            <Tab label="Backlog" icon={<Inventory />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <Box>
            {/* Sprints Header with Create Button */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Sprints do Projeto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sprints.length} sprint{sprints.length !== 1 ? "s" : ""} encontrado{sprints.length !== 1 ? "s" : ""}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateSprintModalOpen(true)}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    boxShadow: "0 6px 16px rgba(99, 102, 241, 0.4)",
                  },
                }}
              >
                Novo Sprint
              </Button>
            </Box>

            {sprints.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 6,
                  px: 3,
                  borderRadius: 3,
                  bgcolor: "rgba(99, 102, 241, 0.05)",
                  border: "2px dashed rgba(99, 102, 241, 0.2)",
                }}
              >
                <SpaceDashboard
                  sx={{ fontSize: 60, color: "#6366f1", opacity: 0.3, mb: 2 }}
                />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Nenhum sprint criado ainda
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Crie o primeiro sprint para este projeto
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setCreateSprintModalOpen(true)}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    borderWidth: 2,
                    borderColor: "#6366f1",
                    color: "#6366f1",
                    fontWeight: 600,
                    "&:hover": {
                      borderWidth: 2,
                      borderColor: "#6366f1",
                      bgcolor: "rgba(99, 102, 241, 0.05)",
                    },
                  }}
                >
                  Criar Primeiro Sprint
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {sprints.map((sprint) => (
                  <Card
                    key={sprint.id}
                    elevation={0}
                    onClick={() => handleOpenSprintDetails(sprint)}
                    sx={{
                      border: "2px solid rgba(99, 102, 241, 0.1)",
                      borderRadius: 3,
                      transition: "all 0.2s",
                      cursor: "pointer",
                      "&:hover": {
                        border: "2px solid rgba(99, 102, 241, 0.3)",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            gutterBottom
                          >
                            {sprint.name}
                          </Typography>

                          <Box
                            sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}
                          >
                            <Chip
                              label={
                                sprintStatusConfig[sprint.status]?.label ||
                                sprint.status
                              }
                              size="small"
                              sx={{
                                bgcolor: `${
                                  sprintStatusConfig[sprint.status]?.color
                                }20`,
                                color: sprintStatusConfig[sprint.status]?.color,
                                fontWeight: 600,
                              }}
                            />

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <CalendarToday
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatDate(sprint.start_date)} -{" "}
                                {formatDate(sprint.end_date)}
                              </Typography>
                            </Box>

                            {sprint.velocity > 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <TrendingUp
                                  sx={{ fontSize: 14, color: "#6366f1" }}
                                />
                                <Typography
                                  variant="caption"
                                  fontWeight={600}
                                  sx={{ color: "#6366f1" }}
                                >
                                  Velocity: {sprint.velocity}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {/* Backlog Header with Create Button */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Product Backlog
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {backlogItems.length} ite{backlogItems.length !== 1 ? "ns" : "m"} no backlog
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateBacklogModalOpen(true)}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #d97706 0%, #ea580c 100%)",
                    boxShadow: "0 6px 16px rgba(245, 158, 11, 0.4)",
                  },
                }}
              >
                Novo Item
              </Button>
            </Box>

            {backlogItems.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 6,
                  px: 3,
                  borderRadius: 3,
                  bgcolor: "rgba(245, 158, 11, 0.05)",
                  border: "2px dashed rgba(245, 158, 11, 0.2)",
                }}
              >
                <Inventory
                  sx={{ fontSize: 60, color: "#f59e0b", opacity: 0.3, mb: 2 }}
                />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Backlog vazio
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Adicione itens ao backlog deste projeto
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setCreateBacklogModalOpen(true)}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    borderWidth: 2,
                    borderColor: "#f59e0b",
                    color: "#f59e0b",
                    fontWeight: 600,
                    "&:hover": {
                      borderWidth: 2,
                      borderColor: "#f59e0b",
                      bgcolor: "rgba(245, 158, 11, 0.05)",
                    },
                  }}
                >
                  Criar Primeiro Item
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {backlogItems.map((item) => (
                  <Card
                    key={item.id}
                    elevation={0}
                    onClick={() => handleOpenBacklogItem(item)}
                    sx={{
                      border: "2px solid rgba(99, 102, 241, 0.1)",
                      borderRadius: 3,
                      transition: "all 0.2s",
                      cursor: "pointer",
                      "&:hover": {
                        border: "2px solid rgba(99, 102, 241, 0.3)",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="body1"
                            fontWeight={600}
                            gutterBottom
                          >
                            {item.title}
                          </Typography>

                          <Box
                            sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                          >
                            <Chip
                              label={
                                statusConfig[item.status]?.label || item.status
                              }
                              size="small"
                              sx={{
                                bgcolor: `${
                                  statusConfig[item.status]?.color
                                }20`,
                                color: statusConfig[item.status]?.color,
                                fontWeight: 600,
                                fontSize: "0.7rem",
                              }}
                            />

                            <Chip
                              label={
                                priorityConfig[item.priority]?.label ||
                                item.priority
                              }
                              size="small"
                              icon={<Flag sx={{ fontSize: 14 }} />}
                              sx={{
                                bgcolor: `${
                                  priorityConfig[item.priority]?.color
                                }20`,
                                color: priorityConfig[item.priority]?.color,
                                fontWeight: 600,
                                fontSize: "0.7rem",
                              }}
                            />

                            {item.story_points > 0 && (
                              <Chip
                                label={`${item.story_points} pts`}
                                size="small"
                                icon={<Functions sx={{ fontSize: 14 }} />}
                                sx={{
                                  bgcolor: "rgba(99, 102, 241, 0.1)",
                                  color: "#6366f1",
                                  fontWeight: 600,
                                  fontSize: "0.7rem",
                                }}
                              />
                            )}

                            {item.assigned_to_profile?.full_name && (
                              <Chip
                                label={item.assigned_to_profile.full_name}
                                size="small"
                                icon={<Person sx={{ fontSize: 14 }} />}
                                sx={{
                                  bgcolor: "rgba(16, 185, 129, 0.1)",
                                  color: "#10b981",
                                  fontWeight: 600,
                                  fontSize: "0.7rem",
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {selectedSprint && (
        <SprintDetailsModal
          open={sprintDetailsOpen}
          onClose={handleCloseSprintDetails}
          sprint={{
            id: selectedSprint.id,
            name: selectedSprint.name,
            project_id: project.id,
            team_id: selectedSprint.team_id,
            start_date: selectedSprint.start_date,
            end_date: selectedSprint.end_date,
          }}
        />
      )}

      {selectedBacklogItem && (
        <CreateBacklogItemModal
          open={backlogItemModalOpen}
          onClose={handleCloseBacklogItem}
          onSuccess={() => {
            handleCloseBacklogItem();
            fetchProjectDetails();
          }}
          item={{
            id: selectedBacklogItem.id,
            title: selectedBacklogItem.title,
            description: selectedBacklogItem.description,
            status: selectedBacklogItem.status,
            priority: selectedBacklogItem.priority,
            story_points: selectedBacklogItem.story_points,
            project_id: project.id,
            assigned_to: selectedBacklogItem.assigned_to,
          }}
        />
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        open={createSprintModalOpen}
        onClose={() => setCreateSprintModalOpen(false)}
        onSuccess={() => {
          setCreateSprintModalOpen(false);
          fetchProjectDetails();
        }}
        defaultProjectId={project.id}
      />

      {/* Create Backlog Item Modal */}
      <CreateBacklogItemModal
        open={createBacklogModalOpen}
        onClose={() => setCreateBacklogModalOpen(false)}
        onSuccess={() => {
          setCreateBacklogModalOpen(false);
          fetchProjectDetails();
        }}
        item={{
          id: "",
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          story_points: 0,
          project_id: project.id,
          assigned_to: "",
        }}
      />

      {/* Image Lightbox */}
      {processMapUrl && (
        <ImageLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={processMapUrl}
          title={`Mapa de Processos - ${project.name}`}
        />
      )}
    </Modal>
  );
}
