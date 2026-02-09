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
  CheckCircle,
  Description,
  Person,
  Timer,
  Save,
  TrendingUp,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface Subtask {
  id: string
  title: string
  description: string
  status: string
  estimated_hours: number
  assigned_to: string
}

interface CreateSubtaskModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  taskId: string
  subtask?: Subtask | null
}

interface Profile {
  id: string
  full_name: string
  email?: string
}

const statusOptions = [
  { value: 'todo', label: 'A Fazer', color: '#6b7280' },
  { value: 'in-progress', label: 'Em Progresso', color: '#f59e0b' },
  { value: 'done', label: 'Concluído', color: '#10b981' },
]

export default function CreateSubtaskModal({
  open,
  onClose,
  onSuccess,
  taskId,
  subtask,
}: CreateSubtaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    assigned_to: '',
    estimated_hours: '',
  })

  const isEditMode = !!subtask

  useEffect(() => {
    if (open) {
      fetchProfiles()
      if (subtask) {
        setFormData({
          title: subtask.title || '',
          description: subtask.description || '',
          status: subtask.status || 'todo',
          assigned_to: subtask.assigned_to || '',
          estimated_hours: subtask.estimated_hours ? String(subtask.estimated_hours) : '',
        })
      } else {
        setFormData({
          title: '',
          description: '',
          status: 'todo',
          assigned_to: '',
          estimated_hours: '',
        })
      }
    }
  }, [open, subtask])

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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Por favor, informe o título da subtarefa')
      return
    }

    setLoading(true)

    try {
      if (isEditMode && subtask) {
        const { error } = await supabase
          .from('subtasks')
          .update({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            assigned_to: formData.assigned_to || null,
            estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          })
          .eq('id', subtask.id)

        if (error) throw error

        toast.success('Subtarefa atualizada com sucesso!')
      } else {
        const { data: user } = await supabase.auth.getUser()

        const { error } = await supabase.from('subtasks').insert([
          {
            task_id: taskId,
            title: formData.title,
            description: formData.description,
            status: formData.status,
            assigned_to: formData.assigned_to || null,
            estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
            created_by: user.user?.id,
          },
        ])

        if (error) throw error

        toast.success('Subtarefa criada com sucesso!')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving subtask:', error)
      toast.error(isEditMode ? 'Erro ao atualizar subtarefa' : 'Erro ao criar subtarefa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditMode ? 'Editar Subtarefa' : 'Nova Subtarefa'} maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Título da Subtarefa"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            placeholder="Descreva a tarefa a ser realizada"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CheckCircle sx={{ color: '#6366f1' }} />
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
            label="Descrição (Opcional)"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={3}
            placeholder="Detalhes adicionais sobre a subtarefa..."
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
              type="number"
              label="Horas Estimadas"
              value={formData.estimated_hours}
              onChange={(e) => handleChange('estimated_hours', e.target.value)}
              placeholder="Ex: 4"
              inputProps={{ min: 0, step: 0.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Timer sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

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
              {loading ? (isEditMode ? 'Salvando...' : 'Criando...') : (isEditMode ? 'Salvar Alterações' : 'Criar Subtarefa')}
            </Button>
          </Box>
        </Stack>
      </form>
    </Modal>
  )
}
