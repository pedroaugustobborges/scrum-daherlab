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
  SpaceDashboard,
  CalendarToday,
  People,
  Assignment,
  Flag,
  Speed,
  Save,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface EditSprintModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sprint: {
    id: string
    name: string
    goal: string
    start_date: string
    end_date: string
    status: string
    team_id: string
    project_id: string
    velocity: number
  }
}

interface Team {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

const statusOptions = [
  { value: 'planning', label: 'Planejamento', color: '#f59e0b' },
  { value: 'active', label: 'Ativo', color: '#10b981' },
  { value: 'completed', label: 'Concluído', color: '#6366f1' },
  { value: 'cancelled', label: 'Cancelado', color: '#ef4444' },
]

export default function EditSprintModal({
  open,
  onClose,
  onSuccess,
  sprint,
}: EditSprintModalProps) {
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    team_id: '',
    project_id: '',
    velocity: 0,
  })

  useEffect(() => {
    if (open) {
      fetchTeamsAndProjects()
      if (sprint) {
        setFormData({
          name: sprint.name || '',
          goal: sprint.goal || '',
          start_date: sprint.start_date || '',
          end_date: sprint.end_date || '',
          status: sprint.status || 'planning',
          team_id: sprint.team_id || '',
          project_id: sprint.project_id || '',
          velocity: sprint.velocity || 0,
        })
      }
    }
  }, [open, sprint])

  const fetchTeamsAndProjects = async () => {
    setLoadingData(true)
    try {
      const [teamsResponse, projectsResponse] = await Promise.all([
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('projects').select('id, name').order('name'),
      ])

      if (teamsResponse.data) setTeams(teamsResponse.data)
      if (projectsResponse.data) setProjects(projectsResponse.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoadingData(false)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculateSprintDuration = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }
    return 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome do sprint')
      return
    }

    if (!formData.team_id) {
      toast.error('Por favor, selecione um time')
      return
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Por favor, informe as datas de início e término')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('sprints')
        .update({
          name: formData.name,
          goal: formData.goal,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: formData.status,
          team_id: formData.team_id,
          project_id: formData.project_id || null,
          velocity: formData.velocity,
        })
        .eq('id', sprint.id)

      if (error) throw error

      toast.success('Sprint atualizado com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating sprint:', error)
      toast.error('Erro ao atualizar sprint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Sprint" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {loadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                label="Nome do Sprint"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder="Ex: Sprint 24 - Q1 2025"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SpaceDashboard sx={{ color: '#6366f1' }} />
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
                label="Objetivo do Sprint"
                value={formData.goal}
                onChange={(e) => handleChange('goal', e.target.value)}
                multiline
                rows={3}
                placeholder="Qual é a meta principal deste sprint?"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                      <Flag sx={{ color: '#6366f1' }} />
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
                  label="Time"
                  value={formData.team_id}
                  onChange={(e) => handleChange('team_id', e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <People sx={{ color: '#6366f1' }} />
                      </InputAdornment>
                    ),
                  }}
                >
                  {teams.length === 0 ? (
                    <MenuItem disabled>Nenhum time disponível</MenuItem>
                  ) : (
                    teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))
                  )}
                </TextField>

                <TextField
                  fullWidth
                  select
                  label="Projeto (Opcional)"
                  value={formData.project_id}
                  onChange={(e) => handleChange('project_id', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Assignment sx={{ color: '#6366f1' }} />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
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
                  type="date"
                  label="Data de Início"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  type="date"
                  label="Data de Término"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    min: formData.start_date,
                  }}
                />
              </Box>

              {formData.start_date && formData.end_date && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '2px solid rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
                  <Box sx={{ fontWeight: 600, color: '#6366f1' }}>
                    Duração: {calculateSprintDuration()} dias
                  </Box>
                </Box>
              )}

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
                        <SpaceDashboard sx={{ color: '#6366f1' }} />
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
                  label="Velocity (Pontos)"
                  value={formData.velocity}
                  onChange={(e) => handleChange('velocity', parseInt(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Speed sx={{ color: '#6366f1' }} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    min: 0,
                  }}
                />
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
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </form>
    </Modal>
  )
}
