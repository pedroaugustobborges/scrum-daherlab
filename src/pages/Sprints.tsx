import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress,
  Fab,
  IconButton,
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
} from '@mui/material'
import {
  Add,
  SpaceDashboard,
  CalendarToday,
  Flag,
  Speed,
  Timeline,
  Edit,
  Delete,
  ListAlt,
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  Groups,
  Assignment,
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import CreateSprintModal from '@/components/CreateSprintModal'
import EditSprintModal from '@/components/EditSprintModal'
import SprintDetailsModal from '@/components/SprintDetailsModal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Sprint {
  id: string
  name: string
  goal: string
  start_date: string
  end_date: string
  status: string
  velocity: number
  team_id: string
  project_id: string
  created_at: string
  teams?: { name: string }
  projects?: { name: string }
}

interface Team {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface Filters {
  search: string
  status: string[]
  startDateFrom: string
  startDateTo: string
  endDateFrom: string
  endDateTo: string
  teams: string[]
  projects: string[]
}

const statusConfig: Record<string, { label: string; color: any }> = {
  planning: { label: 'Planejamento', color: 'warning' },
  active: { label: 'Ativo', color: 'success' },
  completed: { label: 'Concluído', color: 'primary' },
  cancelled: { label: 'Cancelado', color: 'error' },
}

const initialFilters: Filters = {
  search: '',
  status: [],
  startDateFrom: '',
  startDateTo: '',
  endDateFrom: '',
  endDateTo: '',
  teams: [],
  projects: [],
}

export default function Sprints() {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sprintsRes, teamsRes, projectsRes] = await Promise.all([
        supabase
          .from('sprints')
          .select('*, teams(name), projects(name)')
          .order('created_at', { ascending: false }),
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('projects').select('id, name').order('name'),
      ])

      if (sprintsRes.error) throw sprintsRes.error
      if (teamsRes.error) throw teamsRes.error
      if (projectsRes.error) throw projectsRes.error

