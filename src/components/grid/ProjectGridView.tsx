import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  LinearProgress,
  Chip,
  alpha,
  Tooltip,
  CircularProgress,
  Avatar,
  useTheme,
} from '@mui/material'
import {
  ChevronRight,
  ExpandMore,
  Add,
  Delete,
  Flag,
  RadioButtonUnchecked,
  PersonOutline,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTaskHierarchy,
  buildTaskTree,
  flattenTaskTree,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useIndentTask,
  useOutdentTask,
} from '@/hooks/useTaskHierarchy'
import type { HierarchicalTask, TaskStatus, TaskPriority } from '@/types/hybrid'
import GridToolbar from './GridToolbar'
import BlockReasonModal from '../BlockReasonModal'
import toast from 'react-hot-toast'

interface ProjectGridViewProps {
  projectId: string
}

interface TeamMember {
  id: string
  full_name: string
  avatar_url: string | null
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'A Fazer', color: '#6b7280' },
  { value: 'in-progress', label: 'Em Progresso', color: '#f59e0b' },
  { value: 'review', label: 'Em Revisão', color: '#8b5cf6' },
  { value: 'done', label: 'Concluído', color: '#10b981' },
  { value: 'blocked', label: 'Bloqueado', color: '#ef4444' },
]

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: '#6b7280' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444' },
]

