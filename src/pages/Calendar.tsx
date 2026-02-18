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
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import StoryDetailsModal from '@/components/StoryDetailsModal'

interface CalendarEvent {
  id: string
  title: string
  type: 'task' | 'sprint' | 'project' | 'deadline'
  date: Date
  endDate?: Date
  projectId?: string
  projectName?: string
  priority?: string
  assignee?: string
  status?: string
  color: string
}

const priorityColors: Record<string, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626',
}

const eventTypeConfig = {
  task: { icon: Assignment, color: '#6366f1', label: 'Tarefa' },
  sprint: { icon: SpaceDashboard, color: '#10b981', label: 'Sprint' },
  project: { icon: Folder, color: '#8b5cf6', label: 'Projeto' },
  deadline: { icon: Flag, color: '#ef4444', label: 'Prazo' },
}

export default function Calendar() {
  const { user } = useAuth()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [showMyTasks, setShowMyTasks] = useState(false)

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

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['calendar-tasks', weekStart, weekEnd],
    queryFn: async () => {
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('user_stories')
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
          projects!inner(id, name),
          profiles(full_name)
        `)
        .or(`start_date.gte.${startStr},end_date.lte.${endStr},due_date.gte.${startStr},due_date.lte.${endStr},and(start_date.lte.${endStr},end_date.gte.${startStr})`)

      if (error) throw error
      return data
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

  // Convert to calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = []

    // Add tasks
    tasks.forEach((task: any) => {
      const project = task.projects

      // Task with start/end dates (spans multiple days)
      if (task.start_date) {
        const [sy, sm, sd] = task.start_date.split('T')[0].split('-').map(Number)
        const startDate = new Date(sy, sm - 1, sd)

        allEvents.push({
          id: task.id,
          title: task.title,
          type: 'task',
          date: startDate,
          endDate: task.end_date ? (() => {
            const [ey, em, ed] = task.end_date.split('T')[0].split('-').map(Number)
            return new Date(ey, em - 1, ed)
          })() : undefined,
          projectId: project?.id,
          projectName: project?.name,
          priority: task.priority,
          assignee: task.profiles?.full_name,
          status: task.status,
          color: priorityColors[task.priority] || '#6366f1',
        })
      }

      // Due date as deadline
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

    // Add sprints
    sprints.forEach((sprint: any) => {
      const project = sprint.projects
      if (sprint.start_date) {
        const [sy, sm, sd] = sprint.start_date.split('T')[0].split('-').map(Number)
        const startDate = new Date(sy, sm - 1, sd)

        allEvents.push({
          id: `sprint-${sprint.id}`,
          title: sprint.name,
          type: 'sprint',
          date: startDate,
          endDate: sprint.end_date ? (() => {
            const [ey, em, ed] = sprint.end_date.split('T')[0].split('-').map(Number)
            return new Date(ey, em - 1, ed)
          })() : undefined,
          projectId: project?.id,
          projectName: project?.name,
          status: sprint.status,
          color: '#10b981',
        })
      }
    })

    return allEvents
  }, [tasks, sprints])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedProject !== 'all' && event.projectId !== selectedProject) return false
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (showMyTasks && event.type === 'task') {
        const task = tasks.find((t: any) => t.id === event.id)
        if (!task || task.assigned_to !== user?.id) return false
      }
      return true
    })
  }, [events, selectedProject, searchTerm, showMyTasks, tasks, user?.id])

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.date)
      eventDate.setHours(0, 0, 0, 0)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)

      if (event.endDate) {
        const endDate = new Date(event.endDate)
        endDate.setHours(0, 0, 0, 0)
        return checkDate >= eventDate && checkDate <= endDate
      }

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
      setSelectedStoryId(event.id)
    } else if (event.type === 'deadline' && event.id.startsWith('deadline-')) {
      setSelectedStoryId(event.id.replace('deadline-', ''))
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Navbar />

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
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
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {Object.entries(eventTypeConfig).map(([key, config]) => (
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
          ))}
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
                    const config = eventTypeConfig[event.type]
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
                            {event.assignee && (
                              <Typography variant="caption" display="block">
                                Responsável: {event.assignee}
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
                            bgcolor: `${config.color}15`,
                            borderLeft: `3px solid ${config.color}`,
                            cursor: event.type === 'task' || event.type === 'deadline' ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: `${config.color}25`,
                              transform: 'translateX(2px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Icon sx={{ fontSize: 12, color: config.color }} />
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
    </Box>
  )
}