      setSprints(sprintsRes.data || [])
      setTeams(teamsRes.data || [])
      setProjects(projectsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar sprints')
    } finally {
      setLoading(false)
    }
  }

  const fetchSprints = async () => {
    await fetchData()
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Filter logic
  const filteredSprints = useMemo(() => {
    return sprints.filter((sprint) => {
      // Search filter (name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!sprint.name.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(sprint.status)) {
        return false
      }

      // Start date range filter
      if (filters.startDateFrom && sprint.start_date) {
        if (new Date(sprint.start_date) < new Date(filters.startDateFrom)) {
          return false
        }
      }
      if (filters.startDateTo && sprint.start_date) {
        if (new Date(sprint.start_date) > new Date(filters.startDateTo)) {
          return false
        }
      }

      // End date range filter
      if (filters.endDateFrom && sprint.end_date) {
        if (new Date(sprint.end_date) < new Date(filters.endDateFrom)) {
          return false
        }
      }
      if (filters.endDateTo && sprint.end_date) {
        if (new Date(sprint.end_date) > new Date(filters.endDateTo)) {
          return false
        }
      }

      // Teams filter
      if (filters.teams.length > 0 && !filters.teams.includes(sprint.team_id)) {
        return false
      }

      // Projects filter
      if (filters.projects.length > 0 && !filters.projects.includes(sprint.project_id)) {
        return false
      }

      return true
    })
  }, [sprints, filters])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status.length > 0 ||
      filters.startDateFrom !== '' ||
      filters.startDateTo !== '' ||
      filters.endDateFrom !== '' ||
      filters.endDateTo !== '' ||
      filters.teams.length > 0 ||
      filters.projects.length > 0
    )
  }, [filters])

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = Date.now()

    if (now < start) return 0
    if (now > end) return 100

    const total = end - start
    const elapsed = now - start
    return Math.round((elapsed / total) * 100)
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const diff = end - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const handleOpenEditModal = (sprint: Sprint) => {
    setSelectedSprint(sprint)
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    setSelectedSprint(null)
  }

  const handleDeleteSprint = async (sprint: Sprint) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o sprint "${sprint.name}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('sprints').delete().eq('id', sprint.id)

      if (error) throw error

      toast.success('Sprint excluído com sucesso!')
      await fetchSprints()
    } catch (error) {
      console.error('Error deleting sprint:', error)
      toast.error('Erro ao excluir sprint')
    }
  }

  const handleOpenDetailsModal = (sprint: Sprint) => {
    setSelectedSprint(sprint)
    setDetailsModalOpen(true)
  }

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false)
    setSelectedSprint(null)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Sprints
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Planeje e acompanhe seus sprints de forma eficiente
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateModalOpen(true)}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              display: { xs: 'none', sm: 'flex' },
            }}
          >
            Novo Sprint
          </Button>
        </Box>

        {/* Filter Section */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            border: '2px solid',
            borderColor: hasActiveFilters ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
            borderRadius: 3,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Filter Header */}
          <Box
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              cursor: 'pointer',
              bgcolor: hasActiveFilters ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(99, 102, 241, 0.08)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FilterList sx={{ color: '#6366f1' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Filtros
              </Typography>
              {hasActiveFilters && (
                <Chip
                  label={`${filteredSprints.length} de ${sprints.length}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {hasActiveFilters && (
                <Button
                  size="small"
                  startIcon={<Clear />}
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFilters()
                  }}
                  sx={{
                    color: '#ef4444',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(239, 68, 68, 0.1)',
                    },
                  }}
                >
                  Limpar
                </Button>
              )}
              {filtersExpanded ? (
                <ExpandLess sx={{ color: 'text.secondary' }} />
              ) : (
                <ExpandMore sx={{ color: 'text.secondary' }} />
              )}
            </Box>
          </Box>

          {/* Filter Content */}
          <Collapse in={filtersExpanded}>
            <Box
              sx={{
                p: 3,
                pt: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {/* Row 1: Search and Status */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder="Buscar por nome do sprint..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: filters.search && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                            <Clear fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#6366f1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366f1',
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
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      input={<OutlinedInput label="Status" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={statusConfig[value]?.label || value}
                              size="small"
                              color={statusConfig[value]?.color || 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Box>
                      )}
                      sx={{
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
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

              {/* Row 2: Projects and Teams */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="projects-filter-label">Projetos</InputLabel>
                    <Select
                      labelId="projects-filter-label"
                      multiple
                      value={filters.projects}
                      onChange={(e) => handleFilterChange('projects', e.target.value)}
                      input={<OutlinedInput label="Projetos" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const project = projects.find((p) => p.id === value)
                            return (
                              <Chip
                                key={value}
                                label={project?.name || value}
                                size="small"
                                icon={<Assignment sx={{ fontSize: 16 }} />}
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  color: '#6366f1',
                                  '& .MuiChip-icon': { color: '#6366f1' },
                                }}
                              />
                            )
                          })}
                        </Box>
                      )}
                      sx={{
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                      }}
                    >
                      {projects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Assignment sx={{ fontSize: 20, color: '#6366f1' }} />
                            <Typography>{project.name}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="teams-filter-label">Times</InputLabel>
                    <Select
                      labelId="teams-filter-label"
                      multiple
                      value={filters.teams}
                      onChange={(e) => handleFilterChange('teams', e.target.value)}
                      input={<OutlinedInput label="Times" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const team = teams.find((t) => t.id === value)
                            return (
                              <Chip
                                key={value}
                                label={team?.name || value}
                                size="small"
                                icon={<Groups sx={{ fontSize: 16 }} />}
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: 'rgba(124, 58, 237, 0.1)',
                                  color: '#7c3aed',
                                  '& .MuiChip-icon': { color: '#7c3aed' },
                                }}
                              />
                            )
                          })}
                        </Box>
                      )}
                      sx={{
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                      }}
                    >
                      {teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Groups sx={{ fontSize: 20, color: '#7c3aed' }} />
                            <Typography>{team.name}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Row 3: Date Filters */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                  Data de Início
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="De"
                      value={filters.startDateFrom}
                      onChange={(e) => handleFilterChange('startDateFrom', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': { borderColor: '#6366f1' },
                          '&.Mui-focused fieldset': { borderColor: '#6366f1' },
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
                      onChange={(e) => handleFilterChange('startDateTo', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': { borderColor: '#6366f1' },
                          '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                  Data de Término
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="De"
                      value={filters.endDateFrom}
                      onChange={(e) => handleFilterChange('endDateFrom', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': { borderColor: '#6366f1' },
                          '&.Mui-focused fieldset': { borderColor: '#6366f1' },
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
                      onChange={(e) => handleFilterChange('endDateTo', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': { borderColor: '#6366f1' },
                          '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : filteredSprints.length === 0 && !hasActiveFilters ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
              px: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
              border: '2px dashed rgba(99, 102, 241, 0.2)',
            }}
          >
            <Timeline sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nenhum sprint criado ainda
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Crie sprints para organizar seu trabalho em iterações e alcançar seus objetivos
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
            >
              Criar Primeiro Sprint
            </Button>
          </Box>
        ) : filteredSprints.length === 0 && hasActiveFilters ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
              border: '2px dashed rgba(99, 102, 241, 0.2)',
            }}
          >
            <Search sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nenhum sprint encontrado
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Não encontramos sprints que correspondam aos filtros selecionados
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              sx={{
                px: 4,
                py: 1.5,
                borderWidth: 2,
                borderColor: '#6366f1',
                color: '#6366f1',
                fontWeight: 600,
                '&:hover': {
                  borderWidth: 2,
                  bgcolor: 'rgba(99, 102, 241, 0.05)',
                },
              }}
            >
              Limpar Filtros
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredSprints.map((sprint) => (
              <Grid item xs={12} md={6} lg={4} key={sprint.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '2px solid rgba(99, 102, 241, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      border: '2px solid rgba(99, 102, 241, 0.3)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
                        }}
                      >
                        <SpaceDashboard sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={statusConfig[sprint.status]?.label || sprint.status}
                          color={statusConfig[sprint.status]?.color || 'default'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        <Tooltip title="Editar Sprint">
                          <IconButton
                            onClick={() => handleOpenEditModal(sprint)}
                            sx={{
                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                              '&:hover': {
                                bgcolor: 'rgba(99, 102, 241, 0.2)',
                              },
                            }}
                          >
                            <Edit sx={{ color: '#6366f1' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir Sprint">
                          <IconButton
                            onClick={() => handleDeleteSprint(sprint)}
                            sx={{
                              bgcolor: 'rgba(239, 68, 68, 0.1)',
                              '&:hover': {
                                bgcolor: 'rgba(239, 68, 68, 0.2)',
                              },
                            }}
                          >
                            <Delete sx={{ color: '#ef4444' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 1 }}>
                      {sprint.name}
                    </Typography>

                    {sprint.goal && (
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Flag sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 40,
                          }}
                        >
                          {sprint.goal}
                        </Typography>
                      </Box>
                    )}

                    {sprint.status === 'active' && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Progresso do Período
                          </Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#6366f1' }}>
                            {calculateProgress(sprint.start_date, sprint.end_date)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={calculateProgress(sprint.start_date, sprint.end_date)}
                          sx={{
                            height: 8,
                            borderRadius: 10,
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                              borderRadius: 10,
                            },
                          }}
                        />
                      </Box>
                    )}

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                        pt: 2,
                        borderTop: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Início
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(sprint.start_date)}
                        </Typography>
                      </Box>

                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Término
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(sprint.end_date)}
                        </Typography>
                      </Box>
                    </Box>

                    {sprint.status === 'active' && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                      >
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Dias Restantes
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#6366f1' }}>
                          {getDaysRemaining(sprint.end_date)} dias
                        </Typography>
                      </Box>
                    )}

                    {sprint.velocity > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                        <Speed sx={{ fontSize: 18, color: '#6366f1' }} />
                        <Typography variant="body2" fontWeight={600}>
                          Velocity: {sprint.velocity} pontos
                        </Typography>
                      </Box>
                    )}

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ListAlt />}
                      onClick={() => handleOpenDetailsModal(sprint)}
                      sx={{
                        mt: 3,
                        py: 1.5,
                        borderRadius: 2,
                        borderWidth: 2,
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        color: '#6366f1',
                        fontWeight: 600,
                        '&:hover': {
                          borderWidth: 2,
                          borderColor: '#6366f1',
                          backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        },
                      }}
                    >
                      Gerenciar Histórias
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Fab
          color="primary"
          onClick={() => setCreateModalOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            display: { xs: 'flex', sm: 'none' },
            width: 64,
            height: 64,
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Add sx={{ fontSize: 32 }} />
        </Fab>
      </Container>

      <CreateSprintModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchSprints}
      />

      {selectedSprint && (
        <EditSprintModal
          open={editModalOpen}
          onClose={handleCloseEditModal}
          onSuccess={fetchSprints}
          sprint={selectedSprint}
        />
      )}

      {selectedSprint && (
        <SprintDetailsModal
          open={detailsModalOpen}
          onClose={handleCloseDetailsModal}
          sprint={{
            id: selectedSprint.id,
            name: selectedSprint.name,
            project_id: selectedSprint.project_id,
            team_id: selectedSprint.team_id,
            start_date: selectedSprint.start_date,
            end_date: selectedSprint.end_date,
          }}
        />
      )}
    </Box>
  )
}
