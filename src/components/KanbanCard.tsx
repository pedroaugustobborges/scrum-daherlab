import { useState } from 'react'
import { Box, Typography, Chip, LinearProgress, Avatar, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Flag, Functions, Delete, DragIndicator, Assignment, MoreVert, ContentCopy, Inventory, CalendarMonth, AccountTree } from '@mui/icons-material'

interface KanbanCardProps {
  story: {
    id: string
    title: string
    priority: string
    story_points: number
    assigned_to?: string
    due_date?: string | null
    start_date?: string | null
    end_date?: string | null
    profiles?: { full_name: string }
    subtasks?: Array<{ status: string }>
  }
  onDelete: (id: string, title: string) => void
  onClick: (id: string) => void
  onReplicate?: (storyId: string) => void
  onSendToBacklog?: (storyId: string, title: string) => void
  predecessorInfo?: { total: number; incomplete: number } | null
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#6b7280' },
  medium: { label: 'Média', color: '#f59e0b' },
  high: { label: 'Alta', color: '#ef4444' },
  urgent: { label: 'Urgente', color: '#dc2626' },
}

export default function KanbanCard({ story, onDelete, onClick, onReplicate, onSendToBacklog, predecessorInfo }: KanbanCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  // Use end_date as fallback when due_date is not set
  const effectiveDeadline = story.due_date || story.end_date

  // Check if deadline has passed (handle timezone properly)
  const isDeadlinePassed = (() => {
    if (!effectiveDeadline) return false
    const [y, m, d] = effectiveDeadline.split('T')[0].split('-').map(Number)
    const deadlineDate = new Date(y, m - 1, d)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return deadlineDate < today
  })()

  const hasPendingPredecessors = predecessorInfo && predecessorInfo.incomplete > 0

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: story.id,
  })

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const calculateProgress = () => {
    if (!story.subtasks || story.subtasks.length === 0) return 0
    const completed = story.subtasks.filter((st) => st.status === 'done').length
    return Math.round((completed / story.subtasks.length) * 100)
  }

  const progress = calculateProgress()

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
      {/* Drag Handle & Delete Button */}
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
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <DragIndicator sx={{ fontSize: 18 }} />
          <Assignment sx={{ fontSize: 18, color: '#6366f1' }} />
        </Box>

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

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {onReplicate && (
            <MenuItem
              onClick={() => {
                onReplicate(story.id)
                handleMenuClose()
              }}
            >
              <ListItemIcon>
                <ContentCopy fontSize="small" sx={{ color: '#6366f1' }} />
              </ListItemIcon>
              <ListItemText>Replicar para Sprint</ListItemText>
            </MenuItem>
          )}
          {onSendToBacklog && (
            <MenuItem
              onClick={() => {
                onSendToBacklog(story.id, story.title)
                handleMenuClose()
              }}
            >
              <ListItemIcon>
                <Inventory fontSize="small" sx={{ color: '#f59e0b' }} />
              </ListItemIcon>
              <ListItemText>Enviar para Backlog</ListItemText>
            </MenuItem>
          )}
          {(onReplicate || onSendToBacklog) && <Divider />}
          <MenuItem
            onClick={() => {
              onDelete(story.id, story.title)
              handleMenuClose()
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Card Content */}
      <Box onClick={() => onClick(story.id)} sx={{ cursor: 'pointer' }}>
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
          {story.title}
        </Typography>

        {/* Metadata */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
          {story.priority && (
            <Chip
              label={priorityConfig[story.priority]?.label || story.priority}
              size="small"
              icon={<Flag sx={{ fontSize: 12 }} />}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: `${priorityConfig[story.priority]?.color}20`,
                color: priorityConfig[story.priority]?.color,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  fontSize: 12,
                },
              }}
            />
          )}

          {story.story_points > 0 && (
            <Chip
              label={`${story.story_points} pts`}
              size="small"
              icon={<Functions sx={{ fontSize: 12 }} />}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                fontWeight: 600,
                '& .MuiChip-icon': {
                  fontSize: 12,
                },
              }}
            />
          )}

          {effectiveDeadline && (
            <Tooltip title={`${story.due_date ? 'Prazo' : 'Término'}: ${(() => {
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
                  '& .MuiChip-icon': {
                    fontSize: 12,
                  },
                }}
              />
            </Tooltip>
          )}

          {predecessorInfo && (
            <Tooltip
              title={
                hasPendingPredecessors
                  ? `${predecessorInfo.incomplete} de ${predecessorInfo.total} predecessora(s) pendente(s)`
                  : `${predecessorInfo.total} predecessora(s) concluída(s)`
              }
            >
              <Chip
                label={`${predecessorInfo.total}`}
                size="small"
                icon={<AccountTree sx={{ fontSize: 12 }} />}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: hasPendingPredecessors ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: hasPendingPredecessors ? '#ef4444' : '#10b981',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    fontSize: 12,
                  },
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Subtasks Progress */}
        {story.subtasks && story.subtasks.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {story.subtasks.filter((st) => st.status === 'done').length}/{story.subtasks.length} subtarefas
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
        {story.profiles?.full_name && (
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
              {story.profiles.full_name.charAt(0)}
            </Avatar>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {story.profiles.full_name}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
