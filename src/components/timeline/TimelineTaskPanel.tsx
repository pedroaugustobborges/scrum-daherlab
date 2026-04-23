import { useState, useMemo } from 'react'
import {
  Box, Typography, TextField, Chip, IconButton,
  Tooltip, CircularProgress, Divider, InputAdornment,
  Select, MenuItem, FormControl, InputLabel, Collapse,
} from '@mui/material'
import {
  Add as AddIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  Assignment as TaskIcon,
  DirectionsRun as RunIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'
import type { HierarchicalTask } from '@/types/hybrid'
import { STATUS_CONFIG, PRIORITY_CONFIG } from './types'

export interface SprintInfo {
  id: string
  name: string
  description?: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  status: string
}

interface Props {
  tasks: HierarchicalTask[]
  isLoading: boolean
  onAddTask: (task: HierarchicalTask) => void
  hasTask: (taskId: string) => boolean
  sprints: SprintInfo[]
  sprintsLoading: boolean
  onAddSprint: (sprint: SprintInfo) => void
  hasSprint: (sprintId: string) => boolean
}

type FilterStatus = 'all' | 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'

const SPRINT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'active':    { label: 'Ativo',     color: '#10b981' },
  'completed': { label: 'Concluído', color: '#6366f1' },
  'planning':  { label: 'Planejado', color: '#f59e0b' },
  'cancelled': { label: 'Cancelado', color: '#ef4444' },
}

