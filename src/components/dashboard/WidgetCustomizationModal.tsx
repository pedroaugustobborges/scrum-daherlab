import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  IconButton,
} from '@mui/material'
import {
  DragIndicator,
  Close,
  Assignment,
  SpaceDashboard,
  HourglassEmpty,
  TrendingUp,
  PieChart,
  History,
  ShowChart,
  Groups,
} from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WidgetConfig, WidgetType, WIDGET_LABELS } from '@/types'
import {
  useDashboardConfig,
  useUpdateDashboardConfig,
} from '@/hooks/useDashboardConfig'

interface WidgetCustomizationModalProps {
  open: boolean
  onClose: () => void
}

// Widget icons mapping
const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  activeProjects: <Assignment sx={{ fontSize: 20, color: '#1e40af' }} />,
  activeSprints: <SpaceDashboard sx={{ fontSize: 20, color: '#0891b2' }} />,
  actionLatency: <HourglassEmpty sx={{ fontSize: 20, color: '#f97316' }} />,
  activityOverview: <TrendingUp sx={{ fontSize: 20, color: '#6366f1' }} />,
  taskDistribution: <PieChart sx={{ fontSize: 20, color: '#8b5cf6' }} />,
  recentActivity: <History sx={{ fontSize: 20, color: '#6366f1' }} />,
  productivityTrend: <ShowChart sx={{ fontSize: 20, color: '#10b981' }} />,
  teamWorkload: <Groups sx={{ fontSize: 20, color: '#7c3aed' }} />,
}

interface SortableWidgetItemProps {
  widget: WidgetConfig
  onToggle: (id: string) => void
}

function SortableWidgetItem({ widget, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        mb: 1.5,
        bgcolor: widget.visible ? 'rgba(99, 102, 241, 0.04)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: widget.visible ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
        cursor: 'default',
        '&:hover': {
          borderColor: widget.visible ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0, 0, 0, 0.15)',
          bgcolor: widget.visible ? 'rgba(99, 102, 241, 0.06)' : 'rgba(0, 0, 0, 0.04)',
        },
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          color: 'text.secondary',
          p: 0.5,
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.05)',
          },
        }}
      >
        <DragIndicator fontSize="small" />
      </Box>

      {/* Widget icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: widget.visible ? 'white' : 'rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: widget.visible ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          boxShadow: widget.visible ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
          transition: 'all 0.2s ease',
          opacity: widget.visible ? 1 : 0.5,
        }}
      >
        {WIDGET_ICONS[widget.type]}
      </Box>

      {/* Widget label */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            color: widget.visible ? 'text.primary' : 'text.secondary',
            transition: 'color 0.2s ease',
          }}
        >
          {WIDGET_LABELS[widget.type]}
        </Typography>
      </Box>

      {/* Visibility toggle */}
      <Switch
        checked={widget.visible}
        onChange={() => onToggle(widget.id)}
        size="small"
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#6366f1',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#6366f1',
          },
        }}
      />
    </Box>
  )
}

export default function WidgetCustomizationModal({
  open,
  onClose,
}: WidgetCustomizationModalProps) {
  const { dashboardConfig } = useDashboardConfig()
  const updateConfig = useUpdateDashboardConfig()

  // Local state for editing
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([])

  // Initialize local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalWidgets([...dashboardConfig.widgets].sort((a, b) => a.order - b.order))
    }
  }, [open, dashboardConfig.widgets])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleToggleVisibility = (widgetId: string) => {
    setLocalWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    )
  }

  const handleSave = () => {
    // Update order based on current positions
    const updatedWidgets = localWidgets.map((widget, index) => ({
      ...widget,
      order: index,
    }))

    updateConfig.mutate(
      {
        ...dashboardConfig,
        widgets: updatedWidgets,
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  const handleReset = () => {
    // Reset to default order and all visible
    const resetWidgets = dashboardConfig.widgets.map((widget, index) => ({
      ...widget,
      visible: true,
      order: index,
    }))
    setLocalWidgets(resetWidgets.sort((a, b) => a.order - b.order))
  }

  const visibleCount = localWidgets.filter((w) => w.visible).length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Personalizar Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Arraste para reordenar, use o toggle para mostrar/ocultar
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: 'rgba(99, 102, 241, 0.05)',
            borderRadius: 2,
            border: '1px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>{visibleCount}</strong> de {localWidgets.length} widgets visíveis
          </Typography>
        </Box>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localWidgets.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            {localWidgets.map((widget) => (
              <SortableWidgetItem
                key={widget.id}
                widget={widget}
                onToggle={handleToggleVisibility}
              />
            ))}
          </SortableContext>
        </DndContext>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Button
          onClick={handleReset}
          variant="outlined"
          size="small"
          sx={{
            mr: 'auto',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'text.secondary',
              bgcolor: 'rgba(0, 0, 0, 0.02)',
            },
          }}
        >
          Restaurar Padrões
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={updateConfig.isPending}
        >
          {updateConfig.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
