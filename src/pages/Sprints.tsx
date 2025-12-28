import { useState, useEffect } from 'react'
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
} from '@mui/material'
import { Add, SpaceDashboard, CalendarToday, Flag, Speed, Timeline, Edit, Delete, ListAlt } from '@mui/icons-material'
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

const statusConfig: Record<string, { label: string; color: any }> = {
  planning: { label: 'Planejamento', color: 'warning' },
  active: { label: 'Ativo', color: 'success' },
  completed: { label: 'Concluído', color: 'primary' },
  cancelled: { label: 'Cancelado', color: 'error' },
}

export default function Sprints() {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)

  useEffect(() => {
    fetchSprints()
  }, [])

  const fetchSprints = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*, teams(name), projects(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSprints(data || [])
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : sprints.length === 0 ? (
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
        ) : (
          <Grid container spacing={3}>
            {sprints.map((sprint) => (
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
