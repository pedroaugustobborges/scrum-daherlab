import { Box, Tooltip, Typography, alpha } from '@mui/material'
import type { HierarchicalTask } from '@/types/hybrid'

interface GanttBarProps {
  task: HierarchicalTask
  x: number
  y: number
  width: number
  height: number
  isSelected: boolean
  onClick: () => void
}

const statusColors: Record<string, string> = {
  'todo': '#6b7280',
  'in-progress': '#f59e0b',
  'review': '#8b5cf6',
  'done': '#10b981',
  'blocked': '#ef4444',
}

export default function GanttBar({
  task,
  x,
  y,
  width,
  height,
  isSelected,
  onClick,
}: GanttBarProps) {
  const baseColor = task.is_critical ? '#ef4444' : task.is_summary ? '#8b5cf6' : '#6366f1'
  const statusColor = statusColors[task.status] || '#6366f1'
  const progress = task.percent_complete || 0

  // Milestone diamond
  if (task.task_type === 'milestone') {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
            <Typography variant="caption">Marco</Typography>
          </Box>
        }
        arrow
      >
        <Box
          onClick={onClick}
          sx={{
            position: 'absolute',
            left: x - height / 2,
            top: y,
            width: height,
            height: height,
            bgcolor: '#f59e0b',
            transform: 'rotate(45deg)',
            cursor: 'pointer',
            border: isSelected ? '2px solid #1f2937' : 'none',
            boxShadow: isSelected ? '0 0 0 2px white' : 'none',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'rotate(45deg) scale(1.1)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            },
          }}
        />
      </Tooltip>
    )
  }

  // Summary bar (thinner, different style)
  if (task.is_summary) {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
            <Typography variant="caption">
              {task.start_date && new Date(task.start_date).toLocaleDateString('pt-BR')}
              {task.end_date && ` - ${new Date(task.end_date).toLocaleDateString('pt-BR')}`}
            </Typography>
            <Typography variant="caption" display="block">
              Progresso: {progress}%
            </Typography>
          </Box>
        }
        arrow
      >
        <Box
          onClick={onClick}
          sx={{
            position: 'absolute',
            left: x,
            top: y + height / 2 - 3,
            width: width,
            height: 6,
            cursor: 'pointer',
          }}
        >
          {/* Background */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              bgcolor: alpha(baseColor, 0.3),
              borderRadius: 1,
            }}
          />
          {/* Progress */}
          <Box
            sx={{
              position: 'absolute',
              width: `${progress}%`,
              height: '100%',
              bgcolor: baseColor,
              borderRadius: 1,
            }}
          />
          {/* End caps */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: -3,
              width: 6,
              height: 12,
              bgcolor: baseColor,
              borderRadius: '2px 0 0 2px',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: -3,
              width: 6,
              height: 12,
              bgcolor: baseColor,
              borderRadius: '0 2px 2px 0',
            }}
          />
          {/* Selection indicator */}
          {isSelected && (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                left: -2,
                right: -2,
                bottom: -4,
                border: '2px solid #1f2937',
                borderRadius: 1,
              }}
            />
          )}
        </Box>
      </Tooltip>
    )
  }

  // Regular task bar
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
          <Typography variant="caption">
            {task.start_date && new Date(task.start_date).toLocaleDateString('pt-BR')}
            {task.end_date && ` - ${new Date(task.end_date).toLocaleDateString('pt-BR')}`}
          </Typography>
          <Typography variant="caption" display="block">
            Progresso: {progress}%
          </Typography>
          {task.assigned_to_profile && (
            <Typography variant="caption" display="block">
              Responsável: {task.assigned_to_profile.full_name}
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Box
        onClick={onClick}
        sx={{
          position: 'absolute',
          left: x,
          top: y,
          width: width,
          height: height,
          borderRadius: 1.5,
          overflow: 'hidden',
          cursor: 'pointer',
          border: isSelected ? '2px solid #1f2937' : 'none',
          boxShadow: isSelected
            ? '0 0 0 2px white, 0 4px 8px rgba(0,0,0,0.2)'
            : '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        }}
      >
        {/* Background */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            bgcolor: alpha(baseColor, 0.2),
          }}
        />

        {/* Progress fill */}
        <Box
          sx={{
            position: 'absolute',
            width: `${progress}%`,
            height: '100%',
            bgcolor: baseColor,
            transition: 'width 0.3s',
          }}
        />

        {/* Status indicator */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: statusColor,
          }}
        />

        {/* Text label */}
        {width > 60 && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: progress > 50 ? 'white' : 'text.primary',
              fontWeight: 500,
              maxWidth: width - 16,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: progress > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {task.title}
          </Typography>
        )}

        {/* Progress percentage */}
        {width > 100 && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: progress > 80 ? 'white' : 'text.secondary',
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          >
            {progress}%
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}
