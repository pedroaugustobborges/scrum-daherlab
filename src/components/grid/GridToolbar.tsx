import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Chip,
} from '@mui/material'
import {
  Add,
  Delete,
  FormatIndentIncrease,
  FormatIndentDecrease,
  UnfoldMore,
  UnfoldLess,
  Refresh,
} from '@mui/icons-material'

interface GridToolbarProps {
  selectedCount: number
  onAddTask: () => void
  onAddSubtask: () => void
  onDelete: () => void
  onIndent: () => void
  onOutdent: () => void
  canIndent: boolean
  canOutdent: boolean
  onExpandAll?: () => void
  onCollapseAll?: () => void
  onRefresh?: () => void
}

export default function GridToolbar({
  selectedCount,
  onAddTask,
  onAddSubtask,
  onDelete,
  onIndent,
  onOutdent,
  canIndent,
  canOutdent,
  onExpandAll,
  onCollapseAll,
  onRefresh,
}: GridToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        mb: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Add Actions */}
      <Button
        variant="contained"
        size="small"
        startIcon={<Add />}
        onClick={onAddTask}
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        }}
      >
        Nova Tarefa
      </Button>

      <Button
        variant="outlined"
        size="small"
        startIcon={<Add />}
        onClick={onAddSubtask}
        disabled={selectedCount !== 1}
        sx={{
          borderColor: 'rgba(99, 102, 241, 0.3)',
          color: '#6366f1',
          '&:hover': {
            borderColor: '#6366f1',
            bgcolor: 'rgba(99, 102, 241, 0.05)',
          },
        }}
      >
        Subtarefa
      </Button>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Hierarchy Actions */}
      <Tooltip title="Recuar (tornar subtarefa)">
        <span>
          <IconButton
            size="small"
            onClick={onIndent}
            disabled={!canIndent}
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              '&.Mui-disabled': { bgcolor: 'transparent' },
            }}
          >
            <FormatIndentIncrease />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Promover (subir nível)">
        <span>
          <IconButton
            size="small"
            onClick={onOutdent}
            disabled={!canOutdent}
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              '&.Mui-disabled': { bgcolor: 'transparent' },
            }}
          >
            <FormatIndentDecrease />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Expand/Collapse */}
      {onExpandAll && (
        <Tooltip title="Expandir tudo">
          <IconButton size="small" onClick={onExpandAll}>
            <UnfoldMore />
          </IconButton>
        </Tooltip>
      )}

      {onCollapseAll && (
        <Tooltip title="Recolher tudo">
          <IconButton size="small" onClick={onCollapseAll}>
            <UnfoldLess />
          </IconButton>
        </Tooltip>
      )}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Selection Info */}
      {selectedCount > 0 && (
        <Chip
          label={`${selectedCount} selecionado(s)`}
          size="small"
          onDelete={onDelete}
          deleteIcon={<Delete />}
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontWeight: 600,
            '& .MuiChip-deleteIcon': {
              color: '#ef4444',
              '&:hover': { color: '#dc2626' },
            },
          }}
        />
      )}

      {/* Refresh */}
      {onRefresh && (
        <Tooltip title="Atualizar">
          <IconButton size="small" onClick={onRefresh}>
            <Refresh />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
