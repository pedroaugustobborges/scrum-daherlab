import { Box, Typography, Chip, LinearProgress, alpha, Tooltip } from '@mui/material'
import { Flag, CheckCircle, Schedule, Warning, AccountTree } from '@mui/icons-material'
import type { WBSNode as WBSNodeType, TaskStatus } from '@/types/hybrid'

interface WBSNodeProps {
  node: WBSNodeType
  isSelected?: boolean
  onClick?: () => void
  predecessorCount?: number
  successorCount?: number
}

const statusColors: Record<TaskStatus, string> = {
  'todo': '#6b7280',
  'in-progress': '#f59e0b',
  'review': '#8b5cf6',
  'done': '#10b981',
  'blocked': '#ef4444',
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  'todo': <Schedule sx={{ fontSize: 14 }} />,
  'in-progress': <Schedule sx={{ fontSize: 14 }} />,
  'review': <Schedule sx={{ fontSize: 14 }} />,
  'done': <CheckCircle sx={{ fontSize: 14 }} />,
  'blocked': <Warning sx={{ fontSize: 14 }} />,
}

export default function WBSNode({ node, isSelected, onClick, predecessorCount = 0, successorCount = 0 }: WBSNodeProps) {
  const status = node.attributes?.status || 'todo'
  const statusColor = statusColors[status] || '#6b7280'
  const hasChildren = node.children && node.children.length > 0
  const isSummary = node.taskType === 'summary' || node.taskType === 'phase' || hasChildren
  const isMilestone = node.taskType === 'milestone'
  const isCritical = node.attributes?.isCritical
  const hasDependencies = predecessorCount > 0 || successorCount > 0

  return (
    <Box
      onClick={onClick}
      sx={{
        minWidth: 180,
        maxWidth: 220,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '2px solid',
        borderColor: isSelected
          ? 'primary.main'
          : isCritical
          ? 'error.main'
          : 'divider',
        boxShadow: isSelected
          ? '0 4px 12px rgba(99, 102, 241, 0.25)'
          : isCritical
          ? '0 4px 12px rgba(239, 68, 68, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: isSummary
            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            : isMilestone
            ? alpha('#f59e0b', 0.1)
            : alpha(statusColor, 0.1),
          background: isSummary
            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            : undefined,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {isMilestone && <Flag sx={{ fontSize: 16, color: '#f59e0b' }} />}
        {node.wbsCode && (
          <Chip
            label={node.wbsCode}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: isSummary ? 'rgba(255,255,255,0.2)' : 'background.paper',
              color: isSummary ? 'white' : 'text.primary',
            }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: isSummary ? 'white' : statusColor,
          }}
        >
          {statusIcons[status]}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 1.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isSummary ? 600 : 500,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
          }}
        >
          {node.name}
        </Typography>

        {/* Progress Bar */}
        {node.attributes?.progress !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={node.attributes.progress}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(statusColor, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: node.attributes.progress === 100 ? '#10b981' : statusColor,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, minWidth: 35, textAlign: 'right' }}
            >
              {node.attributes.progress}%
            </Typography>
          </Box>
        )}

        {/* Dates */}
        {(node.attributes?.startDate || node.attributes?.endDate) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {node.attributes.startDate && new Date(node.attributes.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {node.attributes.startDate && node.attributes.endDate && ' - '}
            {node.attributes.endDate && new Date(node.attributes.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </Typography>
        )}

        {/* Critical Path Indicator */}
        {isCritical && (
          <Chip
            label="Caminho Crítico"
            size="small"
            sx={{
              mt: 1,
              height: 18,
              fontSize: '0.6rem',
              bgcolor: 'error.main',
              color: 'white',
            }}
          />
        )}

        {/* Dependencies Indicator */}
        {hasDependencies && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            {predecessorCount > 0 && (
              <Tooltip title={`${predecessorCount} predecessora${predecessorCount > 1 ? 's' : ''}`}>
                <Chip
                  icon={<AccountTree sx={{ fontSize: 12 }} />}
                  label={`${predecessorCount} pred`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.55rem',
                    bgcolor: alpha('#6366f1', 0.1),
                    color: '#6366f1',
                    '& .MuiChip-icon': { fontSize: 12 },
                  }}
                />
              </Tooltip>
            )}
            {successorCount > 0 && (
              <Tooltip title={`${successorCount} sucessora${successorCount > 1 ? 's' : ''}`}>
                <Chip
                  icon={<AccountTree sx={{ fontSize: 12 }} />}
                  label={`${successorCount} suc`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.55rem',
                    bgcolor: alpha('#10b981', 0.1),
                    color: '#10b981',
                    '& .MuiChip-icon': { fontSize: 12 },
                  }}
                />
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
