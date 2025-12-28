import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Grid,
  Typography,
  Chip,
  Stack,
} from '@mui/material'
import { Save, Functions } from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface CreateBacklogItemModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  item?: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    story_points: number
    project_id: string
    assigned_to: string
  }
}

interface Project {
  id: string
  name: string
}

interface TeamMember {
  id: string
  full_name: string
}

const fibonacciOptions = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

export default function CreateBacklogItemModal({ open, onClose, onSuccess, item }: CreateBacklogItemModalProps) {
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    story_points: 0,
    project_id: '',
    assigned_to: '',
  })

  useEffect(() => {
    if (open) {
      fetchProjects()
      fetchTeamMembers()
      if (item) {
        setFormData({
          title: item.title || '',
          description: item.description || '',
          status: item.status || 'todo',
          priority: item.priority || 'medium',
          story_points: item.story_points || 0,
          project_id: item.project_id || '',
          assigned_to: item.assigned_to || '',
        })
      } else {
        resetForm()
      }
    }
  }, [open, item])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name')

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      story_points: 0,
      project_id: '',
      assigned_to: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    if (!formData.project_id) {
      toast.error('Projeto é obrigatório')
      return
    }

    setLoading(true)

    try {
      const { data: user } = await supabase.auth.getUser()

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from('tasks')
          .update({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            story_points: formData.story_points,
            project_id: formData.project_id,
            assigned_to: formData.assigned_to || null,
          })
          .eq('id', item.id)

        if (error) throw error
        toast.success('Item do backlog atualizado com sucesso!')
      } else {
        // Create new item
        const { error } = await supabase.from('tasks').insert([
          {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            story_points: formData.story_points,
            project_id: formData.project_id,
            assigned_to: formData.assigned_to || null,
            sprint_id: null, // Backlog items have no sprint
            created_by: user.user?.id,
          },
        ])

        if (error) throw error
        toast.success('Item adicionado ao backlog com sucesso!')
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error saving backlog item:', error)
      toast.error('Erro ao salvar item do backlog')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar Item do Backlog' : 'Novo Item do Backlog'}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Título"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            autoFocus
          />

          <TextField
            fullWidth
            label="Descrição"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Como um [tipo de usuário], eu quero [ação] para [benefício]..."
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Projeto"
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              >
                <MenuItem value="">
                  <em>Selecione um projeto</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="todo">A Fazer</MenuItem>
                <MenuItem value="in-progress">Em Progresso</MenuItem>
                <MenuItem value="review">Em Revisão</MenuItem>
                <MenuItem value="done">Concluído</MenuItem>
                <MenuItem value="blocked">Bloqueado</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Prioridade"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="low">Baixa</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Responsável"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              >
                <MenuItem value="">
                  <em>Não atribuído</em>
                </MenuItem>
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.full_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Functions sx={{ fontSize: 18 }} />
              Story Points (Fibonacci)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {fibonacciOptions.map((points) => (
                <Chip
                  key={points}
                  label={points}
                  onClick={() => setFormData({ ...formData, story_points: points })}
                  color={formData.story_points === points ? 'primary' : 'default'}
                  sx={{
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: formData.story_points === points ? '2px solid' : '1px solid',
                    borderColor: formData.story_points === points ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                />
              ))}
              <Chip
                label="0"
                onClick={() => setFormData({ ...formData, story_points: 0 })}
                color={formData.story_points === 0 ? 'primary' : 'default'}
                sx={{
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: formData.story_points === 0 ? '2px solid' : '1px solid',
                  borderColor: formData.story_points === 0 ? 'primary.main' : 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
            <Button onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              sx={{ px: 4 }}
            >
              {loading ? 'Salvando...' : item ? 'Atualizar' : 'Criar Item'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Modal>
  )
}
