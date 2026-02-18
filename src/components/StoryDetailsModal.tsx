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
  Autocomplete,
  Alert,
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
  CalendarMonth,
  AccountTree,
  Link as LinkIcon,
  Warning,
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
  due_date: string | null
  start_date: string | null
  end_date: string | null
  planned_duration: number | null
  project_id: string
  assigned_to_profile?: { full_name: string }
  subtasks?: Subtask[]
}

interface AvailableTask {
  id: string
  title: string
  status: string
}

interface TaskDependency {
  id: string
  predecessor_id: string
  successor_id: string
  dependency_type: string
  lag_days: number
  predecessor?: { id: string; title: string; status: string }
  successor?: { id: string; title: string; status: string }
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
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null)
  const [predecessors, setPredecessors] = useState<TaskDependency[]>([])
  const [successors, setSuccessors] = useState<TaskDependency[]>([])
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([])
  const [selectedNewPredecessor, setSelectedNewPredecessor] = useState<AvailableTask | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    story_points: 0,
    assigned_to: '',
    due_date: '',
    start_date: '',
    end_date: '',
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
      fetchDependencies()
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

      // Fetch available tasks for adding predecessors
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('project_id', storyData.project_id)
        .neq('id', storyId)
        .order('title')

      const fullStory = {
        ...storyData,
        subtasks: subtasksData || [],
      }

      setStory(fullStory)
      setAvailableTasks(tasksData || [])
      setFormData({
        title: storyData.title,
        description: storyData.description || '',
        status: storyData.status,
        priority: storyData.priority,
        story_points: storyData.story_points || 0,
        assigned_to: storyData.assigned_to || '',
        due_date: storyData.due_date ? storyData.due_date.split('T')[0] : '',
        start_date: storyData.start_date ? storyData.start_date.split('T')[0] : '',
        end_date: storyData.end_date ? storyData.end_date.split('T')[0] : '',
      })
    } catch (error) {
      console.error('Error fetching story:', error)
      toast.error('Erro ao carregar história')
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencies = async () => {
    try {
      // Fetch predecessors (tasks that this task depends on)
      const { data: predData, error: predError } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          predecessor:tasks!predecessor_id(id, title, status)
        `)
        .eq('successor_id', storyId)

      if (predError) throw predError

      // Fetch successors (tasks that depend on this task)
      const { data: succData, error: succError } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          successor:tasks!successor_id(id, title, status)
        `)
        .eq('predecessor_id', storyId)

      if (succError) throw succError

      setPredecessors(predData || [])
      setSuccessors(succData || [])
    } catch (error) {
      console.error('Error fetching dependencies:', error)
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
      // Calculate planned_duration if we have both start and end dates
      let planned_duration = null
      if (formData.start_date && formData.end_date) {
        const [startYear, startMonth, startDay] = formData.start_date.split('-').map(Number)
        const [endYear, endMonth, endDay] = formData.end_date.split('-').map(Number)
        const start = new Date(startYear, startMonth - 1, startDay)
        const end = new Date(endYear, endMonth - 1, endDay)
        const diffTime = end.getTime() - start.getTime()
        planned_duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        if (planned_duration < 1) planned_duration = 1
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          story_points: formData.story_points,
          assigned_to: formData.assigned_to || null,
          due_date: formData.due_date || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          planned_duration: planned_duration,
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

  const handleAddPredecessor = async () => {
    if (!selectedNewPredecessor) return

    try {
      const { error } = await supabase
        .from('task_dependencies')
        .insert({
          predecessor_id: selectedNewPredecessor.id,
          successor_id: storyId,
          dependency_type: 'FS',
          lag_days: 0,
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta dependência já existe')
        } else {
          throw error
        }
        return
      }

      toast.success('Predecessora adicionada!')
      setSelectedNewPredecessor(null)
      await fetchDependencies()
      onSuccess()
    } catch (error) {
      console.error('Error adding predecessor:', error)
      toast.error('Erro ao adicionar predecessora')
    }
  }

  const handleRemoveDependency = async (dependencyId: string) => {
    try {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId)

      if (error) throw error

      toast.success('Dependência removida!')
      await fetchDependencies()
      onSuccess()
    } catch (error) {
      console.error('Error removing dependency:', error)
      toast.error('Erro ao remover dependência')
    }
  }

  // Check if all predecessors are done
  const hasIncompletePredecessors = predecessors.some(
    (dep) => dep.predecessor && dep.predecessor.status !== 'done'
  )

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
              <Tab icon={<AccountTree />} iconPosition="start" label={`Dependências (${predecessors.length + successors.length})`} />
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
                    {/* Show start_date if set */}
                    {story.start_date && (
                      <Tooltip title="Data de Início">
                        <Chip
                          icon={<CalendarMonth sx={{ fontSize: 16 }} />}
                          label={`Início: ${(() => {
                            const [y, m, d] = story.start_date!.split('T')[0].split('-').map(Number)
                            return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
                          })()}`}
                          sx={{
                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366f1',
                            fontWeight: 600,
                          }}
                        />
                      </Tooltip>
                    )}
                    {/* Show end_date or due_date - prefer end_date for grid tasks, due_date for kanban */}
                    {(story.end_date || story.due_date) && (
                      <Tooltip title={story.end_date ? "Data de Término" : "Data de Conclusão"}>
                        <Chip
                          icon={<CalendarMonth sx={{ fontSize: 16 }} />}
                          label={`${story.end_date ? 'Término' : 'Prazo'}: ${(() => {
                            const dateStr = story.end_date || story.due_date
                            const [y, m, d] = dateStr!.split('T')[0].split('-').map(Number)
                            return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
                          })()}`}
                          sx={{
                            bgcolor: (() => {
                              const dateStr = story.end_date || story.due_date
                              const [y, m, d] = dateStr!.split('T')[0].split('-').map(Number)
                              const dateObj = new Date(y, m - 1, d)
                              const isOverdue = dateObj < new Date() && story.status !== 'done'
                              return isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                            })(),
                            color: (() => {
                              const dateStr = story.end_date || story.due_date
                              const [y, m, d] = dateStr!.split('T')[0].split('-').map(Number)
                              const dateObj = new Date(y, m - 1, d)
                              const isOverdue = dateObj < new Date() && story.status !== 'done'
                              return isOverdue ? '#ef4444' : '#f59e0b'
                            })(),
                            fontWeight: 600,
                          }}
                        />
                      </Tooltip>
                    )}
                    {/* Show duration if calculated */}
                    {story.planned_duration && story.planned_duration > 0 && (
                      <Tooltip title="Duração planejada">
                        <Chip
                          icon={<Timer sx={{ fontSize: 16 }} />}
                          label={`${story.planned_duration} dia${story.planned_duration > 1 ? 's' : ''}`}
                          sx={{
                            bgcolor: 'rgba(139, 92, 246, 0.1)',
                            color: '#8b5cf6',
                            fontWeight: 600,
                          }}
                        />
                      </Tooltip>
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
                    {predecessors.length > 0 && (
                      <Chip
                        icon={<AccountTree sx={{ fontSize: 16 }} />}
                        label={`${predecessors.length} predecessora${predecessors.length > 1 ? 's' : ''}`}
                        sx={{
                          bgcolor: hasIncompletePredecessors
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)',
                          color: hasIncompletePredecessors ? '#ef4444' : '#10b981',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>

                  {/* Warning for incomplete predecessors */}
                  {hasIncompletePredecessors && story.status !== 'done' && (
                    <Alert severity="warning" icon={<Warning />} sx={{ mt: 2 }}>
                      Esta história possui predecessoras não concluídas. Conclua as predecessoras antes de marcar esta história como concluída.
                    </Alert>
                  )}

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

                  {/* Scheduling Dates */}
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mt: 1 }}>
                    Cronograma
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
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
                            <CalendarMonth sx={{ color: '#6366f1' }} />
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
                            <CalendarMonth sx={{ color: '#6366f1' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="Prazo (Ágil)"
                      value={formData.due_date}
                      onChange={(e) => handleChange('due_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarMonth sx={{ color: '#f59e0b' }} />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Data limite ágil"
                    />
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
                          due_date: story.due_date ? story.due_date.split('T')[0] : '',
                          start_date: story.start_date ? story.start_date.split('T')[0] : '',
                          end_date: story.end_date ? story.end_date.split('T')[0] : '',
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
                          <Tooltip title="Editar subtarefa">
                            <IconButton
                              onClick={() => setEditingSubtask(subtask)}
                              sx={{
                                color: '#6366f1',
                                mr: 1,
                                '&:hover': {
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                },
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
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

          {/* Tab 2: Dependencies */}
          {activeTab === 2 && (
            <Box>
              {/* Add new predecessor */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Adicionar Predecessora
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Autocomplete
                    options={availableTasks.filter(
                      (t) => !predecessors.some((p) => p.predecessor_id === t.id)
                    )}
                    getOptionLabel={(option) => option.title}
                    value={selectedNewPredecessor}
                    onChange={(_, newValue) => setSelectedNewPredecessor(newValue)}
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Selecione uma história..."
                        size="small"
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {option.title}
                          </Typography>
                          <Chip
                            label={option.status === 'done' ? 'Concluída' : option.status === 'in-progress' ? 'Em Progresso' : 'Pendente'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: option.status === 'done' ? '#10b98120' : option.status === 'in-progress' ? '#f59e0b20' : '#6b728020',
                              color: option.status === 'done' ? '#10b981' : option.status === 'in-progress' ? '#f59e0b' : '#6b7280',
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddPredecessor}
                    disabled={!selectedNewPredecessor}
                    startIcon={<Add />}
                    sx={{ borderRadius: 2 }}
                  >
                    Adicionar
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Predecessors List */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTree sx={{ color: '#6366f1' }} />
                  Predecessoras ({predecessors.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Histórias que devem ser concluídas antes desta
                </Typography>

                {predecessors.length > 0 ? (
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0, border: '1px solid', borderColor: 'divider' }}>
                    {predecessors.map((dep, index) => (
                      <Box key={dep.id}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: dep.predecessor?.status === 'done' ? '#10b981' : '#f59e0b',
                              mr: 2,
                            }}
                          />
                          <ListItemText
                            primary={dep.predecessor?.title || 'Tarefa não encontrada'}
                            secondary={
                              <Chip
                                label={dep.predecessor?.status === 'done' ? 'Concluída' : dep.predecessor?.status === 'in-progress' ? 'Em Progresso' : 'Pendente'}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  mt: 0.5,
                                  bgcolor: dep.predecessor?.status === 'done' ? '#10b98120' : dep.predecessor?.status === 'in-progress' ? '#f59e0b20' : '#6b728020',
                                  color: dep.predecessor?.status === 'done' ? '#10b981' : dep.predecessor?.status === 'in-progress' ? '#f59e0b' : '#6b7280',
                                }}
                              />
                            }
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Remover dependência">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveDependency(dep.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < predecessors.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                ) : (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      px: 3,
                      borderRadius: 2,
                      bgcolor: 'rgba(99, 102, 241, 0.05)',
                      border: '2px dashed rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma predecessora adicionada
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Successors List */}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon sx={{ color: '#10b981' }} />
                  Sucessoras ({successors.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Histórias que dependem desta
                </Typography>

                {successors.length > 0 ? (
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0, border: '1px solid', borderColor: 'divider' }}>
                    {successors.map((dep, index) => (
                      <Box key={dep.id}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: dep.successor?.status === 'done' ? '#10b981' : '#f59e0b',
                              mr: 2,
                            }}
                          />
                          <ListItemText
                            primary={dep.successor?.title || 'Tarefa não encontrada'}
                            secondary={
                              <Chip
                                label={dep.successor?.status === 'done' ? 'Concluída' : dep.successor?.status === 'in-progress' ? 'Em Progresso' : 'Pendente'}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  mt: 0.5,
                                  bgcolor: dep.successor?.status === 'done' ? '#10b98120' : dep.successor?.status === 'in-progress' ? '#f59e0b20' : '#6b728020',
                                  color: dep.successor?.status === 'done' ? '#10b981' : dep.successor?.status === 'in-progress' ? '#f59e0b' : '#6b7280',
                                }}
                              />
                            }
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Remover dependência">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveDependency(dep.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < successors.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                ) : (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      px: 3,
                      borderRadius: 2,
                      bgcolor: 'rgba(16, 185, 129, 0.05)',
                      border: '2px dashed rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma história depende desta
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Modal>

      <CreateSubtaskModal
        open={createSubtaskOpen || !!editingSubtask}
        onClose={() => {
          setCreateSubtaskOpen(false)
          setEditingSubtask(null)
        }}
        onSuccess={async () => {
          setCreateSubtaskOpen(false)
          setEditingSubtask(null)
          await fetchStory()
          onSuccess()
        }}
        taskId={storyId}
        subtask={editingSubtask}
      />
    </>
  )
}
