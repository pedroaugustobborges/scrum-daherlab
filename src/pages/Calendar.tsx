import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Search,
  Flag,
  Assignment,
  SpaceDashboard,
  Folder,
  CalendarMonth,
  Settings,
  Download,
  CloudSync,
  PlayArrow,
  Stop,
  Sync,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import StoryDetailsModal from '@/components/StoryDetailsModal'
import { CalendarSettingsModal } from '@/components/calendar'
import {
  useExternalCalendarEvents,
  useCalendarSubscriptions,
  useRefreshCalendarSubscription,
} from '@/hooks/useCalendarSubscriptions'
import { exportCalendarToICS } from '@/utils/calendar/icsGenerator'

interface CalendarEvent {
  id: string
  title: string
  type: 'task' | 'sprint' | 'project' | 'deadline' | 'external'
  subType?: 'start' | 'end' // For marking start/end of multi-day events
  date: Date
  projectId?: string
  projectName?: string
  priority?: string
  assignee?: string
  status?: string
  color: string
  // External event specific
  isExternal?: boolean
  subscriptionName?: string
  location?: string
}

const priorityColors: Record<string, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626',
}

const eventTypeConfig: Record<string, { icon: typeof Assignment; color: string; label: string }> = {
  task: { icon: Assignment, color: '#6366f1', label: 'Tarefa' },
  'task-start': { icon: PlayArrow, color: '#6366f1', label: 'Início Tarefa' },
  'task-end': { icon: Stop, color: '#6366f1', label: 'Término Tarefa' },
  sprint: { icon: SpaceDashboard, color: '#10b981', label: 'Sprint' },
  'sprint-start': { icon: PlayArrow, color: '#10b981', label: 'Início Sprint' },
  'sprint-end': { icon: Stop, color: '#10b981', label: 'Fim Sprint' },
  project: { icon: Folder, color: '#8b5cf6', label: 'Projeto' },
  deadline: { icon: Flag, color: '#ef4444', label: 'Prazo' },
  external: { icon: CloudSync, color: '#06b6d4', label: 'Externo' },
}

