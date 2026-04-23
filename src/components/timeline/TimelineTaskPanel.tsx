import { useState, useMemo } from 'react'
import {
  Box, Typography, TextField, Chip, IconButton,
  Tooltip, CircularProgress, Divider, InputAdornment,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material'
import type { HierarchicalTask } from '@/types/hybrid'
import { STATUS_CONFIG, PRIORITY_CONFIG } from './types'

interface Props {
  tasks: HierarchicalTask[]
  isLoading: boolean
  onAddTask: (task: HierarchicalTask) => void
  hasTask: (taskId: string) => boolean
}

type FilterStatus = 'all' | 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'

export default function TimelineTaskPanel({ tasks, isLoading, onAddTask, hasTask }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks.filter(t => {
      const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [tasks, search, statusFilter])

  if (collapsed) {
    return (
      <Box sx={{
        width: 40,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 2,
        borderRight: '1px solid rgba(99,102,241,0.1)',
        background: 'rgba(255,255,255,0.95)',
      }}>
        <Tooltip title="Expandir painel de tarefas" placement="right">
          <IconButton size="small" onClick={() => setCollapsed(false)}>
            <ExpandIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ mt: 3, writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
          TAREFAS
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{
      width: 280,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(99,102,241,0.1)',
      background: 'rgba(255,255,255,0.98)',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <Box sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(99,102,241,0.08)',
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1f2937', fontSize: '13px' }}>
            Tarefas do Projeto
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            {tasks.length} tarefas disponíveis
          </Typography>
        </Box>
        <Tooltip title="Recolher painel" placement="left">
          <IconButton size="small" onClick={() => setCollapsed(true)} sx={{ color: '#9ca3af' }}>
            <CollapseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="Buscar tarefas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontSize: '13px',
              '& fieldset': { borderColor: 'rgba(99,102,241,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
          }}
        />
        <FormControl size="small" fullWidth>
          <InputLabel sx={{ fontSize: '13px' }}>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={e => setStatusFilter(e.target.value as FilterStatus)}
            sx={{ borderRadius: '10px', fontSize: '13px' }}
          >
            <MenuItem value="all">Todos</MenuItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                  {cfg.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ borderColor: 'rgba(99,102,241,0.08)' }} />

      {/* Task list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#6366f1' }} />
          </Box>
        )}

        {!isLoading && filtered.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <TaskIcon sx={{ fontSize: 32, color: '#d1d5db', mb: 1 }} />
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
              {search ? 'Nenhuma tarefa encontrada' : 'Sem tarefas no projeto'}
            </Typography>
          </Box>
        )}

        {filtered.map(task => {
          const added = hasTask(task.id)
          const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
          const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

          return (
            <Box
              key={task.id}
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: '12px',
                border: `1.5px solid ${added ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.1)'}`,
                background: added ? 'rgba(16,185,129,0.04)' : 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                transition: 'border-color 0.15s',
                '&:hover': {
                  borderColor: added ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)',
                },
              }}
            >
              {/* Title row */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: 1.4,
                  color: '#1f2937',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {task.title}
                </Typography>
                <Tooltip title={added ? 'Já adicionado à linha do tempo' : 'Adicionar à linha do tempo'} arrow placement="left">
                  <span>
                    <IconButton
                      size="small"
                      disabled={added}
                      onClick={() => onAddTask(task)}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        flexShrink: 0,
                        background: added
                          ? 'rgba(16,185,129,0.12)'
                          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: added ? '#10b981' : 'white',
                        '&:hover:not(:disabled)': {
                          background: 'linear-gradient(135deg, #4f52e0 0%, #7c4fef 100%)',
                        },
                        '&.Mui-disabled': { opacity: 1 },
                      }}
                    >
                      {added ? <CheckIcon sx={{ fontSize: 14 }} /> : <AddIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {/* Description */}
              {task.description && (
                <Typography variant="caption" sx={{
                  fontSize: '10.5px',
                  color: '#6b7280',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {task.description}
                </Typography>
              )}

              {/* Badges */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={statusCfg.label}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '9px',
                    fontWeight: 700,
                    background: statusCfg.bg,
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.color}30`,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
                <Chip
                  label={priorityCfg.label}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '9px',
                    fontWeight: 700,
                    background: `${priorityCfg.color}14`,
                    color: priorityCfg.color,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
                {(task.due_date || task.start_date) && (
                  <Typography variant="caption" sx={{ fontSize: '9px', color: '#9ca3af', alignSelf: 'center', ml: 'auto' }}>
                    {new Date(task.due_date || task.start_date!).toLocaleDateString('pt-BR')}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
