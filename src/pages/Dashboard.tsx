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
} from '@mui/material'
import {
  TrendingUp,
  Assignment,
  People,
  SpaceDashboard,
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/contexts/AuthContext'

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
            <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5, background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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

export default function Dashboard() {
  const { user } = useAuth()

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
            <StatCard
              title="Projetos Ativos"
              value={3}
              icon={<Assignment sx={{ fontSize: 28 }} />}
              color="#1e40af"
              subtitle="2 no prazo"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Sprints Ativos"
              value={2}
              icon={<SpaceDashboard sx={{ fontSize: 28 }} />}
              color="#0891b2"
              subtitle="5 dias restantes"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Membros do Time"
              value={8}
              icon={<People sx={{ fontSize: 28 }} />}
              color="#7c3aed"
              subtitle="Em 3 times"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Progresso do Sprint"
              value="68%"
              icon={<TrendingUp sx={{ fontSize: 28 }} />}
              color="#059669"
              progress={68}
            />
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
              <Box sx={{ mt: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Sprint 24 - Q1 2025
                    </Typography>
                    <Chip label="Ativo" color="success" size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    1 de Março - 15 de Março, 2025
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tarefas Concluídas</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        24 / 35
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={68} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      A Fazer
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      6
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      Em Progresso
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      5
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      Em Revisão
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      4
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      Concluído
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      24
                    </Typography>
                  </Box>
                </Box>
              </Box>
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
              <Box sx={{ mt: 3 }}>
                {[
                  { action: 'Tarefa concluída', task: 'Autenticação de usuário', time: 'há 2 horas' },
                  { action: 'Sprint iniciado', task: 'Sprint 24', time: 'há 1 dia' },
                  { action: 'Projeto criado', task: 'App Mobile', time: 'há 3 dias' },
                  { action: 'Membro adicionado', task: 'João Silva', time: 'há 5 dias' },
                ].map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      pb: 2,
                      mb: 2,
                      borderBottom: index < 3 ? '1px solid' : 'none',
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
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
