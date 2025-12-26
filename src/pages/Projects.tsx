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
  IconButton,
  CircularProgress,
  Fab,
} from '@mui/material'
import {
  Add,
  Assignment,
  CalendarToday,
  Delete,
  Edit,
  Folder,
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import CreateProjectModal from '@/components/CreateProjectModal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Project {
  id: string
  name: string
  description: string
  status: string
  start_date: string
  end_date: string
  created_at: string
}

const statusConfig: Record<string, { label: string; color: any }> = {
  active: { label: 'Ativo', color: 'success' },
  'on-hold': { label: 'Em Espera', color: 'warning' },
  completed: { label: 'Concluído', color: 'primary' },
  archived: { label: 'Arquivado', color: 'default' },
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Erro ao carregar projetos')
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
              Projetos
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Gerencie todos os seus projetos em um só lugar
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
            Novo Projeto
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : projects.length === 0 ? (
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
            <Folder sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Nenhum projeto criado ainda
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Comece criando seu primeiro projeto para organizar suas tarefas e sprints
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
            >
              Criar Primeiro Projeto
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} md={6} lg={4} key={project.id}>
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
                        <Assignment sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                      <Chip
                        label={statusConfig[project.status]?.label || project.status}
                        color={statusConfig[project.status]?.color || 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 1 }}>
                      {project.name}
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
                      {project.description || 'Sem descrição'}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Início
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(project.start_date)}
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Término
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(project.end_date)}
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

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </Box>
  )
}