export default function ProjectGridView({ projectId }: ProjectGridViewProps) {
  const theme = useTheme()
  const { user } = useAuth()
  const isDarkMode = theme.palette.mode === 'dark'
  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const indentTask = useIndentTask()

  // Block reason modal state
  const [blockReasonModalOpen, setBlockReasonModalOpen] = useState(false)
  const [pendingBlockTask, setPendingBlockTask] = useState<{ id: string; title: string } | null>(null)
  const outdentTask = useOutdentTask()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Fetch team members for this project
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        // Get teams associated with this project
        const { data: projectTeams, error: teamsError } = await supabase
          .from('project_teams')
          .select('team_id')
          .eq('project_id', projectId)

        if (teamsError) throw teamsError

        if (!projectTeams || projectTeams.length === 0) {
          setTeamMembers([])
          return
        }

        const teamIds = projectTeams.map((pt) => pt.team_id)

        // Get all members of these teams
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            profiles:profiles!team_members_user_id_fkey(id, full_name, avatar_url)
          `)
          .in('team_id', teamIds)

        if (membersError) throw membersError

        // Deduplicate members (a user might be in multiple teams)
        const uniqueMembers = new Map<string, TeamMember>()
        members?.forEach((m) => {
          const profile = m.profiles as unknown as TeamMember
          if (profile && !uniqueMembers.has(profile.id)) {
            uniqueMembers.set(profile.id, {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            })
          }
        })

        setTeamMembers(Array.from(uniqueMembers.values()).sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        ))
      } catch (error) {
        console.error('Error fetching team members:', error)
      }
    }

    if (projectId) {
      fetchTeamMembers()
    }
  }, [projectId])

  // Build tree and flatten for display
  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks])
  const flatTasks = useMemo(
    () => flattenTaskTree(taskTree, expandedIds),
    [taskTree, expandedIds]
  )
  const visibleTasks = flatTasks.filter((t) => t._visible)

  const toggleExpand = useCallback((taskId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === visibleTasks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleTasks.map((t) => t.id)))
    }
  }, [visibleTasks, selectedIds])

  const handleStartEdit = (taskId: string, field: string, value: string) => {
    setEditingCell({ id: taskId, field })
    setEditValue(value)
  }

  // Helper function to calculate duration in days between two dates
  const calculateDurationBetweenDates = (startDate: string | null, endDate: string | null): number | null => {
    if (!startDate || !endDate) return null
    const [startYear, startMonth, startDay] = startDate.split('T')[0].split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('T')[0].split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both days
    return diffDays > 0 ? diffDays : 1
  }

  // Helper function to calculate end_date from start_date and duration
  const calculateEndDate = (startDate: string, durationDays: number): string => {
    const [year, month, day] = startDate.split('T')[0].split('-').map(Number)
    const start = new Date(year, month - 1, day)
    start.setDate(start.getDate() + durationDays - 1) // -1 because start day counts as day 1
    return start.toISOString().split('T')[0]
  }

  const handleSaveEdit = async () => {
    if (!editingCell) return

    const { id, field } = editingCell
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    let updateValue: unknown = editValue
    const additionalUpdates: Record<string, unknown> = {}

    // Parse value based on field type
    if (field === 'percent_complete' || field === 'planned_duration' || field === 'story_points') {
      updateValue = parseInt(editValue) || 0
    }

    // Auto-calculate related fields when dates or duration change
    if (field === 'start_date' && editValue) {
      // If we have end_date, recalculate duration
      if (task.end_date) {
        const newDuration = calculateDurationBetweenDates(editValue, task.end_date)
        if (newDuration && newDuration > 0) {
          additionalUpdates.planned_duration = newDuration
        }
      }
      // If we have duration but no end_date, calculate end_date
      else if (task.planned_duration && task.planned_duration > 0) {
        additionalUpdates.end_date = calculateEndDate(editValue, task.planned_duration)
      }
    }

    if (field === 'end_date' && editValue) {
      // If we have start_date, recalculate duration
      if (task.start_date) {
        const newDuration = calculateDurationBetweenDates(task.start_date, editValue)
        if (newDuration && newDuration > 0) {
          additionalUpdates.planned_duration = newDuration
        }
      }
    }

    if (field === 'planned_duration' && updateValue) {
      // If we have start_date, calculate end_date
      if (task.start_date) {
        additionalUpdates.end_date = calculateEndDate(task.start_date.split('T')[0], updateValue as number)
      }
    }

    await updateTask.mutateAsync({
      id,
      projectId,
      updates: { [field]: updateValue, ...additionalUpdates },
    })

    setEditingCell(null)
    setEditValue('')
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleAddTask = async (parentId?: string) => {
    const parent = parentId ? tasks.find((t) => t.id === parentId) : null

    await createTask.mutateAsync({
      project_id: projectId,
      title: 'Nova Tarefa',
      parent_task_id: parentId || null,
      hierarchy_level: parent ? (parent.hierarchy_level || 0) + 1 : 0,
    })

    if (parentId) {
      setExpandedIds((prev) => new Set([...prev, parentId]))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedIds.size} tarefa(s)?`
    )
    if (!confirmed) return

    for (const id of selectedIds) {
      await deleteTask.mutateAsync({ id, projectId })
    }
    setSelectedIds(new Set())
  }

  const handleIndent = async () => {
    for (const id of selectedIds) {
      const task = tasks.find((t) => t.id === id)
      if (task) {
        try {
          await indentTask.mutateAsync({ task, tasks })
        } catch {
          // Error handled in hook
        }
      }
    }
  }

  const handleOutdent = async () => {
    for (const id of selectedIds) {
      const task = tasks.find((t) => t.id === id)
      if (task) {
        try {
          await outdentTask.mutateAsync({ task, tasks })
        } catch {
          // Error handled in hook
        }
      }
    }
  }

  // Handle status change with block reason modal
  const handleStatusChange = (task: HierarchicalTask, newStatus: TaskStatus) => {
    // If changing to blocked from a different status, show the modal
    if (newStatus === 'blocked' && task.status !== 'blocked') {
      setPendingBlockTask({ id: task.id, title: task.title })
      setBlockReasonModalOpen(true)
      return
    }

    // For unblocking, clear the blocked_comment_id
    const updates: Record<string, unknown> = { status: newStatus }
    if (task.status === 'blocked' && newStatus !== 'blocked') {
      updates.blocked_comment_id = null
    }

    updateTask.mutate({
      id: task.id,
      projectId,
      updates,
    })
  }

  // Handle block confirmation with reason
  const handleBlockConfirm = async (reason: string) => {
    if (!pendingBlockTask || !user) return

    try {
      // First, create the blocking comment
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          task_id: pendingBlockTask.id,
          user_id: user.id,
          content: `🚫 **Motivo do Bloqueio:** ${reason}`,
        })
        .select()
        .single()

      if (commentError) throw commentError

      // Update task with blocked status and the blocking comment reference
      await updateTask.mutateAsync({
        id: pendingBlockTask.id,
        projectId,
        updates: {
          status: 'blocked' as TaskStatus,
          blocked_comment_id: commentData.id,
        },
      })

      toast.success('Tarefa bloqueada')
      setBlockReasonModalOpen(false)
      setPendingBlockTask(null)
    } catch (error) {
      console.error('Error blocking task:', error)
      toast.error('Erro ao bloquear tarefa')
    }
  }

  const handleBlockCancel = () => {
    setBlockReasonModalOpen(false)
    setPendingBlockTask(null)
  }

  const renderCell = (task: HierarchicalTask & { _depth: number; _hasChildren: boolean }, field: string) => {
    const isEditing = editingCell?.id === task.id && editingCell?.field === field

    switch (field) {
      case 'title':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', pl: task._depth * 3 }}>
            {task._hasChildren ? (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(task.id)
                }}
                sx={{ mr: 0.5 }}
              >
                {expandedIds.has(task.id) ? (
                  <ExpandMore fontSize="small" />
                ) : (
                  <ChevronRight fontSize="small" />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 28 }} />
            )}

            {task.task_type === 'milestone' && (
              <Flag sx={{ fontSize: 16, color: '#f59e0b', mr: 0.5 }} />
            )}

            {isEditing ? (
              <TextField
                autoFocus
                size="small"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                sx={{ flex: 1 }}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: task.is_summary ? 600 : 400,
                  cursor: 'text',
                  flex: 1,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' },
                }}
                onClick={() => handleStartEdit(task.id, 'title', task.title)}
              >
                {task.title}
              </Typography>
            )}
          </Box>
        )

      case 'status':
        return (
          <Select
            size="small"
            value={task.status}
            onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
            sx={{
              minWidth: 120,
              '& .MuiSelect-select': { py: 0.5 },
            }}
          >
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Chip
                  size="small"
                  label={opt.label}
                  sx={{
                    bgcolor: alpha(opt.color, 0.1),
                    color: opt.color,
                    fontWeight: 600,
                    height: 24,
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        )

      case 'priority':
        return (
          <Select
            size="small"
            value={task.priority}
            onChange={(e) =>
              updateTask.mutate({
                id: task.id,
                projectId,
                updates: { priority: e.target.value as TaskPriority },
              })
            }
            sx={{
              minWidth: 100,
              '& .MuiSelect-select': { py: 0.5 },
            }}
          >
            {priorityOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Chip
                  size="small"
                  label={opt.label}
                  sx={{
                    bgcolor: alpha(opt.color, 0.1),
                    color: opt.color,
                    fontWeight: 600,
                    height: 24,
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        )

      case 'percent_complete':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
            <LinearProgress
              variant="determinate"
              value={task.percent_complete || 0}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: task.percent_complete === 100 ? '#10b981' : '#6366f1',
                },
              }}
            />
            {isEditing ? (
              <TextField
                autoFocus
                size="small"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                inputProps={{ min: 0, max: 100 }}
                sx={{ width: 60 }}
              />
            ) : (
              <Typography
                variant="caption"
                sx={{ minWidth: 35, cursor: 'pointer' }}
                onClick={() => handleStartEdit(task.id, 'percent_complete', String(task.percent_complete || 0))}
              >
                {task.percent_complete || 0}%
              </Typography>
            )}
          </Box>
        )

      case 'start_date':
      case 'end_date':
        const dateValue = task[field as 'start_date' | 'end_date']
        // Fix timezone issue: parse the date as local date, not UTC
        const formatDateForDisplay = (dateStr: string | null) => {
          if (!dateStr) return '-'
          // Parse as YYYY-MM-DD and create local date
          const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
          const localDate = new Date(year, month - 1, day)
          return localDate.toLocaleDateString('pt-BR')
        }
        return isEditing ? (
          <TextField
            autoFocus
            size="small"
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' } }}
            onClick={() => handleStartEdit(task.id, field, dateValue ? dateValue.split('T')[0] : '')}
          >
            {formatDateForDisplay(dateValue)}
          </Typography>
        )

      case 'planned_duration':
        // Calculate duration dynamically from start_date and end_date
        const calculateDuration = () => {
          if (!task.start_date || !task.end_date) return task.planned_duration || null
          const [startYear, startMonth, startDay] = task.start_date.split('T')[0].split('-').map(Number)
          const [endYear, endMonth, endDay] = task.end_date.split('T')[0].split('-').map(Number)
          const start = new Date(startYear, startMonth - 1, startDay)
          const end = new Date(endYear, endMonth - 1, endDay)
          const diffTime = end.getTime() - start.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end day
          return diffDays > 0 ? diffDays : 1
        }
        const calculatedDuration = calculateDuration()
        return isEditing ? (
          <TextField
            autoFocus
            size="small"
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            inputProps={{ min: 0 }}
            sx={{ width: 80 }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' } }}
            onClick={() => handleStartEdit(task.id, 'planned_duration', String(calculatedDuration || ''))}
          >
            {calculatedDuration ? `${calculatedDuration}d` : '-'}
          </Typography>
        )

      case 'wbs_code':
        return (
          <Typography variant="body2" color="text.secondary">
            {task.wbs_code || '-'}
          </Typography>
        )

      case 'assigned_to':
        const assignedProfile = task.assigned_to_profile
        return (
          <Select
            size="small"
            value={task.assigned_to || ''}
            onChange={(e) =>
              updateTask.mutate({
                id: task.id,
                projectId,
                updates: { assigned_to: e.target.value || null },
              })
            }
            displayEmpty
            sx={{
              minWidth: 150,
              '& .MuiSelect-select': { py: 0.5 },
            }}
            renderValue={(selected) => {
              if (!selected) {
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <PersonOutline sx={{ fontSize: 18 }} />
                    <Typography variant="body2" color="text.secondary">
                      Não atribuído
                    </Typography>
                  </Box>
                )
              }
              const member = teamMembers.find((m) => m.id === selected) || assignedProfile
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={member?.avatar_url || undefined}
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {member?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography variant="body2" noWrap>
                    {member?.full_name || 'Usuário'}
                  </Typography>
                </Box>
              )
            }}
          >
            <MenuItem value="">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonOutline sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Não atribuído
                </Typography>
              </Box>
            </MenuItem>
            {teamMembers.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={member.avatar_url || undefined}
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography variant="body2">
                    {member.full_name}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <GridToolbar
        selectedCount={selectedIds.size}
        onAddTask={() => handleAddTask()}
        onAddSubtask={() => {
          const firstSelected = Array.from(selectedIds)[0]
          if (firstSelected) handleAddTask(firstSelected)
        }}
        onDelete={handleDeleteSelected}
        onIndent={handleIndent}
        onOutdent={handleOutdent}
        canIndent={selectedIds.size > 0}
        canOutdent={selectedIds.size > 0 && Array.from(selectedIds).some((id) => {
          const task = tasks.find((t) => t.id === id)
          return task?.parent_task_id != null
        })}
      />

      <TableContainer
        component={Paper}
        sx={{
          flex: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'auto',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{
                  bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50',
                  borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined,
                }}
              >
                <Checkbox
                  indeterminate={selectedIds.size > 0 && selectedIds.size < visibleTasks.length}
                  checked={visibleTasks.length > 0 && selectedIds.size === visibleTasks.length}
                  onChange={selectAll}
                />
              </TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 60, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>WBS</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 300, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Nome da Tarefa</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 150, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Responsável</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 120, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Início</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 120, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Término</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 80, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Duração</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 140, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>% Concluído</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 130, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Status</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 110, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Prioridade</TableCell>
              <TableCell sx={{ bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'grey.50', minWidth: 60, fontWeight: 600, borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : undefined }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <RadioButtonUnchecked sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Nenhuma tarefa ainda
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Clique em "Nova Tarefa" para começar
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              visibleTasks.map((task) => (
                <TableRow
                  key={task.id}
                  hover
                  selected={selectedIds.has(task.id)}
                  sx={{
                    bgcolor: task.is_summary ? 'rgba(99, 102, 241, 0.03)' : 'inherit',
                    '&:hover': {
                      bgcolor: task.is_summary
                        ? 'rgba(99, 102, 241, 0.08)'
                        : isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                    />
                  </TableCell>
                  <TableCell>{renderCell(task, 'wbs_code')}</TableCell>
                  <TableCell>{renderCell(task, 'title')}</TableCell>
                  <TableCell>{renderCell(task, 'assigned_to')}</TableCell>
                  <TableCell>{renderCell(task, 'start_date')}</TableCell>
                  <TableCell>{renderCell(task, 'end_date')}</TableCell>
                  <TableCell>{renderCell(task, 'planned_duration')}</TableCell>
                  <TableCell>{renderCell(task, 'percent_complete')}</TableCell>
                  <TableCell>{renderCell(task, 'status')}</TableCell>
                  <TableCell>{renderCell(task, 'priority')}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Adicionar subtarefa">
                        <IconButton
                          size="small"
                          onClick={() => handleAddTask(task.id)}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (window.confirm('Excluir esta tarefa?')) {
                              deleteTask.mutate({ id: task.id, projectId })
                            }
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Block Reason Modal */}
      <BlockReasonModal
        open={blockReasonModalOpen}
        onClose={handleBlockCancel}
        onConfirm={handleBlockConfirm}
        storyTitle={pendingBlockTask?.title}
      />
    </Box>
  )
}
