import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material'
import {
  Assignment,
  CalendarToday,
  Schedule,
  Groups,
} from '@mui/icons-material'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface TeamProjectsModalProps {
  open: boolean
  onClose: () => void
  team: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  start_date: string
  end_date: string
  completed_tasks: number
  total_tasks: number
  sprints_count: number
  team_members: TeamMember[]
}

interface TeamMember {
  id: string
  full_name: string
  role: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planejamento', color: '#f59e0b' },
  active: { label: 'Ativo', color: '#10b981' },
  completed: { label: 'Concluído', color: '#6366f1' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
  on_hold: { label: 'Em Espera', color: '#6b7280' },
}

export default function TeamProjectsModal({
  open,
  onClose,
  team,
}: TeamProjectsModalProps) {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    if (open && team.id) {
      fetchTeamProjects()
    }
  }, [open, team.id])

  const fetchTeamProjects = async () => {
    setLoading(true)
    try {
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, role, user_profile:profiles!user_id(id, full_name)')
        .eq('team_id', team.id)

      if (membersError) throw membersError

      const members = (membersData || []).map((m) => {
        const profile = Array.isArray(m.user_profile) ? m.user_profile[0] : m.user_profile
        return {
          id: profile?.id || m.user_id,
          full_name: profile?.full_name || 'Sem nome',
          role: m.role,
        }
      })
      setTeamMembers(members)

      // Fetch sprints for this team to get project IDs
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('project_id')
        .eq('team_id', team.id)

      if (sprintsError) throw sprintsError

      // Get unique project IDs
      const projectIds = [...new Set((sprintsData || []).map((s) => s.project_id).filter(Boolean))]

      if (projectIds.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, status, start_date, end_date')
        .in('id', projectIds)
        .order('name')

      if (projectsError) throw projectsError

      // Fetch task counts and sprint counts for each project
      const projectsWithDetails = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get tasks for this project
          const { data: tasks } = await supabase
            .from('tasks')
            .select('status')
            .eq('project_id', project.id)

          const completed = tasks?.filter((t) => t.status === 'done').length || 0
          const total = tasks?.length || 0

          // Get sprints count for this team on this project
          const { count: sprintsCount } = await supabase
            .from('sprints')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('team_id', team.id)

          return {
            id: project.id,
            name: project.name,
            description: project.description || '',
            status: project.status,
            start_date: project.start_date,
            end_date: project.end_date,
            completed_tasks: completed,
            total_tasks: total,
            sprints_count: sprintsCount || 0,
            team_members: members,
          }
        })
      )

      setProjects(projectsWithDetails)
    } catch (error) {
      console.error('Error fetching team projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return null
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const diff = end - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: '#6b7280' }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      product_owner: '#6366f1',
      scrum_master: '#8b5cf6',
      developer: '#10b981',
      member: '#6b7280',
    }
    return colors[role] || '#6b7280'
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Projetos do Time - ${team.name}`}
      maxWidth="lg"
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={50} />
        </Box>
      ) : (
        <Box>
          {/* Team Members Summary */}
          {teamMembers.length > 0 && (
            <Box
              sx={{
                mb: 4,
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '2px solid rgba(99, 102, 241, 0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Groups sx={{ color: '#6366f1' }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Membros do Time ({teamMembers.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {teamMembers.map((member) => (
                  <Chip
                    key={member.id}
                    avatar={
                      <Avatar sx={{ bgcolor: getRoleColor(member.role) }}>
                        {member.full_name?.charAt(0) || 'U'}
                      </Avatar>
                    }
                    label={member.full_name}
                    sx={{
                      bgcolor: 'white',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Projects */}
          {projects.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                borderRadius: 3,
                bgcolor: 'rgba(99, 102, 241, 0.03)',
                border: '2px dashed rgba(99, 102, 241, 0.2)',
              }}
            >
              <Assignment sx={{ fontSize: 60, color: '#6366f1', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Nenhum projeto encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Este time ainda não está associado a nenhum projeto através de sprints
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {projects.map((project) => {
                const statusCfg = getStatusConfig(project.status)
                const progress = calculateProgress(project.completed_tasks, project.total_tasks)
                const daysRemaining = getDaysRemaining(project.end_date)

                return (
                  <Grid item xs={12} md={6} key={project.id}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        border: '2px solid rgba(99, 102, 241, 0.1)',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.12)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            }}
                          >
                            <Assignment sx={{ color: 'white', fontSize: 22 }} />
                          </Box>
                          <Chip
                            label={statusCfg.label}
                            size="small"
                            sx={{
                              bgcolor: `${statusCfg.color}15`,
                              color: statusCfg.color,
                              fontWeight: 600,
                            }}
                          />
                        </Box>

                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {project.name}
                        </Typography>

                        {project.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minHeight: 40,
                            }}
                          >
                            {project.description}
                          </Typography>
                        )}

                        {/* Progress */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                              Progresso
                            </Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#6366f1' }}>
                              {progress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              height: 6,
                              borderRadius: 10,
                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                                borderRadius: 10,
                              },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {project.completed_tasks} de {project.total_tasks} tarefas concluídas
                          </Typography>
                        </Box>

                        {/* Stats */}
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 2,
                            pt: 2,
                            borderTop: '1px solid rgba(0,0,0,0.05)',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Término
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatDate(project.end_date)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Sprints
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {project.sprints_count} sprint{project.sprints_count !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Days Remaining Badge */}
                        {daysRemaining !== null && project.status === 'active' && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: daysRemaining < 0
                                ? 'rgba(239, 68, 68, 0.1)'
                                : daysRemaining <= 7
                                  ? 'rgba(245, 158, 11, 0.1)'
                                  : 'rgba(99, 102, 241, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 1,
                            }}
                          >
                            {daysRemaining < 0 ? (
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: '#ef4444' }}
                              >
                                Atrasado por {Math.abs(daysRemaining)} dias
                              </Typography>
                            ) : daysRemaining === 0 ? (
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: '#f59e0b' }}
                              >
                                Vence hoje!
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: daysRemaining <= 7 ? '#f59e0b' : '#6366f1' }}
                              >
                                {daysRemaining} dias restantes
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Box>
      )}
    </Modal>
  )
}
