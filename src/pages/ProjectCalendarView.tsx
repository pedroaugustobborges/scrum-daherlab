import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Search,
  Flag,
  Assignment,
  SpaceDashboard,
  Settings,
  CloudSync,
  PlayArrow,
  Stop,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProjectContext } from '@/pages/ProjectDetail'
import StoryDetailsModal from '@/components/StoryDetailsModal'
import { CalendarSettingsModal } from '@/components/calendar'
import { useExternalCalendarEvents } from '@/hooks/useCalendarSubscriptions'

interface CalendarEvent {
  id: string
  title: string
  type: 'task' | 'sprint' | 'deadline' | 'external'
  subType?: 'start' | 'end'
  date: Date
  priority?: string
  assignee?: string
  status?: string
  color: string
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
  deadline: { icon: Flag, color: '#ef4444', label: 'Prazo' },
  external: { icon: CloudSync, color: '#06b6d4', label: 'Externo' },
}

export default function ProjectCalendarView() {
  const { user } = useAuth()
  const { project } = useProjectContext()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [showMyTasks, setShowMyTasks] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showExternalEvents, setShowExternalEvents] = useState(true)

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

  // Fetch tasks for this project only
  const { data: tasks = [] } = useQuery({
    queryKey: ['project-calendar-tasks', project.id, weekStart, weekEnd],
    queryFn: async () => {
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]

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
          assigned_to_profile:profiles!assigned_to(full_name)
        `)
        .eq('project_id', project.id)
        .or('start_date.not.is.null,end_date.not.is.null,due_date.not.is.null')

      if (error) throw error

      return (data || []).filter((task: any) => {
        const hasStartInRange = task.start_date && task.start_date >= startStr && task.start_date <= endStr
        const hasEndInRange = task.end_date && task.end_date >= startStr && task.end_date <= endStr
        const hasDueInRange = task.due_date && task.due_date >= startStr && task.due_date <= endStr
        const overlapsWeek = task.start_date && task.end_date && task.start_date <= endStr && task.end_date >= startStr

        return hasStartInRange || hasEndInRange || hasDueInRange || overlapsWeek
      })
    },
    enabled: !!project.id,
  })

  // Fetch sprints for this project only
  const { data: sprints = [] } = useQuery({
    queryKey: ['project-calendar-sprints', project.id, weekStart, weekEnd],
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
          status
        `)
        .eq('project_id', project.id)
        .or(`and(start_date.lte.${endStr},end_date.gte.${startStr})`)

      if (error) throw error
      return data
    },
    enabled: !!project.id,
  })

  // Fetch external calendar events (optional)
  const { data: externalEvents = [] } = useExternalCalendarEvents(
    showExternalEvents ? user?.id : undefined,
    { start: weekStart, end: weekEnd }
  )

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
      const taskColor = priorityColors[task.priority] || '#6366f1'

      const startDate = task.start_date ? (() => {
        const [sy, sm, sd] = task.start_date.split('T')[0].split('-').map(Number)
        return new Date(sy, sm - 1, sd)
      })() : null

      const endDate = task.end_date ? (() => {
        const [ey, em, ed] = task.end_date.split('T')[0].split('-').map(Number)
        return new Date(ey, em - 1, ed)
      })() : null

      if (startDate && endDate) {
        if (!isSameDay(startDate, endDate)) {
          allEvents.push({
            id: `${task.id}-start`,
            title: `Início: ${task.title}`,
            type: 'task',
            subType: 'start',
            date: startDate,
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
            priority: task.priority,
            assignee: task.assigned_to_profile?.full_name,
            status: task.status,
            color: taskColor,
          })
        } else {
          allEvents.push({
            id: task.id,
            title: task.title,
            type: 'task',
            date: startDate,
            priority: task.priority,
            assignee: task.assigned_to_profile?.full_name,
            status: task.status,
            color: taskColor,
          })
        }
      } else if (startDate && !endDate) {
        allEvents.push({
          id: `${task.id}-start`,
          title: `Início: ${task.title}`,
          type: 'task',
          subType: 'start',
          date: startDate,
          priority: task.priority,
          assignee: task.assigned_to_profile?.full_name,
          status: task.status,
          color: taskColor,
        })
      } else if (!startDate && endDate) {
        allEvents.push({
          id: `${task.id}-end`,
          title: `Término: ${task.title}`,
          type: 'task',
          subType: 'end',
          date: endDate,
          priority: task.priority,
          assignee: task.assigned_to_profile?.full_name,
          status: task.status,
          color: taskColor,
        })
      }

      if (task.due_date) {
        const [dy, dm, dd] = task.due_date.split('T')[0].split('-').map(Number)
        const dueDate = new Date(dy, dm - 1, dd)

        allEvents.push({
          id: `deadline-${task.id}`,
          title: `Prazo: ${task.title}`,
          type: 'deadline',
          date: dueDate,
          priority: task.priority,
          status: task.status,
          color: '#ef4444',
        })
      }
    })

    // Add sprints
    sprints.forEach((sprint: any) => {
      if (sprint.start_date) {
        const [sy, sm, sd] = sprint.start_date.split('T')[0].split('-').map(Number)
        const startDate = new Date(sy, sm - 1, sd)

        allEvents.push({
          id: `sprint-${sprint.id}-start`,
          title: `Início: ${sprint.name}`,
          type: 'sprint',
          subType: 'start',
          date: startDate,
          status: sprint.status,
          color: '#10b981',
        })

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
              status: sprint.status,
              color: '#10b981',
            })
          }
        }
      }
    })

    // Add external calendar events (if enabled)
    if (showExternalEvents) {
      externalEvents.forEach((extEvent) => {
        const [sy, sm, sd] = extEvent.start.split('T')[0].split('-').map(Number)
        const startDate = new Date(sy, sm - 1, sd)

        if (extEvent.end) {
          const [ey, em, ed] = extEvent.end.split('T')[0].split('-').map(Number)
          const endDate = new Date(ey, em - 1, ed)

          if (!isSameDay(startDate, endDate)) {
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
    }

    return allEvents
  }, [tasks, sprints, externalEvents, showExternalEvents])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (showMyTasks && event.type === 'task') {
        const task = tasks.find((t: any) => t.id === event.id || event.id.startsWith(t.id))
        if (!task || task.assigned_to !== user?.id) return false
      }
      return true
    })
  }, [events, searchTerm, showMyTasks, tasks, user?.id])

  // Get events for a specific date
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
      const taskId = event.id.replace(/-start$/, '').replace(/-end$/, '')
      setSelectedStoryId(taskId)
    } else if (event.type === 'deadline' && event.id.startsWith('deadline-')) {
      setSelectedStoryId(event.id.replace('deadline-', ''))
    }
  }

  return (
    <Box>
      {/* Header with filters */}
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

          {/* Filters and Actions */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label="Atribuído a mim"
              onClick={() => setShowMyTasks(!showMyTasks)}
              color={showMyTasks ? 'primary' : 'default'}
              variant={showMyTasks ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />

            <Chip
              label="Eventos externos"
              onClick={() => setShowExternalEvents(!showExternalEvents)}
              color={showExternalEvents ? 'primary' : 'default'}
              variant={showExternalEvents ? 'filled' : 'outlined'}
              icon={<CloudSync sx={{ fontSize: 16 }} />}
              sx={{ fontWeight: 600 }}
            />

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
              sx={{ width: 180 }}
            />

            <Tooltip title="Configurações">
              <IconButton
                onClick={() => setSettingsOpen(true)}
                size="small"
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                }}
              >
                <Settings sx={{ color: '#6366f1', fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {['task', 'sprint', 'deadline', ...(showExternalEvents ? ['external'] : [])].map((key) => {
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
            minHeight: 400,
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
                  minHeight: 350,
                }}
              >
                {dayEvents.map((event) => {
                  const configKey = event.subType ? `${event.type}-${event.subType}` : event.type
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
            minWidth: 120,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Tarefas
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
            minWidth: 120,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Sprints
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
            minWidth: 120,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Prazos
          </Typography>
          <Typography variant="h5" fontWeight={700} color="#ef4444">
            {filteredEvents.filter((e) => e.type === 'deadline').length}
          </Typography>
        </Paper>
        {showExternalEvents && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '2px solid rgba(6, 182, 212, 0.1)',
              minWidth: 120,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Externos
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#06b6d4">
              {filteredEvents.filter((e) => e.type === 'external').length}
            </Typography>
          </Paper>
        )}
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
      />
    </Box>
  )
}
