import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  Grid,
} from '@mui/material'
import {
  Add,
  SpaceDashboard,
  CalendarToday,
  TrendingUp,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { useProjectContext } from './ProjectDetail'
import SprintDetailsModal from '@/components/SprintDetailsModal'
import CreateSprintModal from '@/components/CreateSprintModal'
import BurndownChart from '@/components/BurndownChart'
import VelocityChart from '@/components/VelocityChart'
import { supabase } from '@/lib/supabase'

interface Sprint {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
  velocity: number
  team_id: string
  goal?: string
}

interface SprintStats {
  totalStories: number
  completedStories: number
  totalPoints: number
  completedPoints: number
}

const sprintStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planejamento', color: '#6b7280' },
  active: { label: 'Ativo', color: '#10b981' },
  completed: { label: 'Concluído', color: '#6366f1' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
}

export default function SprintsView() {
  const { project } = useProjectContext()
  const [loading, setLoading] = useState(true)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [sprintStats, setSprintStats] = useState<Record<string, SprintStats>>({})
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const [sprintDetailsOpen, setSprintDetailsOpen] = useState(false)
  const [createSprintOpen, setCreateSprintOpen] = useState(false)
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [activeSprintStories, setActiveSprintStories] = useState<any[]>([])

  useEffect(() => {
    if (project?.id) {
      fetchSprints()
    }
  }, [project?.id])

  const fetchSprints = async () => {
    setLoading(true)
    try {
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, name, status, start_date, end_date, velocity, team_id, goal')
        .eq('project_id', project.id)
        .order('start_date', { ascending: false })

      if (sprintsError) throw sprintsError

      setSprints(sprintsData || [])

      // Find active sprint
      const active = (sprintsData || []).find(s => s.status === 'active')
      setActiveSprint(active || null)

      // Fetch stats for each sprint
      const stats: Record<string, SprintStats> = {}
      for (const sprint of sprintsData || []) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status, story_points')
          .eq('sprint_id', sprint.id)

        const totalStories = tasks?.length || 0
        const completedStories = tasks?.filter(t => t.status === 'done').length || 0
        const totalPoints = tasks?.reduce((sum, t) => sum + (t.story_points || 0), 0) || 0
        const completedPoints = tasks?.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.story_points || 0), 0) || 0

        stats[sprint.id] = { totalStories, completedStories, totalPoints, completedPoints }
      }
      setSprintStats(stats)

      // Fetch stories for active sprint (for charts)
      if (active) {
        const { data: stories } = await supabase
          .from('tasks')
          .select('*')
          .eq('sprint_id', active.id)
        setActiveSprintStories(stories || [])
      }
    } catch (error) {
      console.error('Error fetching sprints:', error)
      toast.error('Erro ao carregar sprints')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const handleOpenSprintDetails = (sprint: Sprint) => {
    setSelectedSprint(sprint)
    setSprintDetailsOpen(true)
  }

  const handleCloseSprintDetails = () => {
    setSprintDetailsOpen(false)
    setSelectedSprint(null)
    fetchSprints() // Refresh data after closing modal
  }

  const calculateProgress = (sprintId: string) => {
    const stats = sprintStats[sprintId]
    if (!stats || stats.totalPoints === 0) return 0
    return Math.round((stats.completedPoints / stats.totalPoints) * 100)
  }

  const getTotalStats = () => {
    const totalSprints = sprints.length
    const activeSprints = sprints.filter(s => s.status === 'active').length
    const completedSprints = sprints.filter(s => s.status === 'completed').length
    const totalVelocity = sprints.reduce((sum, s) => sum + (s.velocity || 0), 0)
    const avgVelocity = completedSprints > 0 ? Math.round(totalVelocity / completedSprints) : 0

    return { totalSprints, activeSprints, completedSprints, avgVelocity }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  const totalStats = getTotalStats()

  return (
    <Box>
      {/* Statistics Header */}
      <Box
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '2px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Sprints do Projeto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} encontrado{sprints.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateSprintOpen(true)}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
              },
            }}
          >
            Novo Sprint
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Total de Sprints
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
              {totalStats.totalSprints}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Sprints Ativos
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981' }}>
              {totalStats.activeSprints}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Concluídos
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#8b5cf6' }}>
              {totalStats.completedSprints}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Velocity Médio
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#f59e0b' }}>
              {totalStats.avgVelocity} pts
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Active Sprint Charts */}
      {activeSprint && activeSprintStories.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
            Analytics - {activeSprint.name}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <BurndownChart
                sprint={{
                  start_date: activeSprint.start_date,
                  end_date: activeSprint.end_date,
                }}
                stories={activeSprintStories}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <VelocityChart teamId={activeSprint.team_id} currentSprintId={activeSprint.id} />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Sprints List */}
      {sprints.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            borderRadius: 3,
            bgcolor: 'rgba(99, 102, 241, 0.05)',
            border: '2px dashed rgba(99, 102, 241, 0.2)',
          }}
        >
          <SpaceDashboard sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Nenhum sprint criado ainda
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crie o primeiro sprint para este projeto
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setCreateSprintOpen(true)}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              borderWidth: 2,
              borderColor: '#6366f1',
              color: '#6366f1',
              fontWeight: 600,
              '&:hover': {
                borderWidth: 2,
                borderColor: '#6366f1',
                bgcolor: 'rgba(99, 102, 241, 0.05)',
              },
            }}
          >
            Criar Primeiro Sprint
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {sprints.map((sprint) => {
            const stats = sprintStats[sprint.id] || { totalStories: 0, completedStories: 0, totalPoints: 0, completedPoints: 0 }
            const progress = calculateProgress(sprint.id)
            const statusInfo = sprintStatusConfig[sprint.status] || sprintStatusConfig.planning

            return (
              <Card
                key={sprint.id}
                elevation={0}
                onClick={() => handleOpenSprintDetails(sprint)}
                sx={{
                  border: sprint.status === 'active'
                    ? '2px solid rgba(16, 185, 129, 0.4)'
                    : '2px solid rgba(99, 102, 241, 0.1)',
                  borderRadius: 3,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  bgcolor: sprint.status === 'active' ? 'rgba(16, 185, 129, 0.02)' : 'background.paper',
                  '&:hover': {
                    border: sprint.status === 'active'
                      ? '2px solid rgba(16, 185, 129, 0.6)'
                      : '2px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Typography variant="h6" fontWeight={700}>
                          {sprint.name}
                        </Typography>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          sx={{
                            bgcolor: `${statusInfo.color}20`,
                            color: statusInfo.color,
                            fontWeight: 600,
                          }}
                        />
                      </Box>

                      {sprint.goal && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          {sprint.goal}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SpaceDashboard sx={{ fontSize: 14, color: '#6366f1' }} />
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#6366f1' }}>
                            {stats.completedStories}/{stats.totalStories} histórias
                          </Typography>
                        </Box>

                        {sprint.velocity > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TrendingUp sx={{ fontSize: 14, color: '#10b981' }} />
                            <Typography variant="caption" fontWeight={600} sx={{ color: '#10b981' }}>
                              Velocity: {sprint.velocity}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                      <Typography variant="h4" fontWeight={800} sx={{ color: statusInfo.color }}>
                        {progress}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.completedPoints}/{stats.totalPoints} pts
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${statusInfo.color}15`,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: statusInfo.color,
                        borderRadius: 4,
                      },
                    }}
                  />
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}

      {/* Sprint Details Modal */}
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

      {/* Create Sprint Modal */}
      <CreateSprintModal
        open={createSprintOpen}
        onClose={() => setCreateSprintOpen(false)}
        onSuccess={() => {
          setCreateSprintOpen(false)
          fetchSprints()
        }}
        defaultProjectId={project.id}
      />
    </Box>
  )
}
