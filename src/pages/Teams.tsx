import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Fab,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Collapse,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  useTheme,
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
} from '@mui/material'
import {
  Add,
  People,
  Groups,
  Edit,
  Delete,
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  ViewModule,
  ViewList,
  CalendarToday,
  ChevronRight,
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import CreateTeamModal from '@/components/CreateTeamModal'
import EditTeamModal from '@/components/EditTeamModal'
import TeamProjectsModal from '@/components/TeamProjectsModal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Team {
  id: string
  name: string
  description: string
  created_at: string
  team_members?: { count: number }[]
}

interface Member {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface Filters {
  search: string
  members: string[]
  projects: string[]
  createdDateFrom: string
  createdDateTo: string
}

const initialFilters: Filters = {
  search: '',
  members: [],
  projects: [],
  createdDateFrom: '',
  createdDateTo: '',
}

const VIEW_MODE_STORAGE_KEY = 'teams-view-mode'

const getStoredViewMode = (): 'card' | 'list' => {
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  if (stored === 'card' || stored === 'list') {
    return stored
  }
  return 'card'
}

export default function Teams() {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [projectsModalOpen, setProjectsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>(getStoredViewMode)
  const [currentPage, setCurrentPage] = useState(1)
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, string[]>>({})
  const [teamProjectsMap, setTeamProjectsMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      // Fetch teams
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(count)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTeams(data || [])

      // Fetch all team members with their profiles for the filter
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('team_id, user_id, user_profile:profiles!user_id(id, full_name)')

      if (teamMembersError) throw teamMembersError

      // Build unique members list and team-members mapping
      const membersSet = new Map<string, string>()
      const membersMapping: Record<string, string[]> = {}

      teamMembersData?.forEach((tm) => {
        // Supabase returns the joined relation - handle both array and object cases
        const profileData = tm.user_profile
        const profile = Array.isArray(profileData) ? profileData[0] : profileData
        if (profile) {
          membersSet.set(profile.id, profile.full_name || 'Sem nome')
          if (!membersMapping[tm.team_id]) {
            membersMapping[tm.team_id] = []
          }
          membersMapping[tm.team_id].push(profile.id)
        }
      })

      const membersList: Member[] = Array.from(membersSet.entries()).map(([id, name]) => ({ id, name }))
      membersList.sort((a, b) => a.name.localeCompare(b.name))
      setAllMembers(membersList)
      setTeamMembersMap(membersMapping)

      // Fetch all sprints to get team-project relationships
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('team_id, project_id, projects(id, name)')

      if (sprintsError) throw sprintsError

      // Build unique projects list and team-projects mapping
      const projectsSet = new Map<string, string>()
      const projectsMapping: Record<string, string[]> = {}

      sprintsData?.forEach((sprint) => {
        // Supabase returns the joined relation - handle both array and object cases
        const projectData = sprint.projects
        const project = Array.isArray(projectData) ? projectData[0] : projectData
        if (project && sprint.team_id) {
          projectsSet.set(project.id, project.name)
          if (!projectsMapping[sprint.team_id]) {
            projectsMapping[sprint.team_id] = []
          }
          if (!projectsMapping[sprint.team_id].includes(project.id)) {
            projectsMapping[sprint.team_id].push(project.id)
          }
        }
      })

      const projectsList: Project[] = Array.from(projectsSet.entries()).map(([id, name]) => ({ id, name }))
      projectsList.sort((a, b) => a.name.localeCompare(b.name))
      setAllProjects(projectsList)
      setTeamProjectsMap(projectsMapping)
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Erro ao carregar times')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditModal = (team: Team) => {
    setSelectedTeam({ id: team.id, name: team.name })
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    setSelectedTeam(null)
  }

  const handleOpenProjectsModal = (team: Team) => {
    setSelectedTeam({ id: team.id, name: team.name })
    setProjectsModalOpen(true)
  }

  const handleCloseProjectsModal = () => {
    setProjectsModalOpen(false)
    setSelectedTeam(null)
  }

  const handleDeleteTeam = async (team: Team) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o time "${team.name}"?\n\nTodos os membros e sprints associados serão afetados. Esta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('teams').delete().eq('id', team.id)

      if (error) throw error

      toast.success('Time excluído com sucesso!')
      await fetchTeams()
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Erro ao excluir time')
    }
  }

