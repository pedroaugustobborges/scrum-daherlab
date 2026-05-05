import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material'
import {
  Assignment,
  CalendarToday,
  CheckCircle,
  Functions,
  Groups,
  TrendingUp,
  Speed,
  Timeline,
} from '@mui/icons-material'
import { useProjectContext } from './ProjectDetail'
import { supabase } from '@/lib/supabase'

export default function ProjectOverview() {
  const { project, config } = useProjectContext()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Não definida'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const [progressMode, setProgressMode] = useState<'tasks' | 'points'>('tasks')
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    totalPoints: 0,
    completedPoints: 0,
  })

  useEffect(() => {
    if (!project?.id) return
    supabase
      .from('tasks')
      .select('status, story_points')
      .eq('project_id', project.id)
      .then(({ data }) => {
        if (!data) return
        setTaskStats({
          total: data.length,
          completed: data.filter((t) => t.status === 'done').length,
          totalPoints: data.reduce((s, t) => s + (t.story_points || 0), 0),
          completedPoints: data
            .filter((t) => t.status === 'done')
            .reduce((s, t) => s + (t.story_points || 0), 0),
        })
      })
  }, [project?.id])

  const tasksProgress =
    taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0
  const pointsProgress =
    taskStats.totalPoints > 0
      ? Math.round((taskStats.completedPoints / taskStats.totalPoints) * 100)
      : 0
  const progress = progressMode === 'tasks' ? tasksProgress : pointsProgress
  const progressColor = progressMode === 'tasks' ? '#6366f1' : '#f59e0b'
  const progressBarGradient =
    progressMode === 'tasks'
      ? 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)'
      : 'linear-gradient(90deg, #fde68a 0%, #f59e0b 100%)'

  const methodologyInfo = {
    agile: {
      label: 'Metodologia Ágil',
      description: 'Sprints, Kanban e entregas iterativas',
      color: '#6366f1',
      icon: <Speed />,
    },
    predictive: {
      label: 'Metodologia Preditiva',
      description: 'Gantt, WBS e planejamento detalhado',
      color: '#10b981',
      icon: <Timeline />,
    },
    hybrid: {
      label: 'Metodologia Híbrida',
      description: 'Combinação de Ágil e Preditivo',
      color: '#f59e0b',
      icon: <TrendingUp />,
    },
  }

  const methodology = config
    ? methodologyInfo[config.methodology]
    : methodologyInfo.agile

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Visão Geral
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Resumo e informações principais do projeto
      </Typography>

      <Grid container spacing={3}>
        {/* Progress Card */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: 'rgba(99, 102, 241, 0.2)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(progressColor, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: progressColor,
                  transition: 'all 0.3s ease',
                }}
              >
                {progressMode === 'tasks' ? <CheckCircle /> : <Functions />}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Progresso do Projeto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progressMode === 'tasks'
                    ? 'Baseado nas tarefas concluídas'
                    : 'Baseado nos pontos concluídos'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ToggleButtonGroup
                  value={progressMode}
                  exclusive
                  onChange={(_, v) => v && setProgressMode(v)}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.07)',
                    borderRadius: 2,
                    p: 0.4,
                    '& .MuiToggleButtonGroup-grouped': {
                      border: '0 !important',
                      borderRadius: '10px !important',
                      px: 1.5,
                      py: 0.3,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      color: 'text.secondary',
                      minWidth: 64,
                      '&.Mui-selected': {
                        bgcolor: 'background.paper',
                        color: '#6366f1',
                        boxShadow: '0 1px 4px rgba(99, 102, 241, 0.2)',
                      },
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' },
                    },
                  }}
                >
                  <ToggleButton value="tasks">Tarefas</ToggleButton>
                  <ToggleButton value="points">Pontos</ToggleButton>
                </ToggleButtonGroup>
                <Chip
                  label={`${progress}%`}
                  sx={{
                    bgcolor: alpha(progressColor, 0.1),
                    color: progressColor,
                    fontWeight: 700,
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                  }}
                />
              </Box>
            </Box>

            {/* Glossy progress bar */}
            <Box
              sx={{
                position: 'relative',
                height: 12,
                borderRadius: 6,
                bgcolor: 'rgba(0, 0, 0, 0.07)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  right: 'auto',
                  width: `${progress}%`,
                  borderRadius: 6,
                  background: progressBarGradient,
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.28) 0%, transparent 55%)',
                    pointerEvents: 'none',
                  },
                }}
              />
            </Box>

            {/* Insight chip — visible whenever the two metrics diverge meaningfully */}
            {taskStats.total > 0 && taskStats.totalPoints > 0 &&
              Math.abs(pointsProgress - tasksProgress) >= 10 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                <Chip
                  label={
                    pointsProgress > tasksProgress
                      ? `📈 Tarefas mais pesadas priorizadas — pontos (${pointsProgress}%) à frente das tarefas (${tasksProgress}%)`
                      : `⚠️ Muitas tarefas leves concluídas — pontos (${pointsProgress}%) atrás das tarefas (${tasksProgress}%)`
                  }
                  size="small"
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    height: 'auto',
                    py: 0.5,
                    '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' },
                    bgcolor: pointsProgress > tasksProgress
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)',
                    color: pointsProgress > tasksProgress ? '#059669' : '#d97706',
                    border: `1px solid ${pointsProgress > tasksProgress ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  }}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Início: <strong>{formatDate(project.start_date)}</strong>
                </Typography>
              </Box>
              <Typography variant="caption" fontWeight={600} sx={{ color: progressColor }}>
                {progressMode === 'tasks'
                  ? `${taskStats.completed} / ${taskStats.total} tarefas`
                  : `${taskStats.completedPoints} / ${taskStats.totalPoints} pts`}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Término: <strong>{formatDate(project.end_date)}</strong>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Methodology Card */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: alpha(methodology.color, 0.3),
              bgcolor: alpha(methodology.color, 0.02),
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: alpha(methodology.color, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: methodology.color,
                mb: 2,
              }}
            >
              {methodology.icon}
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {methodology.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {methodology.description}
            </Typography>
          </Paper>
        </Grid>

        {/* Description Card */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Descrição
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {project.description || 'Nenhuma descrição adicionada para este projeto.'}
            </Typography>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Acesso Rápido
          </Typography>
          <Grid container spacing={2}>
            {config?.module_kanban && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6366f1',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Assignment />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Kanban
                  </Typography>
                </Paper>
              </Grid>
            )}
            {config?.module_gantt && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Timeline />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Gantt
                  </Typography>
                </Paper>
              </Grid>
            )}
            {config?.module_wbs && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(245, 158, 11, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f59e0b',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Groups />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    WBS
                  </Typography>
                </Paper>
              </Grid>
            )}
            {config?.module_sprints && (
              <Grid item xs={6} sm={4} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(139, 92, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8b5cf6',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Speed />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Sprints
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  )
}
