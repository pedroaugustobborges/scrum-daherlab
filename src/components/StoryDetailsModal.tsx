import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Stack,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Assignment,
  Description,
  Flag,
  TrendingUp,
  Person,
  Save,
  Functions,
  Add,
  CheckCircle,
  Delete,
  Timer,
  Edit as EditIcon,
  Visibility,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import CreateSubtaskModal from './CreateSubtaskModal'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'

interface StoryDetailsModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  storyId: string
}

interface Profile {
  id: string
  full_name: string
}

interface Subtask {
  id: string
  title: string
  description: string
  status: string
  estimated_hours: number
  assigned_to: string
  assigned_to_profile?: { full_name: string }
}

interface Story {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string
  assigned_to_profile?: { full_name: string }
  subtasks?: Subtask[]
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

export default function StoryDetailsModal({ open, onClose, onSuccess, storyId }: StoryDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [story, setStory] = useState<Story | null>(null)
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    story_points: 0,
    assigned_to: '',
  })

  // Celebration confetti for subtask completion
  const celebrateSubtaskCompletion = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#6366f1', '#8b5cf6', '#f59e0b'],
      zIndex: 9999,
    })
  }

  useEffect(() => {
    if (open && storyId) {
      fetchStory()
      fetchProfiles()
    }
  }, [open, storyId])

  const fetchStory = async () => {
    setLoading(true)
    try {
      const { data: storyData, error: storyError } = await supabase
        .from('tasks')
        .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
        .eq('id', storyId)
        .single()

      if (storyError) throw storyError

      // Fetch subtasks
      const { data: subtasksData } = await supabase
        .from('subtasks')
        .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
        .eq('task_id', storyId)
        .order('created_at', { ascending: true })

      const fullStory = {
        ...storyData,
        subtasks: subtasksData || [],
      }

      setStory(fullStory)
      setFormData({
        title: storyData.title,
        description: storyData.description || '',
        status: storyData.status,
        priority: storyData.priority,
        story_points: storyData.story_points || 0,
        assigned_to: storyData.assigned_to || '',
      })
    } catch (error) {
      console.error('Error fetching story:', error)
      toast.error('Erro ao carregar história')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name')

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Por favor, informe o título da história')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          story_points: formData.story_points,
          assigned_to: formData.assigned_to || null,
        })
        .eq('id', storyId)

      if (error) throw error

      toast.success('História atualizada com sucesso!')
      setEditMode(false)
      await fetchStory()
      onSuccess()
    } catch (error) {
      console.error('Error updating story:', error)
      toast.error('Erro ao atualizar história')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleSubtaskStatus = async (subtask: Subtask) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done'

    try {
      const { error } = await supabase.from('subtasks').update({ status: newStatus }).eq('id', subtask.id)

      if (error) throw error

      // Celebrate if subtask is completed
      if (newStatus === 'done') {
        celebrateSubtaskCompletion()
        toast.success('✨ Subtarefa concluída!', {
          duration: 3000,
          icon: '🎯',
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontWeight: 600,
          },
        })
      } else {
        toast.success('Status atualizado')
      }

      await fetchStory()
      onSuccess()
    } catch (error) {
      console.error('Error updating subtask:', error)
      toast.error('Erro ao atualizar subtarefa')
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)

      if (error) throw error

      toast.success('Subtarefa excluída com sucesso!')
      await fetchStory()
      onSuccess()
    } catch (error) {
      console.error('Error deleting subtask:', error)
      toast.error('Erro ao excluir subtarefa')
    }
  }

  const calculateProgress = () => {
    if (!story?.subtasks || story.subtasks.length === 0) return 0
    const completed = story.subtasks.filter((st) => st.status === 'done').length
    return Math.round((completed / story.subtasks.length) * 100)
  }

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Carregando..." maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      </Modal>
    )
  }

  if (!story) {
    return null
  }

  const progress = calculateProgress()

  return (
    <>
      <Modal open={open} onClose={onClose} title={editMode ? 'Editar História' : 'Detalhes da História'} maxWidth="md">
        <Box>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab icon={<Visibility />} iconPosition="start" label="Detalhes" />
              <Tab icon={<CheckCircle />} iconPosition="start" label={`Subtarefas (${story.subtasks?.length || 0})`} />
            </Tabs>
          </Box>

          {/* Tab 0: Details */}
          {activeTab === 0 && (
            <Stack spacing={3}>
              {!editMode ? (
                // View Mode
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                      {story.title}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => setEditMode(true)}
                      sx={{
                        borderRadius: 2,
                        borderWidth: 2,
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        color: '#6366f1',
                        fontWeight: 600,
                        '&:hover': {
                          borderWidth: 2,
                          borderColor: '#6366f1',
                        },
                      }}
                    >
                      Editar
                    </Button>
                  </Box>

                  {story.description && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                        Descrição
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {story.description}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={statusOptions.find((s) => s.value === story.status)?.label || story.status}
                      sx={{
                        bgcolor: `${statusOptions.find((s) => s.value === story.status)?.color}20`,
                        color: statusOptions.find((s) => s.value === story.status)?.color,
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      icon={<Flag sx={{ fontSize: 16 }} />}
                      label={priorityOptions.find((p) => p.value === story.priority)?.label || story.priority}
                      sx={{
                        bgcolor: `${priorityOptions.find((p) => p.value === story.priority)?.color}20`,
                        color: priorityOptions.find((p) => p.value === story.priority)?.color,
                        fontWeight: 600,
                      }}
                    />
                    {story.story_points > 0 && (
                      <Chip
                        icon={<Functions sx={{ fontSize: 16 }} />}
                        label={`${story.story_points} pontos`}
                        sx={{
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {story.assigned_to_profile?.full_name && (
                      <Chip
                        icon={<Person sx={{ fontSize: 16 }} />}
                        label={story.assigned_to_profile.full_name}
                        sx={{
                          bgcolor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>

                  {/* Progress */}
                  {story.subtasks && story.subtasks.length > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                          Progresso das Subtarefas
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#6366f1' }}>
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
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
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {story.subtasks.filter((st) => st.status === 'done').length} de {story.subtasks.length} concluídas
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                // Edit Mode
                <>
                  <TextField
                    fullWidth
                    label="Título da História"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Assignment sx={{ color: '#6366f1' }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Descrição"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    multiline
                    rows={4}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                          <Description sx={{ color: '#6366f1' }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false)
                        setFormData({
                          title: story.title,
                          description: story.description || '',
                          status: story.status,
                          priority: story.priority,
                          story_points: story.story_points || 0,
                          assigned_to: story.assigned_to || '',
                        })
                      }}
                      disabled={saving}
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
                        },
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                      }}
                    >
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          )}

          {/* Tab 1: Subtasks */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Subtarefas ({story.subtasks?.length || 0})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateSubtaskOpen(true)}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                  }}
                >
                  Adicionar Subtarefa
                </Button>
              </Box>

              {story.subtasks && story.subtasks.length > 0 ? (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0 }}>
                  {story.subtasks.map((subtask, index) => (
                    <Box key={subtask.id}>
                      <ListItem
                        sx={{
                          py: 2,
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.05)',
                          },
                        }}
                      >
                        <Tooltip title={subtask.status === 'done' ? 'Marcar como pendente' : 'Marcar como concluído'}>
                          <IconButton size="small" onClick={() => handleToggleSubtaskStatus(subtask)} sx={{ mr: 2 }}>
                            <CheckCircle
                              sx={{
                                color: subtask.status === 'done' ? '#10b981' : '#d1d5db',
                                fontSize: 28,
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body1"
                              fontWeight={600}
                              sx={{
                                textDecoration: subtask.status === 'done' ? 'line-through' : 'none',
                                color: subtask.status === 'done' ? 'text.secondary' : 'text.primary',
                              }}
                            >
                              {subtask.title}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              {subtask.estimated_hours && (
                                <Chip
                                  label={`${subtask.estimated_hours}h`}
                                  size="small"
                                  icon={<Timer sx={{ fontSize: 14 }} />}
                                  sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                                    color: '#6366f1',
                                  }}
                                />
                              )}
                              {subtask.assigned_to_profile?.full_name && (
                                <Chip
                                  label={subtask.assigned_to_profile.full_name}
                                  size="small"
                                  icon={<Person sx={{ fontSize: 14 }} />}
                                  sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981',
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            sx={{
                              color: 'error.main',
                              '&:hover': {
                                bgcolor: 'error.lighter',
                              },
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < story.subtasks!.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    px: 3,
                    borderRadius: 3,
                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                    border: '2px dashed rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 60, color: '#6366f1', opacity: 0.3, mb: 2 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Nenhuma subtarefa adicionada
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Adicione subtarefas para quebrar esta história em tarefas menores
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateSubtaskOpen(true)}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    Adicionar Primeira Subtarefa
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Modal>

      <CreateSubtaskModal
        open={createSubtaskOpen}
        onClose={() => setCreateSubtaskOpen(false)}
        onSuccess={async () => {
          setCreateSubtaskOpen(false)
          await fetchStory()
          onSuccess()
        }}
        taskId={storyId}
      />
    </>
  )
}
