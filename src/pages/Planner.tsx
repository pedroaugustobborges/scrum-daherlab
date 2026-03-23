import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  useTheme,
} from '@mui/material'
import {
  Search,
  Person,
  Assignment,
  DragIndicator,
  MoreVert,
  OpenInNew,
  CalendarMonth,
  ViewKanban,
  ViewList,
  ChevronRight,
  Flag,
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

interface TeamMember {
  id: string
  full_name: string
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

const VIEW_MODE_STORAGE_KEY = 'planner-view-mode'
const ITEMS_PER_PAGE = 10

const getStoredViewMode = (): 'kanban' | 'list' => {
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  if (stored === 'kanban' || stored === 'list') {
    return stored
  }
  return 'kanban'
}

// Planner Card Component with project indicator
function PlannerCard({
  task,
  onClick,
  onNavigateToProject,
  isStakeholder = false,
}: {
  task: Task
  onClick: (id: string) => void
  onNavigateToProject: (projectId: string) => void
  isStakeholder?: boolean
}) {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isStakeholder,
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
        mb: 1.5,
        p: 1.5,
        borderRadius: 2,
        bgcolor: isDarkMode ? '#1e293b' : 'white',
        border: isDarkMode
          ? '2px solid rgba(99, 102, 241, 0.2)'
          : '2px solid rgba(99, 102, 241, 0.1)',
        cursor: isStakeholder ? 'default' : isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: '2px solid rgba(99, 102, 241, 0.3)',
          boxShadow: isDarkMode
            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          transform: isDragging ? 'none' : 'translateY(-2px)',
        },
      }}
    >
      {/* Header with drag handle and project badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
        <Box
          {...(isStakeholder ? {} : { ...attributes, ...listeners })}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#9ca3af',
            cursor: isStakeholder ? 'default' : 'grab',
            '&:active': { cursor: isStakeholder ? 'default' : 'grabbing' },
          }}
        >
          {!isStakeholder && <DragIndicator sx={{ fontSize: 16 }} />}
          <Assignment sx={{ fontSize: 16, color: '#6366f1' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!isStakeholder && (
            <Tooltip title="Ações">
              <IconButton
                size="small"
                onClick={handleMenuClick}
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.2)',
                  },
                }}
              >
                <MoreVert sx={{ fontSize: 12, color: '#6366f1' }} />
              </IconButton>
            </Tooltip>
          )}
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
        {/* Project Badge - moved here for better layout */}
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
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 600,
                bgcolor: alpha('#6366f1', 0.1),
                color: '#6366f1',
                cursor: 'pointer',
                mb: 1,
                maxWidth: '100%',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
                '&:hover': {
                  bgcolor: alpha('#6366f1', 0.2),
                },
              }}
            />
          </Tooltip>
        )}

        {/* Title */}
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
            fontSize: '0.75rem',
          }}
        >
          {task.title}
        </Typography>

        {/* Metadata - vertical layout for compact width */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {task.priority && (
              <Chip
                label={priorityConfig[task.priority]?.label || task.priority}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: `${priorityConfig[task.priority]?.color}20`,
                  color: priorityConfig[task.priority]?.color,
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}

            {task.story_points > 0 && (
              <Chip
                label={`${task.story_points}pts`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
          </Box>

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
                icon={<CalendarMonth sx={{ fontSize: 10 }} />}
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: isDeadlinePassed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: isDeadlinePassed ? '#ef4444' : '#f59e0b',
                  fontWeight: 600,
                  width: 'fit-content',
                  '& .MuiChip-icon': { fontSize: 10, ml: 0.5 },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Subtasks Progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 600 }}>
                {task.subtasks.filter((st) => st.status === 'done').length}/{task.subtasks.length}
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#6366f1' }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 3,
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Avatar
              sx={{
                width: 18,
                height: 18,
                bgcolor: '#6366f1',
                fontSize: '0.6rem',
                fontWeight: 700,
              }}
            >
              {task.profiles.full_name.charAt(0)}
            </Avatar>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'text.secondary' }} noWrap>
              {task.profiles.full_name.split(' ')[0]}
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
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [storyDetailsOpen, setStoryDetailsOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [stakeholderProjectIds, setStakeholderProjectIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(getStoredViewMode)
  const [currentPage, setCurrentPage] = useState(1)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch which projects the user is a stakeholder in
  const fetchStakeholderProjects = useCallback(async (projectIds: string[]) => {
    if (!user?.id || projectIds.length === 0) return new Set<string>()

    const stakeholderProjects = new Set<string>()

    for (const projectId of projectIds) {
      const teamIdsSet = new Set<string>()

      // Method 1: Check project_teams junction table
      const { data: projectTeamsData } = await supabase
        .from('project_teams')
        .select('team_id')
        .eq('project_id', projectId)

      if (projectTeamsData) {
        projectTeamsData.forEach((pt) => {
          if (pt.team_id) teamIdsSet.add(pt.team_id)
        })
      }

      // Method 2: Check sprints table
      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('team_id')
        .eq('project_id', projectId)

      if (sprintsData) {
        sprintsData.forEach((s) => {
          if (s.team_id) teamIdsSet.add(s.team_id)
        })
      }

      const teamIds = Array.from(teamIdsSet)

      if (teamIds.length > 0) {
        // Check user's role in those teams
        const { data: memberData } = await supabase
          .from('team_members')
          .select('role')
          .eq('user_id', user.id)
          .in('team_id', teamIds)

        if (memberData && memberData.length > 0) {
          const roles = memberData.map((d) => d.role)
          const allStakeholder = roles.every((r) => r === 'stakeholder')
          if (allStakeholder) {
            stakeholderProjects.add(projectId)
          }
        }
      }
    }

    return stakeholderProjects
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [tasks, filter, searchQuery, selectedProject, selectedAssignee, user])

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

      // Get unique team members from tasks
      const uniqueMembers = new Map<string, TeamMember>()
      ;(tasksData || []).forEach((task: any) => {
        if (task.assigned_to && task.profiles?.full_name) {
          uniqueMembers.set(task.assigned_to, {
            id: task.assigned_to,
            full_name: task.profiles.full_name,
          })
        }
      })
      setTeamMembers(Array.from(uniqueMembers.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)))

      // Check which projects the user is a stakeholder in
      const projectIds = uniqueProjects.map((p) => p.id)
      const stakeholderSet = await fetchStakeholderProjects(projectIds)
      setStakeholderProjectIds(stakeholderSet)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar tarefas')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...tasks]

    // Filter by assignment (my tasks)
    if (filter === 'assigned' && user) {
      filtered = filtered.filter((task) => task.assigned_to === user.id)
    }

    // Filter by specific assignee
    if (selectedAssignee !== 'all') {
      filtered = filtered.filter((task) => task.assigned_to === selectedAssignee)
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
    setCurrentPage(1) // Reset to first page when filters change
  }

  // View mode handler
  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'kanban' | 'list' | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode)
      setCurrentPage(1)
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode)
    }
  }

  // Pagination logic for list view
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTasks, currentPage])

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
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

    // Prevent stakeholders from moving tasks
    if (activeTask.project_id && stakeholderProjectIds.has(activeTask.project_id)) {
      return
    }

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

    // Prevent stakeholders from changing status
    if (task.project_id && stakeholderProjectIds.has(task.project_id)) {
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

          {/* Assignee Filter */}
          <TextField
            select
            size="small"
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            sx={{ minWidth: 180 }}
            SelectProps={{ native: true }}
            label="Responsável"
            InputLabelProps={{ shrink: true }}
          >
            <option value="all">Todos</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
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
          <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
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

            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="modo de visualização"
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    borderColor: '#6366f1',
                    color: '#6366f1',
                    '&:hover': {
                      bgcolor: 'rgba(99, 102, 241, 0.15)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                  },
                },
              }}
            >
              <ToggleButton value="kanban" aria-label="visualização kanban">
                <Tooltip title="Kanban">
                  <ViewKanban sx={{ fontSize: 20 }} />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="list" aria-label="visualização em lista">
                <Tooltip title="Lista">
                  <ViewList sx={{ fontSize: 20 }} />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>

        {/* Kanban View */}
        {viewMode === 'kanban' && (
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
                lg: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 1.5,
              width: '100%',
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
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: column.bgColor,
                      border: `2px solid ${column.color}30`,
                      minHeight: 500,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Column Header */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: column.color,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {column.label}
                        </Typography>
                        <Chip
                          label={stats.count}
                          size="small"
                          sx={{
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark' ? '#1e293b' : 'white',
                            color: column.color,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            height: 20,
                            minWidth: 20,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </Box>
                      {stats.points > 0 && (
                        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 600 }}>
                          {stats.points} pts
                        </Typography>
                      )}
                    </Box>

                    {/* Cards */}
                    <DroppableColumn id={column.id}>
                      {columnTasks.length === 0 ? (
                        <Box
                          sx={{
                            textAlign: 'center',
                            py: 4,
                            px: 1,
                            borderRadius: 2,
                            border: `2px dashed ${column.color}40`,
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(30, 41, 59, 0.5)'
                                : 'rgba(255,255,255,0.5)',
                            minHeight: 150,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                            Arraste aqui
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
                            isStakeholder={task.project_id ? stakeholderProjectIds.has(task.project_id) : false}
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
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? '#1e293b' : 'white',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                      : '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                  cursor: 'grabbing',
                  transform: 'rotate(-2deg)',
                  maxWidth: 180,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {activeTask.title}
                </Typography>
                {activeTask.project && (
                  <Chip
                    label={activeTask.project.name}
                    size="small"
                    sx={{
                      mt: 0.5,
                      height: 18,
                      fontSize: '0.6rem',
                      bgcolor: alpha('#6366f1', 0.1),
                      color: '#6366f1',
                      maxWidth: '100%',
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    }}
                  />
                )}
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: '2px solid rgba(99, 102, 241, 0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      background:
                        'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#6366f1',
                        fontSize: '0.875rem',
                        py: 2,
                      }}
                    >
                      Tarefa
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#6366f1',
                        fontSize: '0.875rem',
                        py: 2,
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#6366f1',
                        fontSize: '0.875rem',
                        py: 2,
                        display: { xs: 'none', md: 'table-cell' },
                      }}
                    >
                      Prioridade
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#6366f1',
                        fontSize: '0.875rem',
                        py: 2,
                        display: { xs: 'none', md: 'table-cell' },
                      }}
                    >
                      Projeto
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#6366f1',
                        fontSize: '0.875rem',
                        py: 2,
                        display: { xs: 'none', lg: 'table-cell' },
                      }}
                    >
                      Responsável
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#6366f1',
                        fontSize: '0.875rem',
                        py: 2,
                        display: { xs: 'none', lg: 'table-cell' },
                      }}
                    >
                      Pontos
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                        <Assignment
                          sx={{ fontSize: 60, color: '#6366f1', opacity: 0.3, mb: 2 }}
                        />
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          Nenhuma tarefa encontrada
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tente ajustar os filtros
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTasks.map((task, index) => {
                      const statusColumn = columns.find((c) => c.id === task.status)

                      return (
                        <TableRow
                          key={task.id}
                          onClick={() => {
                            setSelectedTaskId(task.id)
                            setStoryDetailsOpen(true)
                          }}
                          sx={{
                            cursor: 'pointer',
                            bgcolor:
                              index % 2 === 0
                                ? 'transparent'
                                : 'rgba(99, 102, 241, 0.02)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha('#6366f1', 0.08),
                              '& .row-arrow': {
                                opacity: 1,
                                transform: 'translateX(0)',
                              },
                            },
                            '&:last-child td': {
                              borderBottom: 0,
                            },
                          }}
                        >
                          <TableCell sx={{ py: 2 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 2,
                                  background:
                                    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 4px 8px rgba(99, 102, 241, 0.25)',
                                  flexShrink: 0,
                                }}
                              >
                                <Assignment sx={{ color: 'white', fontSize: 18 }} />
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {task.title}
                                </Typography>
                                {task.description && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {task.description}
                                  </Typography>
                                )}
                              </Box>
                              <ChevronRight
                                className="row-arrow"
                                sx={{
                                  color: '#6366f1',
                                  opacity: 0,
                                  transform: 'translateX(-8px)',
                                  transition: 'all 0.2s ease',
                                  display: { xs: 'none', sm: 'block' },
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Chip
                              label={statusColumn?.label || task.status}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                bgcolor: `${statusColumn?.color}20`,
                                color: statusColumn?.color,
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 2,
                              display: { xs: 'none', md: 'table-cell' },
                            }}
                          >
                            {task.priority && (
                              <Chip
                                label={priorityConfig[task.priority]?.label || task.priority}
                                size="small"
                                icon={<Flag sx={{ fontSize: 12 }} />}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  bgcolor: `${priorityConfig[task.priority]?.color}20`,
                                  color: priorityConfig[task.priority]?.color,
                                  '& .MuiChip-icon': {
                                    color: priorityConfig[task.priority]?.color,
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 2,
                              display: { xs: 'none', md: 'table-cell' },
                            }}
                          >
                            {task.project && (
                              <Chip
                                label={task.project.name}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/projects/${task.project!.id}/kanban`)
                                }}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  bgcolor: alpha('#6366f1', 0.1),
                                  color: '#6366f1',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    bgcolor: alpha('#6366f1', 0.2),
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 2,
                              display: { xs: 'none', lg: 'table-cell' },
                            }}
                          >
                            {task.profiles?.full_name && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    bgcolor: '#6366f1',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {task.profiles.full_name.charAt(0)}
                                </Avatar>
                                <Typography
                                  variant="caption"
                                  fontWeight={600}
                                  color="text.secondary"
                                  noWrap
                                >
                                  {task.profiles.full_name.split(' ')[0]}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 2,
                              display: { xs: 'none', lg: 'table-cell' },
                            }}
                          >
                            {task.story_points > 0 && (
                              <Chip
                                label={`${task.story_points} pts`}
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  color: '#6366f1',
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 3,
                }}
              >
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        background:
                          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        '&:hover': {
                          background:
                            'linear-gradient(135deg, #5558e3 0%, #7c4fe0 100%)',
                        },
                      },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
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
          isStakeholder={(() => {
            const task = tasks.find((t) => t.id === selectedTaskId)
            return task?.project_id ? stakeholderProjectIds.has(task.project_id) : false
          })()}
        />
      )}
    </Box>
  )
}
