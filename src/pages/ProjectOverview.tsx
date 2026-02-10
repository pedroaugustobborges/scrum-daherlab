import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  LinearProgress,
  alpha,
} from '@mui/material'
import {
  Assignment,
  CalendarToday,
  Groups,
  TrendingUp,
  Speed,
  Timeline,
} from '@mui/icons-material'
import { useProjectContext } from './ProjectDetail'

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

  const calculateProgress = () => {
    if (!project.start_date || !project.end_date) return 0
    const start = new Date(project.start_date).getTime()
    const end = new Date(project.end_date).getTime()
    const now = Date.now()

    if (now <= start) return 0
    if (now >= end) return 100

    return Math.round(((now - start) / (end - start)) * 100)
  }

  const progress = calculateProgress()

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
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                }}
              >
                <Assignment />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Progresso do Projeto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Baseado no cronograma planejado
                </Typography>
              </Box>
              <Chip
                label={`${progress}%`}
                sx={{
                  bgcolor: alpha('#6366f1', 0.1),
                  color: '#6366f1',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              />
            </Box>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 12,
                borderRadius: 6,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  bgcolor: '#6366f1',
                },
              }}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mt: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Início: <strong>{formatDate(project.start_date)}</strong>
                </Typography>
              </Box>
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
