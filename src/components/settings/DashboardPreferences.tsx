import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
} from '@mui/material'
import {
  Dashboard,
  Assignment,
  SpaceDashboard,
  People,
  CheckCircle,
  TrendingUp,
  PieChart,
  History,
  ShowChart,
  Groups,
} from '@mui/icons-material'
import { WidgetCustomizationModal } from '@/components/dashboard'
import { useDashboardConfig } from '@/hooks/useDashboardConfig'
import { WidgetType, WIDGET_LABELS } from '@/types'

// Widget icons mapping
const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  activeProjects: <Assignment sx={{ fontSize: 18 }} />,
  activeSprints: <SpaceDashboard sx={{ fontSize: 18 }} />,
  teamMetrics: <People sx={{ fontSize: 18 }} />,
  actionItems: <CheckCircle sx={{ fontSize: 18 }} />,
  activityOverview: <TrendingUp sx={{ fontSize: 18 }} />,
  taskDistribution: <PieChart sx={{ fontSize: 18 }} />,
  recentActivity: <History sx={{ fontSize: 18 }} />,
  productivityTrend: <ShowChart sx={{ fontSize: 18 }} />,
  teamWorkload: <Groups sx={{ fontSize: 18 }} />,
}

export default function DashboardPreferences() {
  const { dashboardConfig } = useDashboardConfig()
  const [modalOpen, setModalOpen] = useState(false)

  const visibleWidgets = dashboardConfig.widgets.filter((w) => w.visible)
  const hiddenWidgets = dashboardConfig.widgets.filter((w) => !w.visible)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Widgets do Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalize quais widgets aparecem no seu dashboard e em qual ordem.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Dashboard />}
          onClick={() => setModalOpen(true)}
          sx={{
            bgcolor: '#6366f1',
            '&:hover': {
              bgcolor: '#4f46e5',
            },
          }}
        >
          Configurar Widgets
        </Button>
      </Box>

      {/* Visible widgets */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Widgets Visíveis ({visibleWidgets.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {visibleWidgets
            .sort((a, b) => a.order - b.order)
            .map((widget) => (
              <Chip
                key={widget.id}
                icon={WIDGET_ICONS[widget.type] as React.ReactElement}
                label={WIDGET_LABELS[widget.type]}
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: '#6366f1',
                  },
                }}
              />
            ))}
          {visibleWidgets.length === 0 && (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Nenhum widget visível
            </Typography>
          )}
        </Box>
      </Box>

      {/* Hidden widgets */}
      {hiddenWidgets.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Widgets Ocultos ({hiddenWidgets.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {hiddenWidgets.map((widget) => (
              <Chip
                key={widget.id}
                icon={WIDGET_ICONS[widget.type] as React.ReactElement}
                label={WIDGET_LABELS[widget.type]}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                  color: 'text.secondary',
                  '& .MuiChip-icon': {
                    color: 'text.secondary',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Widget Customization Modal */}
      <WidgetCustomizationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Box>
  )
}
