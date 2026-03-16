import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  CircularProgress,
  Fab,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Collapse,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
} from "@mui/material";
import {
  Add,
  Assignment,
  CalendarToday,
  Delete,
  Edit,
  Folder,
  Download,
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  Groups,
  ViewModule,
  ViewList,
  ChevronRight,
} from "@mui/icons-material";
import Navbar from "@/components/Navbar";
import { ProjectCreationWizard } from "@/components/project";
import EditProjectModal from "@/components/EditProjectModal";
import DeleteProjectModal from "@/components/DeleteProjectModal";
import { supabase } from "@/lib/supabase";
import { exportProjectsToPDF } from "@/utils/exportProjectsToPDF";
import toast from "react-hot-toast";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  teams?: string[];
}

interface Team {
  id: string;
  name: string;
}

interface Filters {
  search: string;
  status: string[];
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
  teams: string[];
}

const statusConfig: Record<string, { label: string; color: any }> = {
  active: { label: "Ativo", color: "success" },
  "on-hold": { label: "Em Espera", color: "warning" },
  completed: { label: "Concluído", color: "primary" },
  archived: { label: "Arquivado", color: "default" },
};

const initialFilters: Filters = {
  search: "",
  status: [],
  startDateFrom: "",
  startDateTo: "",
  endDateFrom: "",
  endDateTo: "",
  teams: [],
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projectTeams, setProjectTeams] = useState<Record<string, string[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE_CARD = 9;
  const ITEMS_PER_PAGE_LIST = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects, teams, and sprints in parallel
      const [projectsRes, teamsRes, sprintsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name").order("name"),
        supabase.from("sprints").select("project_id, team_id"),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (sprintsRes.error) throw sprintsRes.error;

      setProjects(projectsRes.data || []);
      setTeams(teamsRes.data || []);

      // Build project-teams mapping
      const mapping: Record<string, string[]> = {};
      sprintsRes.data?.forEach((sprint) => {
        if (sprint.project_id && sprint.team_id) {
          if (!mapping[sprint.project_id]) {
            mapping[sprint.project_id] = [];
          }
          if (!mapping[sprint.project_id].includes(sprint.team_id)) {
            mapping[sprint.project_id].push(sprint.team_id);
          }
        }
      });
      setProjectTeams(mapping);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    await fetchData();
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Filter logic
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter (name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!project.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (
        filters.status.length > 0 &&
        !filters.status.includes(project.status)
      ) {
        return false;
      }

      // Start date range filter
      if (filters.startDateFrom && project.start_date) {
        if (new Date(project.start_date) < new Date(filters.startDateFrom)) {
          return false;
        }
      }
      if (filters.startDateTo && project.start_date) {
        if (new Date(project.start_date) > new Date(filters.startDateTo)) {
          return false;
        }
      }

      // End date range filter
      if (filters.endDateFrom && project.end_date) {
        if (new Date(project.end_date) < new Date(filters.endDateFrom)) {
          return false;
        }
      }
      if (filters.endDateTo && project.end_date) {
        if (new Date(project.end_date) > new Date(filters.endDateTo)) {
          return false;
        }
      }

      // Teams filter
      if (filters.teams.length > 0) {
        const projectTeamIds = projectTeams[project.id] || [];
        const hasMatchingTeam = filters.teams.some((teamId) =>
          projectTeamIds.includes(teamId)
        );
        if (!hasMatchingTeam) {
          return false;
        }
      }

      return true;
    });
  }, [projects, filters, projectTeams]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.status.length > 0 ||
      filters.startDateFrom !== "" ||
      filters.startDateTo !== "" ||
      filters.endDateFrom !== "" ||
      filters.endDateTo !== "" ||
      filters.teams.length > 0
    );
  }, [filters]);

  const clearFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: "card" | "list" | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
      setCurrentPage(1);
    }
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  const itemsPerPage =
    viewMode === "card" ? ITEMS_PER_PAGE_CARD : ITEMS_PER_PAGE_LIST;

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const handleOpenEditModal = (project: Project) => {
    setSelectedProject(project);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedProject(null);
  };

  const handleOpenProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectToDelete.id);

      if (error) throw error;

      toast.success("Projeto excluído com sucesso!");
      handleCloseDeleteModal();
      await fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Erro ao excluir projeto");
    }
  };

  const handleExportToPDF = async () => {
    setExportLoading(true);
    try {
      await exportProjectsToPDF();
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      console.error("Error exporting to PDF:", error);
      toast.error(error.message || "Erro ao gerar PDF");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Projetos
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Gerencie todos os seus projetos em um só lugar
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={
                exportLoading ? <CircularProgress size={20} /> : <Download />
              }
              onClick={handleExportToPDF}
              disabled={exportLoading || projects.length === 0}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                display: { xs: "none", sm: "flex" },
                borderWidth: 2,
                borderColor: "rgba(99, 102, 241, 0.3)",
                color: "#6366f1",
                fontWeight: 600,
                "&:hover": {
                  borderWidth: 2,
                  borderColor: "#6366f1",
                  backgroundColor: "rgba(99, 102, 241, 0.05)",
                },
              }}
            >
              {exportLoading ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateWizardOpen(true)}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                display: { xs: "none", sm: "flex" },
              }}
            >
              Novo Projeto
            </Button>
          </Box>
        </Box>

        {/* Filter Section */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            border: "2px solid",
            borderColor: hasActiveFilters
              ? "rgba(99, 102, 241, 0.3)"
              : "rgba(99, 102, 241, 0.1)",
            borderRadius: 3,
            overflow: "hidden",
            transition: "all 0.3s ease",
          }}
        >
          {/* Filter Header */}
          <Box
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              cursor: "pointer",
              bgcolor: hasActiveFilters
                ? "rgba(99, 102, 241, 0.05)"
                : "transparent",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "rgba(99, 102, 241, 0.08)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <FilterList sx={{ color: "#6366f1" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Filtros
              </Typography>
              {hasActiveFilters && (
                <Chip
                  label={`${filteredProjects.length} de ${projects.length}`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(99, 102, 241, 0.1)",
                    color: "#6366f1",
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {hasActiveFilters && (
                <Button
                  size="small"
                  startIcon={<Clear />}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  sx={{
                    color: "#ef4444",
                    fontWeight: 600,
                    "&:hover": {
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                    },
                  }}
                >
                  Limpar
                </Button>
              )}
              {filtersExpanded ? (
                <ExpandLess sx={{ color: "text.secondary" }} />
              ) : (
                <ExpandMore sx={{ color: "text.secondary" }} />
              )}
            </Box>
          </Box>

          {/* Filter Content */}
          <Collapse in={filtersExpanded}>
            <Box
              sx={{
                p: 3,
                pt: 0,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {/* Row 1: Search and Status */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder="Buscar por nome do projeto..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: filters.search && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleFilterChange("search", "")}
                          >
                            <Clear fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#6366f1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#6366f1",
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      multiple
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                      input={<OutlinedInput label="Status" />}
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={statusConfig[value]?.label || value}
                              size="small"
                              color={statusConfig[value]?.color || "default"}
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Box>
                      )}
                      sx={{
                        borderRadius: 2,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#6366f1",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#6366f1",
                        },
                      }}
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <MenuItem key={key} value={key}>
                          <Chip
                            label={config.label}
                            size="small"
                            color={config.color}
                            sx={{ fontWeight: 600 }}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Row 2: Date Filters */}
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  Data de Início
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="De"
                      value={filters.startDateFrom}
                      onChange={(e) =>
                        handleFilterChange("startDateFrom", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          "&:hover fieldset": { borderColor: "#6366f1" },
                          "&.Mui-focused fieldset": { borderColor: "#6366f1" },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Até"
                      value={filters.startDateTo}
                      onChange={(e) =>
                        handleFilterChange("startDateTo", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          "&:hover fieldset": { borderColor: "#6366f1" },
                          "&.Mui-focused fieldset": { borderColor: "#6366f1" },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  Data de Término
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="De"
                      value={filters.endDateFrom}
                      onChange={(e) =>
                        handleFilterChange("endDateFrom", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          "&:hover fieldset": { borderColor: "#6366f1" },
                          "&.Mui-focused fieldset": { borderColor: "#6366f1" },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Até"
                      value={filters.endDateTo}
                      onChange={(e) =>
                        handleFilterChange("endDateTo", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          "&:hover fieldset": { borderColor: "#6366f1" },
                          "&.Mui-focused fieldset": { borderColor: "#6366f1" },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Row 3: Teams Filter */}
              <FormControl fullWidth>
                <InputLabel id="teams-filter-label">Times</InputLabel>
                <Select
                  labelId="teams-filter-label"
                  multiple
                  value={filters.teams}
                  onChange={(e) => handleFilterChange("teams", e.target.value)}
                  input={<OutlinedInput label="Times" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const team = teams.find((t) => t.id === value);
                        return (
                          <Chip
                            key={value}
                            label={team?.name || value}
                            size="small"
                            icon={<Groups sx={{ fontSize: 16 }} />}
                            sx={{
                              fontWeight: 600,
                              bgcolor: "rgba(124, 58, 237, 0.1)",
                              color: "#7c3aed",
                              "& .MuiChip-icon": { color: "#7c3aed" },
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  sx={{
                    borderRadius: 2,
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#6366f1",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#6366f1",
                    },
                  }}
                >
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Groups sx={{ fontSize: 20, color: "#7c3aed" }} />
                        <Typography>{team.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Collapse>
        </Paper>

        {/* View Toggle and Results Info */}
        {!loading && filteredProjects.length > 0 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Mostrando {paginatedProjects.length} de {filteredProjects.length}{" "}
              projeto{filteredProjects.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="modo de visualização"
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  border: "2px solid rgba(99, 102, 241, 0.2)",
                  borderRadius: 2,
                  px: 2,
                  py: 0.75,
                  "&.Mui-selected": {
                    bgcolor: "rgba(99, 102, 241, 0.1)",
                    borderColor: "#6366f1",
                    color: "#6366f1",
                    "&:hover": {
                      bgcolor: "rgba(99, 102, 241, 0.15)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(99, 102, 241, 0.05)",
                  },
                },
              }}
            >
              <ToggleButton value="card" aria-label="visualização em cards">
                <Tooltip title="Visualização em Cards">
                  <ViewModule sx={{ mr: 1 }} />
                </Tooltip>
                Cards
              </ToggleButton>
              <ToggleButton value="list" aria-label="visualização em lista">
                <Tooltip title="Visualização em Lista">
                  <ViewList sx={{ mr: 1 }} />
                </Tooltip>
                Lista
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : filteredProjects.length === 0 && !hasActiveFilters ? (
          <Box
            sx={{
              textAlign: "center",
              py: 12,
              px: 4,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)",
              border: "2px dashed rgba(99, 102, 241, 0.2)",
            }}
          >
            <Folder
              sx={{ fontSize: 80, color: "#6366f1", opacity: 0.3, mb: 2 }}
            />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nenhum projeto criado ainda
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 500, mx: "auto" }}
            >
              Comece criando seu primeiro projeto para organizar suas tarefas e
              sprints
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setCreateWizardOpen(true)}
              sx={{ px: 6, py: 1.5, fontSize: "1.1rem" }}
            >
              Criar Primeiro Projeto
            </Button>
          </Box>
        ) : filteredProjects.length === 0 && hasActiveFilters ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 4,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)",
              border: "2px dashed rgba(99, 102, 241, 0.2)",
            }}
          >
            <Search
              sx={{ fontSize: 80, color: "#6366f1", opacity: 0.3, mb: 2 }}
            />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nenhum projeto encontrado
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 500, mx: "auto" }}
            >
              Não encontramos projetos que correspondam aos filtros selecionados
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              sx={{
                px: 4,
                py: 1.5,
                borderWidth: 2,
                borderColor: "#6366f1",
                color: "#6366f1",
                fontWeight: 600,
                "&:hover": {
                  borderWidth: 2,
                  bgcolor: "rgba(99, 102, 241, 0.05)",
                },
              }}
            >
              Limpar Filtros
            </Button>
          </Box>
        ) : (
          <>
            {/* Card View */}
            {viewMode === "card" && (
              <Grid container spacing={3}>
                {paginatedProjects.map((project) => (
                  <Grid item xs={12} md={6} lg={4} key={project.id}>
                    <Card
                      elevation={0}
                      onClick={() => handleOpenProject(project)}
                      sx={{
                        height: "100%",
                        background:
                          "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                        border: "2px solid rgba(99, 102, 241, 0.1)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow:
                            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                          border: "2px solid rgba(99, 102, 241, 0.3)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              background:
                                "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 8px 16px rgba(99, 102, 241, 0.3)",
                            }}
                          >
                            <Assignment sx={{ color: "white", fontSize: 24 }} />
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              label={
                                statusConfig[project.status]?.label ||
                                project.status
                              }
                              color={
                                statusConfig[project.status]?.color || "default"
                              }
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                            <Tooltip title="Editar Projeto">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(project);
                                }}
                                sx={{
                                  bgcolor: "rgba(99, 102, 241, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(99, 102, 241, 0.2)",
                                  },
                                }}
                              >
                                <Edit sx={{ color: "#6366f1" }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir Projeto">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project);
                                }}
                                sx={{
                                  bgcolor: "rgba(239, 68, 68, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(239, 68, 68, 0.2)",
                                  },
                                }}
                              >
                                <Delete sx={{ color: "#ef4444" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        <Typography
                          variant="h5"
                          fontWeight={700}
                          gutterBottom
                          sx={{ mb: 1 }}
                        >
                          {project.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: 40,
                          }}
                        >
                          {project.description || "Sem descrição"}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            pt: 2,
                            borderTop: "1px solid",
                            borderColor: "rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 0.5,
                              }}
                            >
                              <CalendarToday
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                              >
                                Início
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(project.start_date)}
                            </Typography>
                          </Box>

                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 0.5,
                              }}
                            >
                              <CalendarToday
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                              >
                                Término
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(project.end_date)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "2px solid rgba(99, 102, 241, 0.1)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        background:
                          "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#6366f1",
                          fontSize: "0.875rem",
                          py: 2,
                        }}
                      >
                        Projeto
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#6366f1",
                          fontSize: "0.875rem",
                          py: 2,
                        }}
                      >
                        Status
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#6366f1",
                          fontSize: "0.875rem",
                          py: 2,
                          display: { xs: "none", md: "table-cell" },
                        }}
                      >
                        Data de Início
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#6366f1",
                          fontSize: "0.875rem",
                          py: 2,
                          display: { xs: "none", md: "table-cell" },
                        }}
                      >
                        Data de Término
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: "#6366f1",
                          fontSize: "0.875rem",
                          py: 2,
                        }}
                      >
                        Ações
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedProjects.map((project, index) => (
                      <TableRow
                        key={project.id}
                        onClick={() => handleOpenProject(project)}
                        sx={{
                          cursor: "pointer",
                          bgcolor:
                            index % 2 === 0
                              ? "transparent"
                              : "rgba(99, 102, 241, 0.02)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bgcolor: alpha("#6366f1", 0.08),
                            "& .row-arrow": {
                              opacity: 1,
                              transform: "translateX(0)",
                            },
                          },
                          "&:last-child td": {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background:
                                  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow:
                                  "0 4px 8px rgba(99, 102, 241, 0.25)",
                                flexShrink: 0,
                              }}
                            >
                              <Assignment
                                sx={{ color: "white", fontSize: 20 }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                fontWeight={600}
                                sx={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {project.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {project.description || "Sem descrição"}
                              </Typography>
                            </Box>
                            <ChevronRight
                              className="row-arrow"
                              sx={{
                                color: "#6366f1",
                                opacity: 0,
                                transform: "translateX(-8px)",
                                transition: "all 0.2s ease",
                                ml: "auto",
                                display: { xs: "none", sm: "block" },
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Chip
                            label={
                              statusConfig[project.status]?.label ||
                              project.status
                            }
                            color={
                              statusConfig[project.status]?.color || "default"
                            }
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            py: 2.5,
                            display: { xs: "none", md: "table-cell" },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <CalendarToday
                              sx={{ fontSize: 16, color: "text.secondary" }}
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(project.start_date)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            py: 2.5,
                            display: { xs: "none", md: "table-cell" },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <CalendarToday
                              sx={{ fontSize: 16, color: "text.secondary" }}
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(project.end_date)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Tooltip title="Editar Projeto">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(project);
                                }}
                                sx={{
                                  bgcolor: "rgba(99, 102, 241, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(99, 102, 241, 0.2)",
                                  },
                                }}
                              >
                                <Edit
                                  sx={{ color: "#6366f1", fontSize: 18 }}
                                />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir Projeto">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project);
                                }}
                                sx={{
                                  bgcolor: "rgba(239, 68, 68, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(239, 68, 68, 0.2)",
                                  },
                                }}
                              >
                                <Delete
                                  sx={{ color: "#ef4444", fontSize: 18 }}
                                />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 4,
                }}
              >
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": {
                      fontWeight: 600,
                      borderRadius: 2,
                      "&.Mui-selected": {
                        background:
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        color: "white",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #5558e3 0%, #7c4fe0 100%)",
                        },
                      },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}

        <Fab
          color="primary"
          onClick={() => setCreateWizardOpen(true)}
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            display: { xs: "flex", sm: "none" },
            width: 64,
            height: 64,
            boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.4)",
          }}
        >
          <Add sx={{ fontSize: 32 }} />
        </Fab>
      </Container>

      <ProjectCreationWizard
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onSuccess={() => {
          fetchProjects();
        }}
      />

      {selectedProject && (
        <EditProjectModal
          open={editModalOpen}
          onClose={handleCloseEditModal}
          onSuccess={fetchProjects}
          project={selectedProject}
        />
      )}

      <DeleteProjectModal
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDeleteProject}
        project={projectToDelete}
      />
    </Box>
  );
}
