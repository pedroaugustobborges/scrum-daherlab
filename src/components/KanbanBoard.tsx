import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'
import StoryDetailsModal from './StoryDetailsModal'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'

interface UserStory {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string
  profiles?: { full_name: string }
  subtasks?: Array<{ status: string }>
}

interface KanbanBoardProps {
  stories: UserStory[]
  onRefresh: () => void
  onDeleteStory: (storyId: string, title: string) => void
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
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        overflowY: 'auto',
        pr: 0.5,
        transition: 'all 0.2s ease',
        borderRadius: 2,
        ...(isOver && {
          bgcolor: 'rgba(99, 102, 241, 0.05)',
        }),
      }}
    >
      {children}
    </Box>
  )
}

export default function KanbanBoard({ stories, onRefresh, onDeleteStory }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [storiesByStatus, setStoriesByStatus] = useState<Record<string, UserStory[]>>({})
  const [storyDetailsOpen, setStoryDetailsOpen] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string>('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Celebration confetti animation
  const celebrateCompletion = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

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
    const overId = over.id as string

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
      collisionDetection={closestCorners}
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
                        py: 4,
                        px: 2,
                        borderRadius: 2,
                        border: `2px dashed ${column.color}30`,
                        bgcolor: 'white',
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
    </DndContext>
  )
}