  const getMemberCount = (team: Team) => {
    return team.team_members?.[0]?.count || 0
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Filter logic
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      // Search filter (name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!team.name.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Members filter - team must have at least one of the selected members
      if (filters.members.length > 0) {
        const teamMembers = teamMembersMap[team.id] || []
        const hasMatchingMember = filters.members.some((memberId) => teamMembers.includes(memberId))
        if (!hasMatchingMember) {
          return false
        }
      }

      // Projects filter - team must be linked to at least one of the selected projects
      if (filters.projects.length > 0) {
        const teamProjects = teamProjectsMap[team.id] || []
        const hasMatchingProject = filters.projects.some((projectId) => teamProjects.includes(projectId))
        if (!hasMatchingProject) {
          return false
        }
      }

      // Created date range filter
      if (filters.createdDateFrom && team.created_at) {
        if (new Date(team.created_at) < new Date(filters.createdDateFrom)) {
          return false
        }
      }
      if (filters.createdDateTo && team.created_at) {
        if (new Date(team.created_at) > new Date(filters.createdDateTo)) {
          return false
        }
      }

      return true
    })
  }, [teams, filters, teamMembersMap, teamProjectsMap])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.members.length > 0 ||
      filters.projects.length > 0 ||
      filters.createdDateFrom !== '' ||
      filters.createdDateTo !== ''
    )
  }, [filters])

  const clearFilters = () => {
    setFilters(initialFilters)
    setCurrentPage(1)
  }

  const handleFilterChange = (field: keyof Filters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'card' | 'list' | null,
  ) => {
    if (newMode !== null) {
      setViewMode(newMode)
      setCurrentPage(1)
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode)
    }
  }

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
  }

  const ITEMS_PER_PAGE_CARD = 9
  const ITEMS_PER_PAGE_LIST = 10
  const itemsPerPage = viewMode === 'card' ? ITEMS_PER_PAGE_CARD : ITEMS_PER_PAGE_LIST
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage)

  const paginatedTeams = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTeams.slice(startIndex, endIndex)
  }, [filteredTeams, currentPage, itemsPerPage])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Times
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Organize e gerencie seus times de desenvolvimento
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
            Novo Time
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
                  label={`${filteredTeams.length} de ${teams.length}`}
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
              {/* Row 1: Search */}
              <TextField
                fullWidth
                placeholder="Buscar por nome do time..."
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

              {/* Row 2: Members and Projects Filters */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel
                      id="members-filter-label"
                      sx={{
                        '&.Mui-focused': { color: '#6366f1' },
                      }}
                    >
                      Membros
                    </InputLabel>
                    <Select
                      labelId="members-filter-label"
                      multiple
                      value={filters.members}
                      onChange={(e) => handleFilterChange('members', e.target.value as string[])}
                      input={<OutlinedInput label="Membros" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => {
                            const member = allMembers.find((m) => m.id === value)
                            return (
                              <Chip
                                key={value}
                                label={member?.name || value}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  color: '#6366f1',
                                  fontWeight: 600,
                                }}
                              />
                            )
                          })}
                        </Box>
                      )}
                      sx={{
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                      }}
                    >
                      {allMembers.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                          {member.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel
                      id="projects-filter-label"
                      sx={{
                        '&.Mui-focused': { color: '#6366f1' },
                      }}
                    >
                      Projetos
                    </InputLabel>
                    <Select
                      labelId="projects-filter-label"
                      multiple
                      value={filters.projects}
                      onChange={(e) => handleFilterChange('projects', e.target.value as string[])}
                      input={<OutlinedInput label="Projetos" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => {
                            const project = allProjects.find((p) => p.id === value)
                            return (
                              <Chip
                                key={value}
                                label={project?.name || value}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(124, 58, 237, 0.1)',
                                  color: '#7c3aed',
                                  fontWeight: 600,
                                }}
                              />
                            )
                          })}
                        </Box>
                      )}
                      sx={{
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                      }}
                    >
                      {allProjects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Row 3: Creation Date Filter */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                  Data de Criação
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="De"
                      value={filters.createdDateFrom}
                      onChange={(e) => handleFilterChange('createdDateFrom', e.target.value)}
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
                      value={filters.createdDateTo}
                      onChange={(e) => handleFilterChange('createdDateTo', e.target.value)}
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

        {/* View Toggle and Results Info */}
        {!loading && filteredTeams.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Mostrando {paginatedTeams.length} de {filteredTeams.length} time
              {filteredTeams.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="modo de visualização"
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 2,
                  px: 2,
                  py: 0.75,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    borderColor: '#6366f1',
                    color: '#6366f1',
                    '&:hover': {
                      bgcolor: 'rgba(99, 102, 241, 0.15)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.05)',
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : filteredTeams.length === 0 && !hasActiveFilters ? (
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
            <Groups sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nenhum time criado ainda
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Crie times para organizar seus membros e gerenciar sprints de forma eficiente
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
            >
              Criar Primeiro Time
            </Button>
          </Box>
        ) : filteredTeams.length === 0 && hasActiveFilters ? (
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
              Nenhum time encontrado
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Não encontramos times que correspondam aos filtros selecionados
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
          <>
            {/* Card View */}
            {viewMode === 'card' && (
              <Grid container spacing={3}>
                {paginatedTeams.map((team) => (
                  <Grid item xs={12} md={6} lg={4} key={team.id}>
                    <Card
                      elevation={0}
                      onClick={() => handleOpenProjectsModal(team)}
                      sx={{
                        height: '100%',
                        background: isDarkMode
                          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '2px solid rgba(99, 102, 241, 0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: isDarkMode
                            ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
                            <People sx={{ color: 'white', fontSize: 24 }} />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Editar Time">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEditModal(team)
                                }}
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
                            <Tooltip title="Excluir Time">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTeam(team)
                                }}
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
                          {team.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 40,
                          }}
                        >
                          {team.description || 'Sem descrição'}
                        </Typography>

                        <Box
                          sx={{
                            display: 'flex',
                            gap: 2,
                            pt: 2,
                            borderTop: '1px solid',
                            borderColor: 'rgba(0, 0, 0, 0.05)',
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                              Membros
                            </Typography>
                            <Typography variant="h6" fontWeight={700} sx={{ color: '#6366f1' }}>
                              {getMemberCount(team)}
                            </Typography>
                          </Box>

                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                              Criado em
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(team.created_at)}
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
            {viewMode === 'list' && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: '2px solid rgba(99, 102, 241, 0.1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.875rem', py: 2 }}>
                        Time
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.875rem', py: 2, display: { xs: 'none', sm: 'table-cell' } }}>
                        Membros
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.875rem', py: 2, display: { xs: 'none', md: 'table-cell' } }}>
                        Criado em
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.875rem', py: 2 }}>
                        Ações
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTeams.map((team, index) => (
                      <TableRow
                        key={team.id}
                        onClick={() => handleOpenProjectsModal(team)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: index % 2 === 0 ? 'transparent' : 'rgba(99, 102, 241, 0.02)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha('#6366f1', 0.08),
                            '& .row-arrow': {
                              opacity: 1,
                              transform: 'translateX(0)',
                            },
                          },
                          '&:last-child td': {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell sx={{ py: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 8px rgba(99, 102, 241, 0.25)',
                                flexShrink: 0,
                              }}
                            >
                              <People sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                fontWeight={600}
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              >
                                {team.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {team.description || 'Sem descrição'}
                              </Typography>
                            </Box>
                            <ChevronRight
                              className="row-arrow"
                              sx={{
                                color: '#6366f1',
                                opacity: 0,
                                transform: 'translateX(-8px)',
                                transition: 'all 0.2s ease',
                                ml: 'auto',
                                display: { xs: 'none', sm: 'block' },
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2.5, display: { xs: 'none', sm: 'table-cell' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={500}>
                              {getMemberCount(team)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2.5, display: { xs: 'none', md: 'table-cell' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(team.created_at)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2.5 }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="Editar Time">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEditModal(team)
                                }}
                                sx={{
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                                }}
                              >
                                <Edit sx={{ color: '#6366f1', fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir Time">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTeam(team)
                                }}
                                sx={{
                                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' },
                                }}
                              >
                                <Delete sx={{ color: '#ef4444', fontSize: 18 }} />
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
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5558e3 0%, #7c4fe0 100%)',
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

      <CreateTeamModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchTeams}
      />

      {selectedTeam && (
        <EditTeamModal
          open={editModalOpen}
          onClose={handleCloseEditModal}
          onSuccess={fetchTeams}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
        />
      )}

      {selectedTeam && (
        <TeamProjectsModal
          open={projectsModalOpen}
          onClose={handleCloseProjectsModal}
          team={selectedTeam}
        />
      )}
    </Box>
  )
}
