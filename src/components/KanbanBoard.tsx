import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Divider } from '@mui/material'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'
import StoryDetailsModal from './StoryDetailsModal'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'

interface Sprint {
  id: string
  name: string
  status: string
}

interface UserStory {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string
  due_date?: string | null
  start_date?: string | null
  end_date?: string | null
  profiles?: { full_name: string }
  subtasks?: Array<{ status: string }>
}

interface TaskDependency {
  predecessor_id: string
  predecessor_status: string
}

interface KanbanBoardProps {
  stories: UserStory[]
  onRefresh: () => void
  onDeleteStory: (storyId: string, title: string) => void
  currentSprintId?: string
}

const columns = [
  { id: 'todo', label: 'A Fazer', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
  { id: 'in-progress', label: 'Em Progresso', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  { id: 'review', label: 'Em Revisão', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  { id: 'done', label: 'Concluído', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  { id: 'blocked', label: 'Bloqueado', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
]

// Droppable Column Component
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const droppableId = `column-${id}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        minHeight: 300,
        overflowY: 'auto',
        pr: 0.5,
        transition: 'all 0.2s ease',
        borderRadius: 2,
        bgcolor: isOver ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
        border: isOver ? '2px dashed rgba(99, 102, 241, 0.5)' : '2px dashed transparent',
      }}
    >
      {children}
    </Box>
  )
}

export default function KanbanBoard({ stories, onRefresh, onDeleteStory, currentSprintId }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [storiesByStatus, setStoriesByStatus] = useState<Record<string, UserStory[]>>({})
  const [storyDetailsOpen, setStoryDetailsOpen] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string>('')
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [storyToReplicate, setStoryToReplicate] = useState<string | null>(null)
  const [storyDependencies, setStoryDependencies] = useState<Record<string, TaskDependency[]>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Celebration confetti animation with sound
  const celebrateCompletion = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    // Play celebration sound
    const audio = new Audio('/brasil.mpeg')
    audio.volume = 0.5
    audio.play().catch((error) => {
      console.log('Audio playback failed:', error)
    })

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // Launch confetti from random positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#10b981', '#6366f1', '#8b5cf6', '#f59e0b', '#ef4444'],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#10b981', '#6366f1', '#8b5cf6', '#f59e0b', '#ef4444'],
      })
    }, 250)
  }

  useEffect(() => {
    // Group stories by status
    const grouped = columns.reduce((acc, col) => {
      acc[col.id] = stories.filter((story) => story.status === col.id)
      return acc
    }, {} as Record<string, UserStory[]>)

    setStoriesByStatus(grouped)
  }, [stories])

  // Fetch dependencies for all stories
  useEffect(() => {
    const fetchDependencies = async () => {
      const storyIds = stories.map((s) => s.id)
      if (storyIds.length === 0) return

      try {
        const { data, error } = await supabase
          .from('task_dependencies')
          .select(`
            successor_id,
            predecessor_id,
            predecessor:tasks!predecessor_id(status)
          `)
          .in('successor_id', storyIds)

        if (error) throw error

        // Group dependencies by successor_id
        const depsMap: Record<string, TaskDependency[]> = {}
        data?.forEach((dep: any) => {
          if (!depsMap[dep.successor_id]) {
            depsMap[dep.successor_id] = []
          }
          depsMap[dep.successor_id].push({
            predecessor_id: dep.predecessor_id,
            predecessor_status: dep.predecessor?.status || 'todo',
          })
        })
        setStoryDependencies(depsMap)
      } catch (error) {
        console.error('Error fetching dependencies:', error)
      }
    }

    fetchDependencies()
  }, [stories])

  // Check if a story can be moved to done (all predecessors must be done)
  const canMoveToDone = (storyId: string): { allowed: boolean; reason?: string } => {
    const deps = storyDependencies[storyId]
    if (!deps || deps.length === 0) return { allowed: true }

    const incompletePredecessors = deps.filter((d) => d.predecessor_status !== 'done')
    if (incompletePredecessors.length > 0) {
      return {
        allowed: false,
        reason: `${incompletePredecessors.length} predecessora(s) não concluída(s)`,
      }
    }
    return { allowed: true }
  }

  // Get predecessor count for a story
  const getPredecessorInfo = (storyId: string) => {
    const deps = storyDependencies[storyId]
    if (!deps || deps.length === 0) return null
    const incomplete = deps.filter((d) => d.predecessor_status !== 'done').length
    return { total: deps.length, incomplete }
  }

  // Fetch available sprints when dialog opens
  useEffect(() => {
    if (sprintDialogOpen) {
      fetchAvailableSprints()
    }
  }, [sprintDialogOpen])

  const fetchAvailableSprints = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, name, status')
        .in('status', ['planning', 'active'])
        .order('start_date', { ascending: false })

      if (error) throw error
      // Filter out the current sprint
      const filteredSprints = (data || []).filter((s) => s.id !== currentSprintId)
      setSprints(filteredSprints)
    } catch (error) {
      console.error('Error fetching sprints:', error)
      toast.error('Erro ao carregar sprints')
    }
  }

  const handleOpenReplicateDialog = (storyId: string) => {
    setStoryToReplicate(storyId)
    setSprintDialogOpen(true)
  }

  const handleReplicateToSprint = async (targetSprintId: string) => {
    if (!storyToReplicate) return

    try {
      // Fetch the complete story data including project_id
      const { data: storyToClone, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', storyToReplicate)
        .single()

      if (fetchError) throw fetchError

      if (!storyToClone) {
        toast.error('História não encontrada')
        return
      }

      // Create a copy of the story in the target sprint
      const { error } = await supabase.from('tasks').insert({
        title: storyToClone.title,
        description: storyToClone.description,
        status: 'todo', // Reset status for the new sprint
        priority: storyToClone.priority,
        story_points: storyToClone.story_points,
        assigned_to: storyToClone.assigned_to,
        sprint_id: targetSprintId,
        project_id: storyToClone.project_id,
      })

      if (error) throw error

      toast.success('História replicada com sucesso!')
      setSprintDialogOpen(false)
      setStoryToReplicate(null)
    } catch (error) {
      console.error('Error replicating story:', error)
      toast.error('Erro ao replicar história')
    }
  }

  const handleSendToBacklog = async (storyId: string, storyTitle: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja enviar "${storyTitle}" para o Backlog?\n\nA história será removida deste sprint.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ sprint_id: null, status: 'todo' })
        .eq('id', storyId)

      if (error) throw error

      toast.success('História enviada para o Backlog!')
      onRefresh()
    } catch (error) {
      console.error('Error sending to backlog:', error)
      toast.error('Erro ao enviar para o Backlog')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    let overId = over.id as string

    // Check if we're over a column droppable (has 'column-' prefix)
    if (overId.startsWith('column-')) {
      overId = overId.replace('column-', '')
    }

    // Find the active story from the current grouped state
    let activeStory: UserStory | undefined
    let currentStatus = ''

    for (const [status, storyList] of Object.entries(storiesByStatus)) {
      const found = storyList.find((s) => s.id === activeId)
      if (found) {
        activeStory = found
        currentStatus = status
        break
      }
    }

    if (!activeStory) return

    // Check if we're over a column (not a card)
    const isOverColumn = columns.some((col) => col.id === overId)

    // If we're over a card, find which column it belongs to
    let targetColumn = overId
    if (!isOverColumn) {
      for (const [status, storyList] of Object.entries(storiesByStatus)) {
        if (storyList.some((s) => s.id === overId)) {
          targetColumn = status
          break
        }
      }
    }

    // Only update if actually moving to a different column
    if (currentStatus !== targetColumn && columns.some((col) => col.id === targetColumn)) {
      setStoriesByStatus((prev) => {
        const newState = { ...prev }

        // Remove from current column
        newState[currentStatus] = newState[currentStatus].filter((s) => s.id !== activeId)

        // Add to target column
        if (!newState[targetColumn]) {
          newState[targetColumn] = []
        }
        newState[targetColumn] = [...newState[targetColumn], { ...activeStory!, status: targetColumn }]

        return newState
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      // Reset to original state if dropped outside
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = stories.filter((story) => story.status === col.id)
        return acc
      }, {} as Record<string, UserStory[]>)
      setStoriesByStatus(grouped)
      return
    }

    const storyId = active.id as string
    let overId = over.id as string

    // Check if we're over a column droppable (has 'column-' prefix)
    if (overId.startsWith('column-')) {
      overId = overId.replace('column-', '')
    }

    // Find the original story from the stories prop
    const story = stories.find((s) => s.id === storyId)
    if (!story) {
      // Reset if story not found
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = stories.filter((story) => story.status === col.id)
        return acc
      }, {} as Record<string, UserStory[]>)
      setStoriesByStatus(grouped)
      return
    }

    // Determine the target column
    let newStatus = overId

    // Check if we're over a column
    const isOverColumn = columns.some((col) => col.id === overId)

    // If dropped over a card, find which column it belongs to
    if (!isOverColumn) {
      for (const [status, storyList] of Object.entries(storiesByStatus)) {
        if (storyList.some((s) => s.id === overId)) {
          newStatus = status
          break
        }
      }
    }

    // Check if it's a valid column
    const isValidColumn = columns.some((col) => col.id === newStatus)
    if (!isValidColumn) {
      // Reset to original state
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = stories.filter((story) => story.status === col.id)
        return acc
      }, {} as Record<string, UserStory[]>)
      setStoriesByStatus(grouped)
      return
    }

    // Don't update if status hasn't changed
    if (story.status === newStatus) {
      return
    }

    // Check if moving to "done" and has incomplete predecessors
    if (newStatus === 'done') {
      const check = canMoveToDone(storyId)
      if (!check.allowed) {
        toast.error(`Não é possível concluir: ${check.reason}`, {
          duration: 4000,
          icon: '⚠️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
            fontWeight: 600,
          },
        })
        // Reset to original state
        const grouped = columns.reduce((acc, col) => {
          acc[col.id] = stories.filter((story) => story.status === col.id)
          return acc
        }, {} as Record<string, UserStory[]>)
        setStoriesByStatus(grouped)
        return
      }
    }

    // Check if blocking a story that has successors
    if (newStatus === 'blocked' && story.status !== 'blocked') {
      // Check if this story has successors
      const successorCheck = Object.entries(storyDependencies).some(
        ([, deps]) => deps.some((d) => d.predecessor_id === storyId)
      )
      if (successorCheck) {
        toast('⚠️ Atenção: esta história possui dependentes que também serão afetados', {
          duration: 4000,
          style: {
            background: '#fef3c7',
            color: '#92400e',
          },
        })
      }
    }

    try {
      // Update status in database
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', storyId)

      if (error) throw error

      // Celebrate if moved to 'done' column
      if (newStatus === 'done') {
        celebrateCompletion()
        toast.success('🎉 Parabéns! Tarefa concluída!', {
          duration: 4000,
          icon: '✨',
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontWeight: 600,
          },
        })
      } else {
        toast.success('Status atualizado com sucesso!')
      }

      onRefresh()
    } catch (error) {
      console.error('Error updating story status:', error)
      toast.error('Erro ao atualizar status')
      // Reset to original state on error
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = stories.filter((story) => story.status === col.id)
        return acc
      }, {} as Record<string, UserStory[]>)
      setStoriesByStatus(grouped)
    }
  }

  const getColumnStats = (columnId: string) => {
    const columnStories = storiesByStatus[columnId] || []
    const totalPoints = columnStories.reduce((sum, story) => sum + (story.story_points || 0), 0)
    return {
      count: columnStories.length,
      points: totalPoints,
    }
  }

  const activeStory = activeId ? stories.find((s) => s.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 2,
          pb: 2,
        }}
      >
        {columns.map((column) => {
          const stats = getColumnStats(column.id)
          const columnStories = storiesByStatus[column.id] || []

          return (
            <SortableContext
              key={column.id}
              id={column.id}
              items={columnStories.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: column.bgColor,
                  border: `2px solid ${column.color}30`,
                  minHeight: 500,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Column Header */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: column.color }}>
                      {column.label}
                    </Typography>
                    <Chip
                      label={stats.count}
                      size="small"
                      sx={{
                        bgcolor: 'white',
                        color: column.color,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 24,
                      }}
                    />
                  </Box>

                  {stats.points > 0 && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {stats.points} pontos
                    </Typography>
                  )}
                </Box>

                {/* Cards */}
                <DroppableColumn id={column.id}>
                  {columnStories.length === 0 ? (
                    <Box
                      sx={{
                        textAlign: 'center',
                        py: 6,
                        px: 2,
                        borderRadius: 2,
                        border: `2px dashed ${column.color}40`,
                        bgcolor: 'rgba(255,255,255,0.5)',
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Arraste histórias aqui
                      </Typography>
                    </Box>
                  ) : (
                    columnStories.map((story) => (
                      <KanbanCard
                        key={story.id}
                        story={story}
                        onDelete={onDeleteStory}
                        onClick={(storyId) => {
                          setSelectedStoryId(storyId)
                          setStoryDetailsOpen(true)
                        }}
                        onReplicate={currentSprintId ? handleOpenReplicateDialog : undefined}
                        onSendToBacklog={currentSprintId ? handleSendToBacklog : undefined}
                        predecessorInfo={getPredecessorInfo(story.id)}
                      />
                    ))
                  )}
                </DroppableColumn>
              </Paper>
            </SortableContext>
          )
        })}
      </Box>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeStory ? (
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: 'white',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              cursor: 'grabbing',
              transform: 'rotate(-2deg)',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {activeStory.title}
            </Typography>
          </Box>
        ) : null}
      </DragOverlay>

      {/* Story Details Modal */}
      {storyDetailsOpen && (
        <StoryDetailsModal
          open={storyDetailsOpen}
          onClose={() => {
            setStoryDetailsOpen(false)
            setSelectedStoryId('')
          }}
          onSuccess={onRefresh}
          storyId={selectedStoryId}
        />
      )}

      {/* Sprint Selection Dialog for Replication */}
      <Dialog
        open={sprintDialogOpen}
        onClose={() => {
          setSprintDialogOpen(false)
          setStoryToReplicate(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Replicar História para Sprint</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione o sprint para onde deseja replicar esta história
          </Typography>
          {sprints.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Nenhum outro sprint disponível. Crie um novo sprint primeiro.
            </Typography>
          ) : (
            <List>
              {sprints.map((sprint, index) => (
                <Box key={sprint.id}>
                  <ListItem
                    component="div"
                    onClick={() => handleReplicateToSprint(sprint.id)}
                    sx={{
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.05)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={sprint.name}
                      secondary={sprint.status === 'active' ? 'Ativo' : 'Planejamento'}
                    />
                    <Chip
                      label={sprint.status === 'active' ? 'Ativo' : 'Planejamento'}
                      size="small"
                      color={sprint.status === 'active' ? 'success' : 'warning'}
                    />
                  </ListItem>
                  {index < sprints.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSprintDialogOpen(false)
              setStoryToReplicate(null)
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </DndContext>
  )
}
