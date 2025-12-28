import { useState, useEffect } from 'react'
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
  AvatarGroup,
  Grid,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material'
import {
  CalendarToday,
  Assignment,
  TrendingUp,
  CheckCircle,
  Inventory,
  SpaceDashboard,
  Add,
  Edit,
  Person,
  Flag,
  Functions,
} from '@mui/icons-material'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ProjectDetailsModalProps {
  open: boolean
  onClose: () => void
  project: {
    id: string
    name: string
    description: string
    status: string
    start_date: string
    end_date: string
  }
}

interface Sprint {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
  velocity: number
  team_id: string
}

interface BacklogItem {
  id: string
  title: string
  status: string
  priority: string
  story_points: number
  assigned_to_profile?: { full_name: string }
}

interface TeamMember {
  id: string
  full_name: string
  avatar_url?: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'A Fazer', color: '#6b7280' },
  'in-progress': { label: 'Em Progresso', color: '#f59e0b' },
  review: { label: 'Em Revisão', color: '#8b5cf6' },
  done: { label: 'Concluído', color: '#10b981' },
  blocked: { label: 'Bloqueado', color: '#ef4444' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#6b7280' },
  medium: { label: 'Média', color: '#f59e0b' },
  high: { label: 'Alta', color: '#ef4444' },
  urgent: { label: 'Urgente', color: '#dc2626' },
}

const sprintStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planejamento', color: '#6b7280' },
  active: { label: 'Ativo', color: '#10b981' },
  completed: { label: 'Concluído', color: '#6366f1' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
}

