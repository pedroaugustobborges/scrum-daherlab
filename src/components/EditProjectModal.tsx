import { useState, useEffect } from 'react'
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  Typography,
  Checkbox,
  ListItemText,
} from '@mui/material'
import {
  Assignment,
  CalendarToday,
  Description,
  TrendingUp,
  Save,
  Groups,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface Team {
  id: string
  name: string
}

interface EditProjectModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  project: {
    id: string
    name: string
    description: string
    status: string
    start_date: string
    end_date: string
  }
}

const statusOptions = [
  { value: 'active', label: 'Ativo', color: '#10b981' },
  { value: 'on-hold', label: 'Em Espera', color: '#f59e0b' },
  { value: 'completed', label: 'Concluído', color: '#6366f1' },
  { value: 'archived', label: 'Arquivado', color: '#6b7280' },
]

export default function EditProjectModal({
  open,
  onClose,
  onSuccess,
  project,
}: EditProjectModalProps) {
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [initialTeams, setInitialTeams] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    if (open && project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
      })
      fetchTeams()
      fetchProjectTeams()
    }
  }, [open, project])

  const fetchTeams = async () => {
    setTeamsLoading(true)
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Erro ao carregar times')
    } finally {
      setTeamsLoading(false)
    }
  }

  const fetchProjectTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('project_teams')
        .select('team_id')
        .eq('project_id', project.id)

      if (error) throw error

      const teamIds = (data || []).map((pt) => pt.team_id)
      setSelectedTeams(teamIds)
      setInitialTeams(teamIds)
    } catch (error) {
      console.error('Error fetching project teams:', error)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome do projeto')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        })
        .eq('id', project.id)

      if (error) throw error

      // Handle team changes
      const teamsToAdd = selectedTeams.filter((id) => !initialTeams.includes(id))
      const teamsToRemove = initialTeams.filter((id) => !selectedTeams.includes(id))

      // Remove teams that were deselected
      if (teamsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('project_teams')
          .delete()
          .eq('project_id', project.id)
          .in('team_id', teamsToRemove)

        if (removeError) {
          console.error('Error removing teams:', removeError)
        }
      }

      // Add newly selected teams
      if (teamsToAdd.length > 0) {
        const projectTeamsData = teamsToAdd.map((teamId) => ({
          project_id: project.id,
          team_id: teamId,
        }))

        const { error: addError } = await supabase
          .from('project_teams')
          .insert(projectTeamsData)

        if (addError) {
          console.error('Error adding teams:', addError)
        }
      }

      toast.success('Projeto atualizado com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Erro ao atualizar projeto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Projeto" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Nome do Projeto"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Ex: Sistema de Gestão Financeira"
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
            placeholder="Descreva os objetivos e escopo do projeto..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  <Description sx={{ color: '#6366f1' }} />
                </InputAdornment>
              ),
            }}
          />

          <Box>
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
          </Box>

          {/* Team Selection */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Groups sx={{ color: '#6366f1', fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Times Responsáveis
              </Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel
                id="teams-select-label"
                sx={{
                  '&.Mui-focused': { color: '#6366f1' },
                }}
              >
                Selecione os times
              </InputLabel>
              <Select
                labelId="teams-select-label"
                multiple
                value={selectedTeams}
                onChange={(e) => setSelectedTeams(e.target.value as string[])}
                input={<OutlinedInput label="Selecione os times" />}
                disabled={teamsLoading}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const team = teams.find((t) => t.id === value)
                      return (
                        <Chip
                          key={value}
                          label={team?.name || value}
                          size="small"
                          onDelete={() => {
                            setSelectedTeams((prev) => prev.filter((id) => id !== value))
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          sx={{
                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366f1',
                            fontWeight: 600,
                            '& .MuiChip-deleteIcon': {
                              color: '#6366f1',
                              '&:hover': {
                                color: '#4f46e5',
                              },
                            },
                          }}
                        />
                      )
                    })}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                    },
                  },
                }}
                sx={{
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#6366f1',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#6366f1',
                  },
                }}
              >
                {teamsLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Carregando times...
                  </MenuItem>
                ) : teams.length === 0 ? (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum time disponível
                    </Typography>
                  </MenuItem>
                ) : (
                  teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      <Checkbox
                        checked={selectedTeams.indexOf(team.id) > -1}
                        sx={{
                          color: '#6366f1',
                          '&.Mui-checked': {
                            color: '#6366f1',
                          },
                        }}
                      />
                      <ListItemText primary={team.name} />
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1 }}
            >
              Selecione os times que serão responsáveis por este projeto.
            </Typography>
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
        </Stack>
      </form>
    </Modal>
  )
}
