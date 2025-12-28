import { useState, useEffect } from 'react'
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import {
  Assignment,
  Description,
  Flag,
  TrendingUp,
  Person,
  Save,
  Functions,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface CreateUserStoryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sprintId: string
  projectId: string
}

interface Profile {
  id: string
  full_name: string
  email?: string
}

const statusOptions = [
  { value: 'todo', label: 'A Fazer', color: '#6b7280' },
  { value: 'in-progress', label: 'Em Progresso', color: '#f59e0b' },
  { value: 'review', label: 'Em Revisão', color: '#8b5cf6' },
  { value: 'done', label: 'Concluído', color: '#10b981' },
  { value: 'blocked', label: 'Bloqueado', color: '#ef4444' },
]

const priorityOptions = [
  { value: 'low', label: 'Baixa', color: '#6b7280' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#ef4444' },
  { value: 'urgent', label: 'Urgente', color: '#dc2626' },
]

const fibonacciOptions = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

export default function CreateUserStoryModal({
  open,
  onClose,
  onSuccess,
  sprintId,
  projectId,
}: CreateUserStoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    story_points: 0,
    assigned_to: '',
  })

  useEffect(() => {
    if (open) {
      fetchProfiles()
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        story_points: 0,
        assigned_to: '',
      })
    }
  }, [open])

  const fetchProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoadingProfiles(false)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Por favor, informe o título da história')
      return
    }

    setLoading(true)

    try {
      const { data: user } = await supabase.auth.getUser()

      const { error } = await supabase.from('tasks').insert([
        {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          story_points: formData.story_points,
          sprint_id: sprintId,
          project_id: projectId,
          assigned_to: formData.assigned_to || null,
          created_by: user.user?.id,
        },
      ])

      if (error) throw error

      toast.success('História de usuário criada com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating user story:', error)
      toast.error('Erro ao criar história de usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova História de Usuário" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Título da História"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            placeholder="Como [usuário], eu quero [objetivo] para [benefício]"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Assignment sx={{ color: '#6366f1' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                fontWeight: 500,
              },
            }}
          />

          <TextField
            fullWidth
            label="Descrição"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={4}
            placeholder="Critérios de aceitação e detalhes da história..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  <Description sx={{ color: '#6366f1' }} />
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TrendingUp sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: option.color,
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Prioridade"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Flag sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            >
              {priorityOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: option.color,
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              select
              label="Story Points (Fibonacci)"
              value={formData.story_points}
              onChange={(e) => handleChange('story_points', parseInt(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Functions sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value={0}>Não estimado</MenuItem>
              {fibonacciOptions.map((points) => (
                <MenuItem key={points} value={points}>
                  {points} pontos
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Atribuir a"
              value={formData.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              disabled={loadingProfiles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">Não atribuído</MenuItem>
              {profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.full_name || 'Sem nome'}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'flex-end',
              pt: 2,
              borderTop: '2px solid',
              borderColor: 'rgba(99, 102, 241, 0.1)',
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={loading}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
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
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
              }}
            >
              {loading ? 'Criando...' : 'Criar História'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Modal>
  )
}
