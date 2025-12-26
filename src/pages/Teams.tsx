import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  CircularProgress,
  Fab,
} from '@mui/material'
import { Add, People, Groups } from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import CreateTeamModal from '@/components/CreateTeamModal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Team {
  id: string
  name: string
  description: string
  created_at: string
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Erro ao carregar times')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : teams.length === 0 ? (
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
        ) : (
          <Grid container spacing={3}>
            {teams.map((team) => (
              <Grid item xs={12} md={6} lg={4} key={team.id}>
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
                        <People sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.875rem' } }}>
                        <Avatar sx={{ bgcolor: '#10b981' }}>A</Avatar>
                        <Avatar sx={{ bgcolor: '#f59e0b' }}>B</Avatar>
                        <Avatar sx={{ bgcolor: '#ef4444' }}>C</Avatar>
                      </AvatarGroup>
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
                          0
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
    </Box>
  )
}
