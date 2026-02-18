import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  TextField,
  InputAdornment,
  Avatar,
  alpha,
  LinearProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Search,
  Person,
  Assignment,
  Flag,
  Functions,
  DragIndicator,
  MoreVert,
  OpenInNew,
  CalendarMonth,
  ViewKanban,
} from '@mui/icons-material'
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
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import StoryDetailsModal from '@/components/StoryDetailsModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import confetti from 'canvas-confetti'

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string | null
  due_date: string | null
  start_date: string | null
  end_date: string | null
  project_id: string
  project?: { id: string; name: string }
  profiles?: { full_name: string }
  subtasks?: Array<{ status: string }>
}

interface Project {
  id: string
  name: string
}

const columns = [
  { id: 'todo', label: 'A Fazer', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.08)' },
  { id: 'in-progress', label: 'Em Progresso', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.08)' },
  { id: 'review', label: 'Em Revisão', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.08)' },
  { id: 'done', label: 'Concluído', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  { id: 'blocked', label: 'Bloqueado', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
]

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#6b7280' },
  medium: { label: 'Média', color: '#f59e0b' },
  high: { label: 'Alta', color: '#ef4444' },
  urgent: { label: 'Urgente', color: '#dc2626' },
}

// Planner Card Component with project indicator
function PlannerCard({
  task,
  onClick,
  onNavigateToProject,
}: {
  task: Task
  onClick: (id: string) => void
  onNavigateToProject: (projectId: string) => void
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const calculateProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) return 0
    const completed = task.subtasks.filter((st) => st.status === 'done').length
    return Math.round((completed / task.subtasks.length) * 100)
  }

  const progress = calculateProgress()

  // Get effective deadline
  const effectiveDeadline = task.due_date || task.end_date
  const isDeadlinePassed = (() => {
    if (!effectiveDeadline) return false
    const [y, m, d] = effectiveDeadline.split('T')[0].split('-').map(Number)
    const deadlineDate = new Date(y, m - 1, d)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return deadlineDate < today
  })()

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 3,
        bgcolor: 'white',
        border: '2px solid rgba(99, 102, 241, 0.1)',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: '2px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          transform: isDragging ? 'none' : 'translateY(-2px)',
        },
      }}
    >
      {/* Header with drag handle and project badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#9ca3af',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicator sx={{ fontSize: 18 }} />
          <Assignment sx={{ fontSize: 18, color: '#6366f1' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Project Badge */}
          {task.project && (
            <Tooltip title={`Projeto: ${task.project.name}`}>
              <Chip
                label={task.project.name}
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigateToProject(task.project!.id)
                }}
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: alpha('#6366f1', 0.1),
                  color: '#6366f1',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha('#6366f1', 0.2),
                  },
                }}
              />
            </Tooltip>
          )}

          <Tooltip title="Ações">
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{
                width: 24,
                height: 24,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(99, 102, 241, 0.2)',
                },
              }}
            >
              <MoreVert sx={{ fontSize: 14, color: '#6366f1' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={() => {
              onClick(task.id)
              handleMenuClose()
            }}
          >
            <ListItemIcon>
              <OpenInNew fontSize="small" sx={{ color: '#6366f1' }} />
            </ListItemIcon>
            <ListItemText>Ver Detalhes</ListItemText>
          </MenuItem>
          {task.project && (
            <MenuItem
              onClick={() => {
                onNavigateToProject(task.project!.id)
                handleMenuClose()
              }}
            >
              <ListItemIcon>
                <ViewKanban fontSize="small" sx={{ color: '#10b981' }} />
              </ListItemIcon>
              <ListItemText>Ir para Projeto</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>

      {/* Card Content */}
      <Box onClick={() => onClick(task.id)} sx={{ cursor: 'pointer' }}>
        {/* Title */}
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {task.title}
        </Typography>

        {/* Metadata */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
          {task.priority && (
            <Chip
              label={priorityConfig[task.priority]?.label || task.priority}
              size="small"
              icon={<Flag sx={{ fontSize: 12 }} />}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: `${priorityConfig[task.priority]?.color}20`,
                color: priorityConfig[task.priority]?.color,
                fontWeight: 600,
                '& .MuiChip-icon': { fontSize: 12 },
              }}
            />
          )}

          {task.story_points > 0 && (
            <Chip
              label={`${task.story_points} pts`}
              size="small"
              icon={<Functions sx={{ fontSize: 12 }} />}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                fontWeight: 600,
                '& .MuiChip-icon': { fontSize: 12 },
              }}
            />
          )}

          {effectiveDeadline && (
            <Tooltip title={`${task.due_date ? 'Prazo' : 'Término'}: ${(() => {
              const [y, m, d] = effectiveDeadline.split('T')[0].split('-').map(Number)
              return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
            })()}`}>
              <Chip
                label={(() => {
                  const [y, m, d] = effectiveDeadline.split('T')[0].split('-').map(Number)
                  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                })()}
                size="small"
                icon={<CalendarMonth sx={{ fontSize: 12 }} />}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: isDeadlinePassed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: isDeadlinePassed ? '#ef4444' : '#f59e0b',
                  fontWeight: 600,
                  '& .MuiChip-icon': { fontSize: 12 },
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Subtasks Progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {task.subtasks.filter((st) => st.status === 'done').length}/{task.subtasks.length} subtarefas
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#6366f1' }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
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

        {/* Assignee */}
        {task.profiles?.full_name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: '#6366f1',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {task.profiles.full_name.charAt(0)}
            </Avatar>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {task.profiles.full_name}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

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

export default function Planner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, Task[]>>({})
  const [filter, setFilter] = useState<'all' | 'assigned'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [storyDetailsOpen, setStoryDetailsOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [tasks, filter, searchQuery, selectedProject, user])

  useEffect(() => {
    // Group filtered tasks by status
    const grouped = columns.reduce((acc, col) => {
      acc[col.id] = filteredTasks.filter((task) => task.status === col.id)
      return acc
    }, {} as Record<string, Task[]>)
    setTasksByStatus(grouped)
  }, [filteredTasks])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all tasks with project info
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects!project_id(id, name),
          profiles:profiles!assigned_to(full_name)
        `)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      // Fetch subtasks for each task
      const taskIds = (tasksData || []).map((t) => t.id)
      let subtasksMap: Record<string, Array<{ status: string }>> = {}

      if (taskIds.length > 0) {
        const { data: subtasksData } = await supabase
          .from('subtasks')
          .select('task_id, status')
          .in('task_id', taskIds)

        if (subtasksData) {
          subtasksData.forEach((st) => {
            if (!subtasksMap[st.task_id]) {
              subtasksMap[st.task_id] = []
            }
            subtasksMap[st.task_id].push({ status: st.status })
          })
        }
      }

      const tasksWithSubtasks = (tasksData || []).map((task) => ({
        ...task,
        subtasks: subtasksMap[task.id] || [],
      }))

      setTasks(tasksWithSubtasks)

      // Get unique projects
      const uniqueProjects = Array.from(
        new Map((tasksData || []).filter((t) => t.project).map((t) => [t.project.id, t.project])).values()
      )
      setProjects(uniqueProjects)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar tarefas')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...tasks]

    // Filter by assignment
    if (filter === 'assigned' && user) {
      filtered = filtered.filter((task) => task.assigned_to === user.id)
    }

    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter((task) => task.project_id === selectedProject)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.project?.name.toLowerCase().includes(query)
      )
    }

    setFilteredTasks(filtered)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    let overId = over.id as string

    if (overId.startsWith('column-')) {
      overId = overId.replace('column-', '')
    }

    // Find the active task
    let activeTask: Task | undefined
    let currentStatus = ''

    for (const [status, taskList] of Object.entries(tasksByStatus)) {
      const found = taskList.find((t) => t.id === activeId)
      if (found) {
        activeTask = found
        currentStatus = status
        break
      }
    }

    if (!activeTask) return

    const isOverColumn = columns.some((col) => col.id === overId)
    let targetColumn = overId

    if (!isOverColumn) {
      for (const [status, taskList] of Object.entries(tasksByStatus)) {
        if (taskList.some((t) => t.id === overId)) {
          targetColumn = status
          break
        }
      }
    }

    if (currentStatus !== targetColumn && columns.some((col) => col.id === targetColumn)) {
      setTasksByStatus((prev) => {
        const newState = { ...prev }
        newState[currentStatus] = newState[currentStatus].filter((t) => t.id !== activeId)
        if (!newState[targetColumn]) {
          newState[targetColumn] = []
        }
        newState[targetColumn] = [...newState[targetColumn], { ...activeTask!, status: targetColumn }]
        return newState
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      // Reset
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = filteredTasks.filter((task) => task.status === col.id)
        return acc
      }, {} as Record<string, Task[]>)
      setTasksByStatus(grouped)
      return
    }

    const taskId = active.id as string
    let overId = over.id as string

    if (overId.startsWith('column-')) {
      overId = overId.replace('column-', '')
    }

    const task = tasks.find((t) => t.id === taskId)
    if (!task) {
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = filteredTasks.filter((task) => task.status === col.id)
        return acc
      }, {} as Record<string, Task[]>)
      setTasksByStatus(grouped)
      return
    }

    let newStatus = overId
    const isOverColumn = columns.some((col) => col.id === overId)

    if (!isOverColumn) {
      for (const [status, taskList] of Object.entries(tasksByStatus)) {
        if (taskList.some((t) => t.id === overId)) {
          newStatus = status
          break
        }
      }
    }

    const isValidColumn = columns.some((col) => col.id === newStatus)
    if (!isValidColumn || task.status === newStatus) {
      return
    }

    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)

      if (error) throw error

      // Update local state
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

      if (newStatus === 'done') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#6366f1', '#8b5cf6'],
        })
        toast.success('Tarefa concluída!', {
          icon: '🎉',
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontWeight: 600,
          },
        })
      } else {
        toast.success('Status atualizado!')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Erro ao atualizar status')
      // Reset on error
      const grouped = columns.reduce((acc, col) => {
        acc[col.id] = filteredTasks.filter((task) => task.status === col.id)
        return acc
      }, {} as Record<string, Task[]>)
      setTasksByStatus(grouped)
    }
  }

  const getColumnStats = (columnId: string) => {
    const columnTasks = tasksByStatus[columnId] || []
    const totalPoints = columnTasks.reduce((sum, task) => sum + (task.story_points || 0), 0)
    return {
      count: columnTasks.length,
      points: totalPoints,
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Planner
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visualize e gerencie todas as suas tarefas em um só lugar
          </Typography>
        </Box>

        {/* Filters */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
          }}
        >
          {/* Assignment Filter */}
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton
              value="all"
              sx={{
                px: 3,
                borderRadius: '12px !important',
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: alpha('#6366f1', 0.1),
                  color: '#6366f1',
                  '&:hover': { bgcolor: alpha('#6366f1', 0.2) },
                },
              }}
            >
              Todas
            </ToggleButton>
            <ToggleButton
              value="assigned"
              sx={{
                px: 3,
                borderRadius: '12px !important',
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: alpha('#6366f1', 0.1),
                  color: '#6366f1',
                  '&:hover': { bgcolor: alpha('#6366f1', 0.2) },
                },
              }}
            >
              <Person sx={{ mr: 1, fontSize: 18 }} />
              Atribuído a mim
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Project Filter */}
          <TextField
            select
            size="small"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            sx={{ minWidth: 200 }}
            SelectProps={{ native: true }}
          >
            <option value="all">Todos os projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </TextField>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          {/* Stats */}
          <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
            <Chip
              label={`${filteredTasks.length} tarefas`}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`${filteredTasks.reduce((sum, t) => sum + (t.story_points || 0), 0)} pontos`}
              variant="outlined"
              sx={{ fontWeight: 600, color: '#6366f1', borderColor: '#6366f1' }}
            />
          </Box>
        </Paper>

        {/* Kanban Board */}
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
            }}
          >
            {columns.map((column) => {
              const stats = getColumnStats(column.id)
              const columnTasks = tasksByStatus[column.id] || []

              return (
                <SortableContext
                  key={column.id}
                  id={column.id}
                  items={columnTasks.map((t) => t.id)}
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
                      {columnTasks.length === 0 ? (
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
                            Arraste tarefas aqui
                          </Typography>
                        </Box>
                      ) : (
                        columnTasks.map((task) => (
                          <PlannerCard
                            key={task.id}
                            task={task}
                            onClick={(id) => {
                              setSelectedTaskId(id)
                              setStoryDetailsOpen(true)
                            }}
                            onNavigateToProject={(projectId) => navigate(`/projects/${projectId}/kanban`)}
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
            {activeTask ? (
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
                  {activeTask.title}
                </Typography>
                {activeTask.project && (
                  <Chip
                    label={activeTask.project.name}
                    size="small"
                    sx={{
                      mt: 1,
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: alpha('#6366f1', 0.1),
                      color: '#6366f1',
                    }}
                  />
                )}
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Container>

      {/* Story Details Modal */}
      {storyDetailsOpen && (
        <StoryDetailsModal
          open={storyDetailsOpen}
          onClose={() => {
            setStoryDetailsOpen(false)
            setSelectedTaskId('')
          }}
          onSuccess={() => {
            fetchData()
          }}
          storyId={selectedTaskId}
        />
      )}
    </Box>
  )
}