export default function ProjectDetailsModal({ open, onClose, project }: ProjectDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [statistics, setStatistics] = useState({
    totalBacklogItems: 0,
    totalSprints: 0,
    activeSprints: 0,
    completedSprints: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
  })

  useEffect(() => {
    if (open) {
      fetchProjectDetails()
    }
  }, [open, project.id])

  const fetchProjectDetails = async () => {
    setLoading(true)
    try {
      // Fetch all data in parallel
      const [sprintsRes, backlogRes, statsRes] = await Promise.all([
        // Fetch sprints
        supabase
          .from('sprints')
          .select('id, name, status, start_date, end_date, velocity, team_id')
          .eq('project_id', project.id)
          .order('start_date', { ascending: false }),

        // Fetch backlog items (tasks not in a sprint)
        supabase
          .from('tasks')
          .select('id, title, status, priority, story_points, assigned_to_profile:profiles!assigned_to(full_name)')
          .eq('project_id', project.id)
          .is('sprint_id', null)
          .order('created_at', { ascending: false }),

        // Fetch all tasks for statistics
        supabase
          .from('tasks')
          .select('id, status, story_points')
          .eq('project_id', project.id),
      ])

      if (sprintsRes.error) throw sprintsRes.error
      if (backlogRes.error) throw backlogRes.error
      if (statsRes.error) throw statsRes.error

      setSprints(sprintsRes.data || [])
      setBacklogItems(backlogRes.data || [])

      // Get unique team members from sprints
      const uniqueTeamIds = [...new Set((sprintsRes.data || []).map((s) => s.team_id).filter(Boolean))]
      if (uniqueTeamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('team_members')
          .select('user_profile:profiles!user_id(id, full_name, avatar_url)')
          .in('team_id', uniqueTeamIds)

        const uniqueMembers = teamsData
          ?.map((tm: any) => tm.user_profile)
          .filter((m: any) => m)
          .reduce((acc: TeamMember[], curr: TeamMember) => {
            if (!acc.find((m) => m.id === curr.id)) {
              acc.push(curr)
            }
            return acc
          }, [])

        setTeamMembers(uniqueMembers || [])
      }

      // Calculate statistics
      const allTasks = statsRes.data || []
      const activeSprints = (sprintsRes.data || []).filter((s) => s.status === 'active').length
      const completedSprints = (sprintsRes.data || []).filter((s) => s.status === 'completed').length
      const totalStoryPoints = allTasks.reduce((sum, task) => sum + (task.story_points || 0), 0)
      const completedStoryPoints = allTasks
        .filter((task) => task.status === 'done')
        .reduce((sum, task) => sum + (task.story_points || 0), 0)

      setStatistics({
        totalBacklogItems: (backlogRes.data || []).length,
        totalSprints: (sprintsRes.data || []).length,
        activeSprints,
        completedSprints,
        totalStoryPoints,
        completedStoryPoints,
      })
    } catch (error) {
      console.error('Error fetching project details:', error)
      toast.error('Erro ao carregar detalhes do projeto')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const calculateProgress = () => {
    if (statistics.totalStoryPoints === 0) return 0
    return Math.round((statistics.completedStoryPoints / statistics.totalStoryPoints) * 100)
  }

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title={project.name} maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={project.name} maxWidth="lg">
      <Box>
        {/* Project Overview Header */}
        <Card
          elevation={0}
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.1)',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description || 'Sem descrição'}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Início
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarToday sx={{ fontSize: 14, color: '#6366f1' }} />
                      <Typography variant="body2" fontWeight={600}>
                        {formatDate(project.start_date)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Término
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarToday sx={{ fontSize: 14, color: '#6366f1' }} />
                      <Typography variant="body2" fontWeight={600}>
                        {formatDate(project.end_date)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {teamMembers.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                      Membros do Time
                    </Typography>
                    <AvatarGroup max={5}>
                      {teamMembers.map((member) => (
                        <Tooltip key={member.id} title={member.full_name}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: '#6366f1',
                              fontSize: '0.875rem',
                            }}
                          >
                            {member.full_name?.charAt(0) || 'U'}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'white',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TrendingUp sx={{ fontSize: 20, color: '#6366f1' }} />
                      <Typography variant="body2" fontWeight={600}>
                        Progresso Geral
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#6366f1', mb: 1 }}>
                      {calculateProgress()}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress()}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#6366f1',
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {statistics.completedStoryPoints} / {statistics.totalStoryPoints} story points
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box
                      sx={{
                        flex: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#10b981' }}>
                        {statistics.activeSprints}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Sprints Ativos
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#f59e0b' }}>
                        {statistics.totalBacklogItems}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        No Backlog
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Sprints" icon={<SpaceDashboard />} iconPosition="start" />
            <Tab label="Backlog" icon={<Inventory />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <Box>
            {sprints.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                  px: 3,
                  borderRadius: 3,
                  bgcolor: 'rgba(99, 102, 241, 0.05)',
                  border: '2px dashed rgba(99, 102, 241, 0.2)',
                }}
              >
                <SpaceDashboard sx={{ fontSize: 60, color: '#6366f1', opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Nenhum sprint criado ainda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Este projeto ainda não possui sprints
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {sprints.map((sprint) => (
                  <Card
                    key={sprint.id}
                    elevation={0}
                    sx={{
                      border: '2px solid rgba(99, 102, 241, 0.1)',
                      borderRadius: 3,
                      transition: 'all 0.2s',
                      '&:hover': {
                        border: '2px solid rgba(99, 102, 241, 0.3)',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            {sprint.name}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                              label={sprintStatusConfig[sprint.status]?.label || sprint.status}
                              size="small"
                              sx={{
                                bgcolor: `${sprintStatusConfig[sprint.status]?.color}20`,
                                color: sprintStatusConfig[sprint.status]?.color,
                                fontWeight: 600,
                              }}
                            />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                              </Typography>
                            </Box>

                            {sprint.velocity > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TrendingUp sx={{ fontSize: 14, color: '#6366f1' }} />
                                <Typography variant="caption" fontWeight={600} sx={{ color: '#6366f1' }}>
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
            {backlogItems.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                  px: 3,
                  borderRadius: 3,
                  bgcolor: 'rgba(245, 158, 11, 0.05)',
                  border: '2px dashed rgba(245, 158, 11, 0.2)',
                }}
              >
                <Inventory sx={{ fontSize: 60, color: '#f59e0b', opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Backlog vazio
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Não há itens no backlog para este projeto
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {backlogItems.map((item) => (
                  <Card
                    key={item.id}
                    elevation={0}
                    sx={{
                      border: '2px solid rgba(99, 102, 241, 0.1)',
                      borderRadius: 3,
                      transition: 'all 0.2s',
                      '&:hover': {
                        border: '2px solid rgba(99, 102, 241, 0.3)',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight={600} gutterBottom>
                            {item.title}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={statusConfig[item.status]?.label || item.status}
                              size="small"
                              sx={{
                                bgcolor: `${statusConfig[item.status]?.color}20`,
                                color: statusConfig[item.status]?.color,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />

                            <Chip
                              label={priorityConfig[item.priority]?.label || item.priority}
                              size="small"
                              icon={<Flag sx={{ fontSize: 14 }} />}
                              sx={{
                                bgcolor: `${priorityConfig[item.priority]?.color}20`,
                                color: priorityConfig[item.priority]?.color,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />

                            {item.story_points > 0 && (
                              <Chip
                                label={`${item.story_points} pts`}
                                size="small"
                                icon={<Functions sx={{ fontSize: 14 }} />}
                                sx={{
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  color: '#6366f1',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            )}

                            {item.assigned_to_profile?.full_name && (
                              <Chip
                                label={item.assigned_to_profile.full_name}
                                size="small"
                                icon={<Person sx={{ fontSize: 14 }} />}
                                sx={{
                                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10b981',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
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
    </Modal>
  )
}
