import { useState, useMemo, useCallback } from 'react'
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
} from '@mui/material'
import {
  ChevronRight,
  ExpandMore,
  Add,
  Delete,
  Flag,
  RadioButtonUnchecked,
} from '@mui/icons-material'
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

interface ProjectGridViewProps {
  projectId: string
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
  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const indentTask = useIndentTask()
  const outdentTask = useOutdentTask()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

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

  const handleSaveEdit = async () => {
    if (!editingCell) return

    const { id, field } = editingCell
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    let updateValue: unknown = editValue

    // Parse value based on field type
    if (field === 'percent_complete' || field === 'planned_duration' || field === 'story_points') {
      updateValue = parseInt(editValue) || 0
    }

    await updateTask.mutateAsync({
      id,
      projectId,
      updates: { [field]: updateValue },
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
            onChange={(e) =>
              updateTask.mutate({
                id: task.id,
                projectId,
                updates: { status: e.target.value as TaskStatus },
              })
            }
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
            onClick={() => handleStartEdit(task.id, field, dateValue || '')}
          >
            {dateValue ? new Date(dateValue).toLocaleDateString('pt-BR') : '-'}
          </Typography>
        )

      case 'planned_duration':
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
            onClick={() => handleStartEdit(task.id, 'planned_duration', String(task.planned_duration || ''))}
          >
            {task.planned_duration ? `${task.planned_duration}d` : '-'}
          </Typography>
        )

      case 'wbs_code':
        return (
          <Typography variant="body2" color="text.secondary">
            {task.wbs_code || '-'}
          </Typography>
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
              <TableCell padding="checkbox" sx={{ bgcolor: 'grey.50' }}>
                <Checkbox
                  indeterminate={selectedIds.size > 0 && selectedIds.size < visibleTasks.length}
                  checked={visibleTasks.length > 0 && selectedIds.size === visibleTasks.length}
                  onChange={selectAll}
                />
              </TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 60, fontWeight: 600 }}>WBS</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 300, fontWeight: 600 }}>Nome da Tarefa</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 120, fontWeight: 600 }}>Início</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 120, fontWeight: 600 }}>Término</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 80, fontWeight: 600 }}>Duração</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 140, fontWeight: 600 }}>% Concluído</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 130, fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 110, fontWeight: 600 }}>Prioridade</TableCell>
              <TableCell sx={{ bgcolor: 'grey.50', minWidth: 60, fontWeight: 600 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
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
                        : 'rgba(0, 0, 0, 0.04)',
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
    </Box>
  )
}
