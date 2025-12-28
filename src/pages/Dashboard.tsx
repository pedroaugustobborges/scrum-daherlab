import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress,
} from '@mui/material'
import { TrendingUp, Assignment } from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import ActiveSprintsWidget from '@/components/ActiveSprintsWidget'
import TeamMetricsWidget from '@/components/TeamMetricsWidget'
import ActionItemsWidget from '@/components/ActionItemsWidget'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  subtitle?: string
  progress?: number
}

function StatCard({ title, value, icon, color, subtitle, progress }: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`,
        border: `2px solid ${color}20`,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={600}
              gutterBottom
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mb: 0.5,
                background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 8px 16px ${color}40`,
              transform: 'rotate(-5deg)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'rotate(0deg) scale(1.05)',
              },
            }}
          >
            {icon}
          </Box>
        </Box>
        {progress !== undefined && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Progresso
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: color }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 10,
                backgroundColor: `${color}15`,
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                  borderRadius: 10,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

interface CurrentSprint {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  tasks: {
    todo: number
    in_progress: number
    review: number
    done: number
    total: number
  }
}

interface Activity {
  id: string
  action: string
  task: string
  time: string
  created_at: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projectsCount, setProjectsCount] = useState(0)
  const [onTimeProjects, setOnTimeProjects] = useState(0)
  const [currentSprint, setCurrentSprint] = useState<CurrentSprint | null>(null)
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch active projects count
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, end_date')
        .eq('status', 'active')

      if (projectsError) throw projectsError

      setProjectsCount(projects?.length || 0)

      // Count on-time projects (end_date >= today)
      const onTime = projects?.filter((p) => new Date(p.end_date) >= new Date()).length || 0
      setOnTimeProjects(onTime)

      // Fetch current active sprint
      const { data: sprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, name, start_date, end_date, status')
        .eq('status', 'active')
        .order('end_date', { ascending: true })
        .limit(1)

      if (sprintsError) throw sprintsError

      if (sprints && sprints.length > 0) {
        const sprint = sprints[0]

        // Fetch tasks for this sprint
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('status')
          .eq('sprint_id', sprint.id)

        if (tasksError) throw tasksError

        const taskStats = {
          todo: tasks?.filter((t) => t.status === 'todo').length || 0,
          in_progress: tasks?.filter((t) => t.status === 'in-progress').length || 0,
          review: tasks?.filter((t) => t.status === 'review').length || 0,
          done: tasks?.filter((t) => t.status === 'done').length || 0,
          total: tasks?.length || 0,
        }

        setCurrentSprint({
          ...sprint,
          tasks: taskStats,
        })
      }

      // Fetch recent activities
      // Get recent tasks
      const { data: recentTasks, error: tasksActivityError } = await supabase
        .from('tasks')
        .select('id, title, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10)

      if (tasksActivityError) throw tasksActivityError

      // Get recent sprints
      const { data: recentSprints, error: sprintsActivityError } = await supabase
        .from('sprints')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (sprintsActivityError) throw sprintsActivityError

      // Get recent projects
      const { data: recentProjects, error: projectsActivityError } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (projectsActivityError) throw projectsActivityError

      // Combine and format activities
      const activities: Activity[] = []

      recentTasks?.forEach((task) => {
        if (task.status === 'done') {
          activities.push({
            id: task.id,
            action: 'Tarefa concluída',
            task: task.title,
            time: formatTimeAgo(task.created_at),
            created_at: task.created_at,
          })
        }
      })

      recentSprints?.forEach((sprint) => {
        activities.push({
          id: sprint.id,
          action: 'Sprint criado',
          task: sprint.name,
          time: formatTimeAgo(sprint.created_at),
          created_at: sprint.created_at,
        })
      })

      recentProjects?.forEach((project) => {
        activities.push({
          id: project.id,
          action: 'Projeto criado',
          task: project.name,
          time: formatTimeAgo(project.created_at),
          created_at: project.created_at,
        })
      })

      // Sort by created_at and take top 4
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentActivities(activities.slice(0, 4))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
    if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const calculateProgress = () => {
    if (!currentSprint || currentSprint.tasks.total === 0) return 0
    return Math.round((currentSprint.tasks.done / currentSprint.tasks.total) * 100)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            mb: 5,
            p: 4,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: 'radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h3" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
              Bem-vindo(a), {user?.user_metadata?.full_name || 'Usuário'}!
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 400 }}>
              Veja o que está acontecendo com seus projetos hoje
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            {loading ? (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                }}
              >
                <CircularProgress />
              </Paper>
            ) : (
              <StatCard
                title="Projetos Ativos"
                value={projectsCount}
                icon={<Assignment sx={{ fontSize: 28 }} />}
                color="#1e40af"
                subtitle={`${onTimeProjects} no prazo`}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActiveSprintsWidget />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TeamMetricsWidget />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActionItemsWidget />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: '100%',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '2px solid',
                borderColor: 'rgba(99, 102, 241, 0.1)',
              }}
            >
              <Typography variant="h5" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
                Visão Geral do Sprint Atual
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : currentSprint ? (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {currentSprint.name}
                      </Typography>
                      <Chip label="Ativo" color="success" size="small" />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(currentSprint.start_date)} - {formatDate(currentSprint.end_date)}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Tarefas Concluídas</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {currentSprint.tasks.done} / {currentSprint.tasks.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={calculateProgress()}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary">
                        A Fazer
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {currentSprint.tasks.todo}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary">
                        Em Progresso
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {currentSprint.tasks.in_progress}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary">
                        Em Revisão
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {currentSprint.tasks.review}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary">
                        Concluído
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {currentSprint.tasks.done}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nenhum sprint ativo no momento
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: '100%',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '2px solid',
                borderColor: 'rgba(99, 102, 241, 0.1)',
              }}
            >
              <Typography variant="h5" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
                Atividade Recente
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : recentActivities.length > 0 ? (
                <Box sx={{ mt: 3 }}>
                  {recentActivities.map((item, index) => (
                    <Box
                      key={item.id}
                      sx={{
                        pb: 2,
                        mb: 2,
                        borderBottom: index < recentActivities.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {item.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.task}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.time}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma atividade recente
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
