import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Add,
  ExpandMore,
  Assignment,
  Flag,
  Person,
  Delete,
  CheckCircle,
  Functions,
  Timer,
  ViewKanban,
  ViewList,
  EmojiEvents,
  Visibility,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import CreateUserStoryModal from './CreateUserStoryModal'
import CreateSubtaskModal from './CreateSubtaskModal'
import KanbanBoard from './KanbanBoard'
import BurndownChart from './BurndownChart'
import VelocityChart from './VelocityChart'
import RetrospectiveBoard from './RetrospectiveBoard'
import ReviewMeetingForm from './ReviewMeetingForm'
import { supabase } from '@/lib/supabase'

interface SprintDetailsModalProps {
  open: boolean
  onClose: () => void
  sprint: {
    id: string
    name: string
    project_id: string
    team_id: string
    start_date: string
    end_date: string
  }
}

interface UserStory {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string
  profiles?: { full_name: string }
  assigned_to_profile?: { full_name: string }
  subtasks?: Subtask[]
}

interface Subtask {
  id: string
  title: string
  description: string
  status: string
  estimated_hours: number
  assigned_to: string
  profiles?: { full_name: string }
  assigned_to_profile?: { full_name: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'A Fazer', color: '#6b7280' },
  'in-progress': { label: 'Em Progresso', color: '#f59e0b' },
  review: { label: 'Em Revisão', color: '#8b5cf6' },
  done: { label: 'Concluído', color: '#10b981' },
  blocked: { label: 'Bloqueado', color: '#ef4444' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#6b7280' },
  medium: { label: 'Média', color: '#f59e0b' },
  high: { label: 'Alta', color: '#ef4444' },
  urgent: { label: 'Urgente', color: '#dc2626' },
}

export default function SprintDetailsModal({ open, onClose, sprint }: SprintDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [stories, setStories] = useState<UserStory[]>([])
  const [createStoryOpen, setCreateStoryOpen] = useState(false)
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (open) {
      fetchUserStories()
    }
  }, [open, sprint.id])

  const fetchUserStories = async () => {
    setLoading(true)
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('tasks')
        .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
        .eq('sprint_id', sprint.id)
        .order('created_at', { ascending: true })

      if (storiesError) throw storiesError

      // Transform stories to handle assigned_to_profile array
      const transformedStories = (storiesData || []).map((story: any) => ({
        ...story,
        assigned_to_profile: Array.isArray(story.assigned_to_profile)
          ? story.assigned_to_profile[0]
          : story.assigned_to_profile,
      }))

      // Fetch subtasks for each story
      const storiesWithSubtasks = await Promise.all(
        transformedStories.map(async (story) => {
          // Try to fetch subtasks, but don't fail if table doesn't exist
          try {
            const { data: subtasksData } = await supabase
              .from('subtasks')
              .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
              .eq('task_id', story.id)
              .order('created_at', { ascending: true })

            // Transform subtasks to handle assigned_to_profile array
            const transformedSubtasks = (subtasksData || []).map((subtask: any) => ({
              ...subtask,
              assigned_to_profile: Array.isArray(subtask.assigned_to_profile)
                ? subtask.assigned_to_profile[0]
                : subtask.assigned_to_profile,
            }))

            return {
              ...story,
              subtasks: transformedSubtasks,
            }
          } catch (subtaskError) {
            console.warn('Subtasks table may not exist:', subtaskError)
            return {
              ...story,
              subtasks: [],
            }
          }
        })
      )

      setStories(storiesWithSubtasks)
    } catch (error) {
      console.error('Error fetching user stories:', error)
      toast.error('Erro ao carregar histórias de usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStory = async (storyId: string, storyTitle: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a história "${storyTitle}"?\n\nTodas as subtarefas também serão excluídas. Esta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', storyId)

      if (error) throw error

      toast.success('História excluída com sucesso!')
      await fetchUserStories()
    } catch (error) {
      console.error('Error deleting story:', error)
      toast.error('Erro ao excluir história')
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)

      if (error) throw error

      toast.success('Subtarefa excluída com sucesso!')
      await fetchUserStories()
    } catch (error) {
      console.error('Error deleting subtask:', error)
      toast.error('Erro ao excluir subtarefa')
    }
  }

  const handleToggleSubtaskStatus = async (subtask: Subtask) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done'

    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ status: newStatus })
        .eq('id', subtask.id)

      if (error) throw error

      await fetchUserStories()
    } catch (error) {
      console.error('Error updating subtask:', error)
      toast.error('Erro ao atualizar subtarefa')
    }
  }

  const handleOpenSubtaskModal = (storyId: string) => {
    setSelectedStoryId(storyId)
    setCreateSubtaskOpen(true)
  }

  const calculateStoryProgress = (story: UserStory) => {
    if (!story.subtasks || story.subtasks.length === 0) return 0
    const completed = story.subtasks.filter((st) => st.status === 'done').length
    return Math.round((completed / story.subtasks.length) * 100)
  }

  const getTotalPoints = () => {
    return stories.reduce((sum, story) => sum + (story.story_points || 0), 0)
  }

  const getCompletedPoints = () => {
    return stories
      .filter((story) => story.status === 'done')
      .reduce((sum, story) => sum + (story.story_points || 0), 0)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Sprint: ${sprint.name}`} maxWidth="lg">
        <Box>
          {/* Tabs Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                },
              }}
            >
              <Tab icon={<Assignment />} iconPosition="start" label="Histórias" />
              <Tab icon={<EmojiEvents />} iconPosition="start" label="Retrospectiva" />
              <Tab icon={<Visibility />} iconPosition="start" label="Review" />
            </Tabs>
          </Box>

          {/* Tab Panel 0: Stories */}
          {activeTab === 0 && (
            <>
              {/* Statistics */}
              <Box
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                }}
              >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Resumo do Sprint
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => {
                    if (newMode !== null) setViewMode(newMode)
                  }}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      border: '2px solid rgba(99, 102, 241, 0.2)',
                      '&.Mui-selected': {
                        bgcolor: '#6366f1',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#4f46e5',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="kanban">
                    <ViewKanban sx={{ fontSize: 18, mr: 0.5 }} />
                    Kanban
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ViewList sx={{ fontSize: 18, mr: 0.5 }} />
                    Lista
                  </ToggleButton>
                </ToggleButtonGroup>

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateStoryOpen(true)}
                  sx={{
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  Nova História
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Total de Histórias
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
                  {stories.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Concluídas
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981' }}>
                  {stories.filter((s) => s.status === 'done').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Story Points
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
                  {getCompletedPoints()} / {getTotalPoints()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Progresso
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#8b5cf6' }}>
                  {getTotalPoints() > 0 ? Math.round((getCompletedPoints() / getTotalPoints()) * 100) : 0}%
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Analytics Charts */}
          {!loading && stories.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Analytics
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                  gap: 3,
                }}
              >
                <BurndownChart
                  sprint={{
                    start_date: sprint.start_date,
                    end_date: sprint.end_date,
                  }}
                  stories={stories}
                />
                <VelocityChart teamId={sprint.team_id} currentSprintId={sprint.id} />
              </Box>
            </Box>
          )}

          {/* User Stories List */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : stories.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                borderRadius: 3,
                bgcolor: 'rgba(99, 102, 241, 0.05)',
                border: '2px dashed rgba(99, 102, 241, 0.2)',
              }}
            >
              <Assignment sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Nenhuma história criada ainda
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Crie sua primeira história de usuário para este sprint
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateStoryOpen(true)}
                sx={{ px: 4, py: 1.5 }}
              >
                Criar Primeira História
              </Button>
            </Box>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              stories={stories}
              onRefresh={fetchUserStories}
              onStoryClick={(storyId) => {
                const story = stories.find((s) => s.id === storyId)
                if (story) {
                  handleOpenSubtaskModal(story.id)
                }
              }}
              onDeleteStory={handleDeleteStory}
            />
          ) : (
            <Stack spacing={2}>
              {stories.map((story) => (
                <Accordion
                  key={story.id}
                  elevation={0}
                  sx={{
                    border: '2px solid rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px !important',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      border: '2px solid rgba(99, 102, 241, 0.3)',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      borderRadius: 3,
                      '&.Mui-expanded': {
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, mr: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Assignment sx={{ color: 'white', fontSize: 20 }} />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={700}>
                          {story.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={statusConfig[story.status]?.label || story.status}
                            size="small"
                            sx={{
                              bgcolor: `${statusConfig[story.status]?.color}20`,
                              color: statusConfig[story.status]?.color,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                          <Chip
                            label={priorityConfig[story.priority]?.label || story.priority}
                            size="small"
                            icon={<Flag sx={{ fontSize: 14 }} />}
                            sx={{
                              bgcolor: `${priorityConfig[story.priority]?.color}20`,
                              color: priorityConfig[story.priority]?.color,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                          {story.story_points > 0 && (
                            <Chip
                              label={`${story.story_points} pts`}
                              size="small"
                              icon={<Functions sx={{ fontSize: 14 }} />}
                              sx={{
                                bgcolor: 'rgba(99, 102, 241, 0.1)',
                                color: '#6366f1',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                          {story.assigned_to_profile?.full_name && (
                            <Chip
                              label={story.assigned_to_profile.full_name}
                              size="small"
                              icon={<Person sx={{ fontSize: 14 }} />}
                              sx={{
                                bgcolor: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      <Tooltip title="Excluir História">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteStory(story.id, story.title)
                          }}
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
                  </AccordionSummary>

                  <AccordionDetails>
                    {story.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                        {story.description}
                      </Typography>
                    )}

                    {/* Subtasks Progress */}
                    {story.subtasks && story.subtasks.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Progresso das Subtarefas
                          </Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#6366f1' }}>
                            {calculateStoryProgress(story)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={calculateStoryProgress(story)}
                          sx={{
                            height: 6,
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

                    {/* Subtasks List */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          Subtarefas ({story.subtasks?.length || 0})
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => handleOpenSubtaskModal(story.id)}
                          sx={{
                            px: 2,
                            py: 0.5,
                            fontSize: '0.875rem',
                          }}
                        >
                          Adicionar
                        </Button>
                      </Box>

                      {story.subtasks && story.subtasks.length > 0 ? (
                        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0 }}>
                          {story.subtasks.map((subtask, index) => (
                            <Box key={subtask.id}>
                              <ListItem
                                sx={{
                                  py: 1.5,
                                  '&:hover': {
                                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                                  },
                                }}
                              >
                                <Tooltip title={subtask.status === 'done' ? 'Marcar como pendente' : 'Marcar como concluído'}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleSubtaskStatus(subtask)}
                                    sx={{ mr: 1 }}
                                  >
                                    <CheckCircle
                                      sx={{
                                        color: subtask.status === 'done' ? '#10b981' : '#d1d5db',
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                                <ListItemText
                                  primary={
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        textDecoration: subtask.status === 'done' ? 'line-through' : 'none',
                                        color: subtask.status === 'done' ? 'text.secondary' : 'text.primary',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {subtask.title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                      {subtask.estimated_hours && (
                                        <Chip
                                          label={`${subtask.estimated_hours}h`}
                                          size="small"
                                          icon={<Timer sx={{ fontSize: 12 }} />}
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                                            color: '#6366f1',
                                          }}
                                        />
                                      )}
                                      {subtask.assigned_to_profile?.full_name && (
                                        <Chip
                                          label={subtask.assigned_to_profile.full_name}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
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
                                    size="small"
                                    onClick={() => handleDeleteSubtask(subtask.id)}
                                    sx={{
                                      color: 'error.main',
                                      '&:hover': {
                                        bgcolor: 'error.lighter',
                                      },
                                    }}
                                  >
                                    <Delete fontSize="small" />
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
                            py: 3,
                            px: 2,
                            borderRadius: 2,
                            bgcolor: 'rgba(99, 102, 241, 0.05)',
                            border: '1px dashed rgba(99, 102, 241, 0.2)',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma subtarefa adicionada
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
            </>
          )}

          {/* Tab Panel 1: Retrospective */}
          {activeTab === 1 && (
            <RetrospectiveBoard sprintId={sprint.id} sprintName={sprint.name} />
          )}

          {/* Tab Panel 2: Review */}
          {activeTab === 2 && (
            <ReviewMeetingForm sprintId={sprint.id} sprintName={sprint.name} stories={stories} />
          )}
        </Box>
      </Modal>

      <CreateUserStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onSuccess={fetchUserStories}
        sprintId={sprint.id}
        projectId={sprint.project_id}
      />

      <CreateSubtaskModal
        open={createSubtaskOpen}
        onClose={() => {
          setCreateSubtaskOpen(false)
          setSelectedStoryId('')
        }}
        onSuccess={fetchUserStories}
        taskId={selectedStoryId}
      />
    </>
  )
}