export default function TimelineTaskPanel({
  tasks, isLoading, onAddTask, hasTask,
  sprints, sprintsLoading, onAddSprint, hasSprint,
}: Props) {
  const { isDarkMode } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [sprintsExpanded, setSprintsExpanded] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks.filter(t => {
      const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [tasks, search, statusFilter])

  const panelBg     = isDarkMode ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)'
  const borderColor = isDarkMode ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)'
  const titleColor  = isDarkMode ? '#f1f5f9' : '#1f2937'
  const subtitleColor = '#9ca3af'

  if (collapsed) {
    return (
      <Box sx={{
        width: 40, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pt: 2, borderRight: `1px solid ${borderColor}`, background: panelBg,
      }}>
        <Tooltip title="Expandir painel" placement="right">
          <IconButton size="small" onClick={() => setCollapsed(false)}>
            <ExpandIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{
          mt: 3, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          color: subtitleColor, fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        }}>
          TAREFAS & SPRINTS
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{
      width: 280, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${borderColor}`,
      background: panelBg, overflow: 'hidden',
    }}>
      {/* Panel header */}
      <Box sx={{
        px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'}`,
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: titleColor, fontSize: '13px' }}>
            Tarefas & Sprints
          </Typography>
          <Typography variant="caption" sx={{ color: subtitleColor }}>
            {tasks.length} tarefas · {sprints.length} sprints
          </Typography>
        </Box>
        <Tooltip title="Recolher painel" placement="left">
          <IconButton size="small" onClick={() => setCollapsed(true)} sx={{ color: subtitleColor }}>
            <CollapseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>

        {/* ── SPRINTS SECTION ─────────────────────────────────────────────────── */}
        <Box>
          {/* Sprint section header */}
          <Box
            onClick={() => setSprintsExpanded(p => !p)}
            sx={{
              px: 2, py: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.07)'}`,
              background: isDarkMode ? 'rgba(124,58,237,0.06)' : 'rgba(237,233,254,0.4)',
              '&:hover': {
                background: isDarkMode ? 'rgba(124,58,237,0.1)' : 'rgba(237,233,254,0.7)',
              },
              transition: 'background 0.15s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <RunIcon sx={{ fontSize: 14, color: '#7c3aed' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', fontSize: '11px', letterSpacing: 0.4 }}>
                SPRINTS DO PROJETO
              </Typography>
              <Box sx={{
                px: 0.65, py: 0.1, borderRadius: '4px',
                background: isDarkMode ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)',
                fontSize: '9px', fontWeight: 700, color: '#7c3aed',
              }}>
                {sprints.length}
              </Box>
            </Box>
            {sprintsExpanded
              ? <ExpandLessIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
              : <ExpandMoreIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
            }
          </Box>

          <Collapse in={sprintsExpanded} timeout="auto">
            <Box sx={{ px: 1.5, py: 1 }}>
              {sprintsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={22} sx={{ color: '#7c3aed' }} />
                </Box>
              )}
              {!sprintsLoading && sprints.length === 0 && (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <RunIcon sx={{ fontSize: 28, color: isDarkMode ? '#334155' : '#d1d5db', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ color: subtitleColor, display: 'block' }}>
                    Nenhum sprint no projeto
                  </Typography>
                </Box>
              )}
              {sprints.map(sprint => {
                const added = hasSprint(sprint.id)
                const statusCfg = SPRINT_STATUS_LABELS[sprint.status] ?? { label: sprint.status, color: '#6b7280' }

                const cardBg = isDarkMode
                  ? added ? 'rgba(124,58,237,0.12)' : 'rgba(30,41,59,0.6)'
                  : added ? 'rgba(237,233,254,0.5)' : 'white'
                const cardBorder = isDarkMode
                  ? added ? 'rgba(139,92,246,0.45)' : 'rgba(124,58,237,0.15)'
                  : added ? 'rgba(109,40,217,0.35)' : 'rgba(124,58,237,0.1)'
                const cardBorderHover = isDarkMode
                  ? added ? 'rgba(139,92,246,0.6)' : 'rgba(124,58,237,0.35)'
                  : added ? 'rgba(109,40,217,0.5)' : 'rgba(124,58,237,0.3)'

                return (
                  <Box
                    key={sprint.id}
                    sx={{
                      mb: 1, p: 1.5, borderRadius: '12px',
                      border: `1.5px solid ${cardBorder}`,
                      background: cardBg,
                      display: 'flex', flexDirection: 'column', gap: 0.75,
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: cardBorderHover },
                    }}
                  >
                    {/* Title row */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flex: 1, minWidth: 0 }}>
                        <Box sx={{
                          width: 20, height: 20, borderRadius: '5px', flexShrink: 0,
                          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <RunIcon sx={{ fontSize: 11, color: 'white' }} />
                        </Box>
                        <Typography variant="body2" sx={{
                          fontWeight: 700, fontSize: '12px', lineHeight: 1.4,
                          color: titleColor, flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {sprint.name}
                        </Typography>
                      </Box>
                      <Tooltip title={added ? 'Já no canvas' : 'Adicionar ao canvas'} arrow placement="left">
                        <span>
                          <IconButton
                            size="small"
                            disabled={added}
                            onClick={() => onAddSprint(sprint)}
                            sx={{
                              width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
                              background: added
                                ? isDarkMode ? 'rgba(124,58,237,0.2)' : 'rgba(237,233,254,0.8)'
                                : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                              color: added ? '#7c3aed' : 'white',
                              '&:hover:not(:disabled)': {
                                background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)',
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
                    {sprint.description && (
                      <Typography variant="caption" sx={{
                        fontSize: '10.5px',
                        color: isDarkMode ? '#a5b4fc' : '#4c1d95',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {sprint.description}
                      </Typography>
                    )}

                    {/* Badges */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip
                        label={statusCfg.label}
                        size="small"
                        sx={{
                          height: 18, fontSize: '9px', fontWeight: 700,
                          background: `${statusCfg.color}18`, color: statusCfg.color,
                          border: `1px solid ${statusCfg.color}30`,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                      {(sprint.start_date || sprint.end_date) && (
                        <Typography variant="caption" sx={{ fontSize: '9px', color: subtitleColor, ml: 'auto' }}>
                          {sprint.start_date
                            ? new Date(sprint.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                            : '?'}
                          {' → '}
                          {sprint.end_date
                            ? new Date(sprint.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                            : '?'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ borderColor: isDarkMode ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)' }} />

        {/* ── TASKS SECTION ───────────────────────────────────────────────────── */}
        {/* Task section header */}
        <Box sx={{
          px: 2, py: 1,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)'}`,
          background: isDarkMode ? 'rgba(99,102,241,0.04)' : 'rgba(238,242,255,0.4)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <TaskIcon sx={{ fontSize: 14, color: '#6366f1' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '11px', letterSpacing: 0.4 }}>
              TAREFAS DO PROJETO
            </Typography>
            <Box sx={{
              px: 0.65, py: 0.1, borderRadius: '4px',
              background: isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
              fontSize: '9px', fontWeight: 700, color: '#6366f1',
            }}>
              {tasks.length}
            </Box>
          </Box>
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
                  <SearchIcon sx={{ fontSize: 16, color: subtitleColor }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px', fontSize: '13px',
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

        {/* Task list */}
        <Box sx={{ px: 1.5, pb: 1 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: '#6366f1' }} />
            </Box>
          )}

          {!isLoading && filtered.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <TaskIcon sx={{ fontSize: 32, color: isDarkMode ? '#334155' : '#d1d5db', mb: 1 }} />
              <Typography variant="caption" sx={{ color: subtitleColor, display: 'block' }}>
                {search ? 'Nenhuma tarefa encontrada' : 'Sem tarefas no projeto'}
              </Typography>
            </Box>
          )}

          {filtered.map(task => {
            const added = hasTask(task.id)
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

            const cardBg = isDarkMode
              ? added ? 'rgba(16,185,129,0.08)' : 'rgba(30,41,59,0.6)'
              : added ? 'rgba(16,185,129,0.04)' : 'white'
            const cardBorder = isDarkMode
              ? added ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.15)'
              : added ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.1)'
            const cardBorderHover = isDarkMode
              ? added ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.35)'
              : added ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'

            return (
              <Box
                key={task.id}
                sx={{
                  mb: 1, p: 1.5, borderRadius: '12px',
                  border: `1.5px solid ${cardBorder}`,
                  background: cardBg,
                  display: 'flex', flexDirection: 'column', gap: 0.75,
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: cardBorderHover },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                  <Typography variant="body2" sx={{
                    fontWeight: 600, fontSize: '12px', lineHeight: 1.4,
                    color: titleColor, flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
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
                          width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
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

                {task.description && (
                  <Typography variant="caption" sx={{
                    fontSize: '10.5px',
                    color: isDarkMode ? '#94a3b8' : '#6b7280',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {task.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={statusCfg.label}
                    size="small"
                    sx={{
                      height: 18, fontSize: '9px', fontWeight: 700,
                      background: isDarkMode ? `${statusCfg.color}22` : statusCfg.bg,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.color}30`,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                  <Chip
                    label={priorityCfg.label}
                    size="small"
                    sx={{
                      height: 18, fontSize: '9px', fontWeight: 700,
                      background: `${priorityCfg.color}14`, color: priorityCfg.color,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                  {(task.due_date || task.start_date) && (
                    <Typography variant="caption" sx={{ fontSize: '9px', color: subtitleColor, alignSelf: 'center', ml: 'auto' }}>
                      {new Date(task.due_date || task.start_date!).toLocaleDateString('pt-BR')}
                    </Typography>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