export default function Calendar() {
  const { user } = useAuth()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [showMyTasks, setShowMyTasks] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Calendar subscriptions for sync
  const { data: subscriptions = [] } = useCalendarSubscriptions(user?.id)
  const refreshSubscription = useRefreshCalendarSubscription()

  // Sync all external calendars
  const handleSyncAll = async () => {
    const enabledSubscriptions = subscriptions.filter((s) => s.is_enabled)
    if (enabledSubscriptions.length === 0) return

    setIsSyncing(true)
    try {
      for (const sub of enabledSubscriptions) {
        await refreshSubscription.mutateAsync({ subscription: sub })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  // Fetch tasks from the correct 'tasks' table
  const { data: tasks = [] } = useQuery({
    queryKey: ['calendar-tasks', weekStart, weekEnd],
    queryFn: async () => {
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]

      // Query all tasks that have any date field set
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          start_date,
          end_date,
          assigned_to,
          project_id,
          projects(id, name),
          assigned_to_profile:profiles!assigned_to(full_name)
        `)
        // Only fetch tasks that have at least one date field
        .or('start_date.not.is.null,end_date.not.is.null,due_date.not.is.null')

      if (error) throw error

      // Filter tasks client-side for the specific week range
      return (data || []).filter((task: any) => {
        // Check if task has any date that falls within the week
        const hasStartInRange = task.start_date && task.start_date >= startStr && task.start_date <= endStr
        const hasEndInRange = task.end_date && task.end_date >= startStr && task.end_date <= endStr
        const hasDueInRange = task.due_date && task.due_date >= startStr && task.due_date <= endStr
        // Also include tasks that span the entire week (start before week, end after week)
        const spansWeek = task.start_date && task.end_date && task.start_date <= startStr && task.end_date >= endStr
        // Include if start is before week end AND end is after week start (overlapping)
        const overlapsWeek = task.start_date && task.end_date && task.start_date <= endStr && task.end_date >= startStr

        return hasStartInRange || hasEndInRange || hasDueInRange || spansWeek || overlapsWeek
      })
    },
  })

  // Fetch sprints
  const { data: sprints = [] } = useQuery({
    queryKey: ['calendar-sprints', weekStart, weekEnd],
    queryFn: async () => {
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('sprints')
        .select(`
          id,
          name,
          start_date,
          end_date,
          status,
          project_id,
          projects!inner(id, name)
        `)
        .or(`and(start_date.lte.${endStr},end_date.gte.${startStr})`)

      if (error) throw error
      return data
    },
  })

  // Fetch external calendar events
  const { data: externalEvents = [] } = useExternalCalendarEvents(user?.id, {
    start: weekStart,
    end: weekEnd,
  })

  // Helper to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  // Convert to calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = []

    // Add tasks
    tasks.forEach((task: any) => {
      const project = task.projects
      const taskColor = priorityColors[task.priority] || '#6366f1'

      // Parse dates if they exist
      const startDate = task.start_date ? (() => {
        const [sy, sm, sd] = task.start_date.split('T')[0].split('-').map(Number)
        return new Date(sy, sm - 1, sd)
      })() : null

      const endDate = task.end_date ? (() => {
        const [ey, em, ed] = task.end_date.split('T')[0].split('-').map(Number)
        return new Date(ey, em - 1, ed)
      })() : null

      // Case 1: Task has both start and end dates
      if (startDate && endDate) {
        if (!isSameDay(startDate, endDate)) {
          // Different days - show both start and end
          allEvents.push({
            id: `${task.id}-start`,
            title: `Início: ${task.title}`,
            type: 'task',
            subType: 'start',
            date: startDate,
            projectId: project?.id,
            projectName: project?.name,
            priority: task.priority,
            assignee: task.assigned_to_profile?.full_name,
            status: task.status,
            color: taskColor,
          })

          allEvents.push({
            id: `${task.id}-end`,
            title: `Término: ${task.title}`,
            type: 'task',
            subType: 'end',
            date: endDate,
            projectId: project?.id,
            projectName: project?.name,
            priority: task.priority,
            assignee: task.assigned_to_profile?.full_name,
            status: task.status,
            color: taskColor,
          })
        } else {
          // Same day - show as single event
          allEvents.push({
            id: task.id,
            title: task.title,
            type: 'task',
            date: startDate,
            projectId: project?.id,
            projectName: project?.name,
            priority: task.priority,
            assignee: task.assigned_to_profile?.full_name,
            status: task.status,
            color: taskColor,
          })
        }
      }
      // Case 2: Task has only start date (no end date)
      else if (startDate && !endDate) {
        allEvents.push({
          id: `${task.id}-start`,
          title: `Início: ${task.title}`,
          type: 'task',
          subType: 'start',
          date: startDate,
          projectId: project?.id,
          projectName: project?.name,
          priority: task.priority,
          assignee: task.assigned_to_profile?.full_name,
          status: task.status,
          color: taskColor,
        })
      }
      // Case 3: Task has only end date (no start date)
      else if (!startDate && endDate) {
        allEvents.push({
          id: `${task.id}-end`,
          title: `Término: ${task.title}`,
          type: 'task',
          subType: 'end',
          date: endDate,
          projectId: project?.id,
          projectName: project?.name,
          priority: task.priority,
          assignee: task.assigned_to_profile?.full_name,
          status: task.status,
          color: taskColor,
        })
      }

      // Due date as deadline (separate from start/end)
      if (task.due_date) {
        const [dy, dm, dd] = task.due_date.split('T')[0].split('-').map(Number)
        const dueDate = new Date(dy, dm - 1, dd)

        allEvents.push({
          id: `deadline-${task.id}`,
          title: `Prazo: ${task.title}`,
          type: 'deadline',
          date: dueDate,
          projectId: project?.id,
          projectName: project?.name,
          priority: task.priority,
          status: task.status,
          color: '#ef4444',
        })
      }
    })

    // Add sprints - show as separate start and end events
    sprints.forEach((sprint: any) => {
      const project = sprint.projects

      if (sprint.start_date) {
        const [sy, sm, sd] = sprint.start_date.split('T')[0].split('-').map(Number)
        const startDate = new Date(sy, sm - 1, sd)

        // Sprint start event
        allEvents.push({
          id: `sprint-${sprint.id}-start`,
          title: `Início: ${sprint.name}`,
          type: 'sprint',
          subType: 'start',
          date: startDate,
          projectId: project?.id,
          projectName: project?.name,
          status: sprint.status,
          color: '#10b981',
        })

        // Sprint end event (if end_date exists and is different)
        if (sprint.end_date) {
          const [ey, em, ed] = sprint.end_date.split('T')[0].split('-').map(Number)
          const endDate = new Date(ey, em - 1, ed)

          if (!isSameDay(startDate, endDate)) {
            allEvents.push({
              id: `sprint-${sprint.id}-end`,
              title: `Fim: ${sprint.name}`,
              type: 'sprint',
              subType: 'end',
              date: endDate,
              projectId: project?.id,
              projectName: project?.name,
              status: sprint.status,
              color: '#10b981',
            })
          }
        }
      }
    })

    // Add external calendar events - show as separate start and end events
    externalEvents.forEach((extEvent) => {
      const [sy, sm, sd] = extEvent.start.split('T')[0].split('-').map(Number)
      const startDate = new Date(sy, sm - 1, sd)

      if (extEvent.end) {
        const [ey, em, ed] = extEvent.end.split('T')[0].split('-').map(Number)
        const endDate = new Date(ey, em - 1, ed)

        if (!isSameDay(startDate, endDate)) {
          // Multi-day external event - show start and end
          allEvents.push({
            id: `external-${extEvent.uid}-start`,
            title: `Início: ${extEvent.summary}`,
            type: 'external',
            subType: 'start',
            date: startDate,
            color: extEvent.color,
            isExternal: true,
            subscriptionName: extEvent.subscriptionName,
            location: extEvent.location,
          })

          allEvents.push({
            id: `external-${extEvent.uid}-end`,
            title: `Fim: ${extEvent.summary}`,
            type: 'external',
            subType: 'end',
            date: endDate,
            color: extEvent.color,
            isExternal: true,
            subscriptionName: extEvent.subscriptionName,
            location: extEvent.location,
          })
        } else {
          // Same day - single event
          allEvents.push({
            id: `external-${extEvent.uid}`,
            title: extEvent.summary,
            type: 'external',
            date: startDate,
            color: extEvent.color,
            isExternal: true,
            subscriptionName: extEvent.subscriptionName,
            location: extEvent.location,
          })
        }
      } else {
        // No end date - single event
        allEvents.push({
          id: `external-${extEvent.uid}`,
          title: extEvent.summary,
          type: 'external',
          date: startDate,
          color: extEvent.color,
          isExternal: true,
          subscriptionName: extEvent.subscriptionName,
          location: extEvent.location,
        })
      }
    })

    return allEvents
  }, [tasks, sprints, externalEvents])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // External events bypass project filter
      if (event.type !== 'external') {
        if (selectedProject !== 'all' && event.projectId !== selectedProject) return false
      }
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (showMyTasks && event.type === 'task') {
        const task = tasks.find((t: any) => t.id === event.id)
        if (!task || task.assigned_to !== user?.id) return false
      }
      return true
    })
  }, [events, selectedProject, searchTerm, showMyTasks, tasks, user?.id])

  // Get events for a specific date (exact match only)
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.date)
      eventDate.setHours(0, 0, 0, 0)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      return eventDate.getTime() === checkDate.getTime()
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const start = weekDates[0].toLocaleDateString('pt-BR', options)
    const end = weekDates[6].toLocaleDateString('pt-BR', { ...options, year: 'numeric' })
    return `${start} - ${end}`
  }

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'task') {
      // Remove -start or -end suffix to get the actual task ID
      const taskId = event.id.replace(/-start$/, '').replace(/-end$/, '')
      setSelectedStoryId(taskId)
    } else if (event.type === 'deadline' && event.id.startsWith('deadline-')) {
      setSelectedStoryId(event.id.replace('deadline-', ''))
    }
    // External events and sprints don't have a detail modal
  }

  const handleExport = () => {
    const exportableEvents: Array<{
      id: string
      title: string
      date: Date
      endDate?: Date
      description: string
      projectName?: string
      assignee?: string
      status?: string
      type: string
    }> = []

    // Export tasks (filter by project if selected)
    tasks.forEach((task: any) => {
      if (selectedProject !== 'all' && task.project_id !== selectedProject) return

      const project = task.projects
      const startDate = task.start_date ? new Date(task.start_date) : null
      const endDate = task.end_date ? new Date(task.end_date) : null
      const dueDate = task.due_date ? new Date(task.due_date) : null

      // Export task with date range if available
      if (startDate || endDate) {
        exportableEvents.push({
          id: task.id,
          title: task.title,
          date: startDate || endDate!,
          endDate: endDate || startDate!,
          description: '',
          projectName: project?.name,
          assignee: task.assigned_to_profile?.full_name,
          status: task.status,
          type: 'task',
        })
      }

      // Export due date as deadline
      if (dueDate) {
        exportableEvents.push({
          id: `deadline-${task.id}`,
          title: `Prazo: ${task.title}`,
          date: dueDate,
          description: '',
          projectName: project?.name,
          status: task.status,
          type: 'deadline',
        })
      }
    })

    // Export sprints (filter by project if selected)
    sprints.forEach((sprint: any) => {
      if (selectedProject !== 'all' && sprint.project_id !== selectedProject) return

      const project = sprint.projects
      const startDate = sprint.start_date ? new Date(sprint.start_date) : null
      const endDate = sprint.end_date ? new Date(sprint.end_date) : null

      if (startDate) {
        exportableEvents.push({
          id: `sprint-${sprint.id}`,
          title: sprint.name,
          date: startDate,
          endDate: endDate || startDate,
          description: '',
          projectName: project?.name,
          status: sprint.status,
          type: 'sprint',
        })
      }
    })

    exportCalendarToICS(
      exportableEvents,
      `scrum-dashboard-${weekStart.toISOString().split('T')[0]}`,
      'Scrum Dashboard - Calendário'
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Navbar />

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <CalendarMonth sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={800} color="#1f2937">
                  Calendário
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Visualize todas as atividades por semana
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {subscriptions.filter((s) => s.is_enabled).length > 0 && (
                <Tooltip title="Sincronizar calendários externos">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={isSyncing ? <CircularProgress size={16} /> : <Sync />}
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    sx={{ borderRadius: 2 }}
                  >
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Exportar para ICS">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download />}
                  onClick={handleExport}
                  sx={{ borderRadius: 2 }}
                >
                  Exportar
                </Button>
              </Tooltip>
              <Tooltip title="Configurações">
                <IconButton
                  onClick={() => setSettingsOpen(true)}
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                  }}
                >
                  <Settings sx={{ color: '#6366f1' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            border: '2px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: { md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            {/* Navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => navigateWeek('prev')} size="small">
                <ChevronLeft />
              </IconButton>
              <Tooltip title="Hoje">
                <IconButton onClick={goToToday} size="small" sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)' }}>
                  <Today sx={{ color: '#6366f1' }} />
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => navigateWeek('next')} size="small">
                <ChevronRight />
              </IconButton>
              <Typography variant="h6" fontWeight={700} sx={{ ml: 1, minWidth: 200 }}>
                {formatWeekRange()}
              </Typography>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label="Atribuído a mim"
                onClick={() => setShowMyTasks(!showMyTasks)}
                color={showMyTasks ? 'primary' : 'default'}
                variant={showMyTasks ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Projeto</InputLabel>
                <Select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  label="Projeto"
                >
                  <MenuItem value="all">Todos os Projetos</MenuItem>
                  {projects.map((project: any) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#9ca3af' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 200 }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Main event types */}
          {['task', 'sprint', 'deadline', 'external'].map((key) => {
            const config = eventTypeConfig[key]
            return (
              <Chip
                key={key}
                label={config.label}
                size="small"
                icon={<config.icon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: `${config.color}20`,
                  color: config.color,
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: config.color },
                }}
              />
            )
          })}
          {/* Start/End markers legend */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
            <PlayArrow sx={{ fontSize: 14, color: '#9ca3af' }} />
            <Typography variant="caption" color="text.secondary">
              Início
            </Typography>
            <Stop sx={{ fontSize: 14, color: '#9ca3af', ml: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Fim
            </Typography>
          </Box>
        </Box>

        {/* Calendar Grid */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '2px solid rgba(99, 102, 241, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Day Headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              borderBottom: '2px solid rgba(99, 102, 241, 0.1)',
            }}
          >
            {weekDates.map((date, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRight: index < 6 ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {dayNames[index]}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{
                    color: isToday(date) ? 'white' : '#1f2937',
                    bgcolor: isToday(date) ? '#6366f1' : 'transparent',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mt: 0.5,
                  }}
                >
                  {date.getDate()}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Day Columns */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              minHeight: 500,
            }}
          >
            {weekDates.map((date, index) => {
              const dayEvents = getEventsForDate(date)
              return (
                <Box
                  key={index}
                  sx={{
                    p: 1,
                    borderRight: index < 6 ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
                    bgcolor: isToday(date) ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                    minHeight: 400,
                  }}
                >
                  {dayEvents.map((event) => {
                    // Get the correct config based on type and subType
                    const configKey = event.subType
                      ? `${event.type}-${event.subType}`
                      : event.type
                    const config = eventTypeConfig[configKey] || eventTypeConfig[event.type] || eventTypeConfig.external
                    const Icon = config.icon

                    return (
                      <Tooltip
                        key={event.id}
                        title={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {event.title}
                            </Typography>
                            {event.projectName && (
                              <Typography variant="caption">
                                Projeto: {event.projectName}
                              </Typography>
                            )}
                            {event.subscriptionName && (
                              <Typography variant="caption" display="block">
                                Calendário: {event.subscriptionName}
                              </Typography>
                            )}
                            {event.assignee && (
                              <Typography variant="caption" display="block">
                                Responsável: {event.assignee}
                              </Typography>
                            )}
                            {event.location && (
                              <Typography variant="caption" display="block">
                                Local: {event.location}
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <Box
                          onClick={() => handleEventClick(event)}
                          sx={{
                            p: 1,
                            mb: 0.5,
                            borderRadius: 1.5,
                            bgcolor: `${event.color}15`,
                            borderLeft: event.isExternal
                              ? `3px dashed ${event.color}`
                              : `3px solid ${config.color}`,
                            cursor: event.type === 'task' || event.type === 'deadline' ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: `${event.color}25`,
                              transform: 'translateX(2px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Icon sx={{ fontSize: 12, color: event.color }} />
                            {event.projectName && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.6rem',
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  px: 0.5,
                                  borderRadius: 0.5,
                                  color: '#6366f1',
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                }}
                              >
                                {event.projectName}
                              </Typography>
                            )}
                            {event.subscriptionName && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.6rem',
                                  bgcolor: `${event.color}20`,
                                  px: 0.5,
                                  borderRadius: 0.5,
                                  color: event.color,
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                }}
                              >
                                {event.subscriptionName}
                              </Typography>
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: '0.7rem',
                              lineHeight: 1.3,
                              color: '#1f2937',
                            }}
                          >
                            {event.title}
                          </Typography>
                          {event.assignee && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <Avatar
                                sx={{
                                  width: 14,
                                  height: 14,
                                  bgcolor: '#6366f1',
                                  fontSize: '0.5rem',
                                }}
                              >
                                {event.assignee.charAt(0)}
                              </Avatar>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: '0.6rem', color: '#6b7280' }}
                              >
                                {event.assignee.split(' ')[0]}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Tooltip>
                    )
                  })}
                </Box>
              )
            })}
          </Box>
        </Paper>

        {/* Summary */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '2px solid rgba(99, 102, 241, 0.1)',
              minWidth: 150,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Tarefas esta semana
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#6366f1">
              {filteredEvents.filter((e) => e.type === 'task').length}
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '2px solid rgba(16, 185, 129, 0.1)',
              minWidth: 150,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Sprints ativos
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#10b981">
              {filteredEvents.filter((e) => e.type === 'sprint').length}
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '2px solid rgba(239, 68, 68, 0.1)',
              minWidth: 150,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Prazos
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ef4444">
              {filteredEvents.filter((e) => e.type === 'deadline').length}
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '2px solid rgba(6, 182, 212, 0.1)',
              minWidth: 150,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Eventos externos
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#06b6d4">
              {filteredEvents.filter((e) => e.type === 'external').length}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Story Details Modal */}
      {selectedStoryId && (
        <StoryDetailsModal
          open={!!selectedStoryId}
          onClose={() => setSelectedStoryId(null)}
          storyId={selectedStoryId}
          onSuccess={() => {}}
        />
      )}

      {/* Calendar Settings Modal */}
      <CalendarSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onExport={handleExport}
      />
    </Box>
  )
}
