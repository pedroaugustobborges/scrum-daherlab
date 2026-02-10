import { Box, Typography, Paper, Chip, Divider, alpha } from '@mui/material'
import {
  Assignment,
  CalendarToday,
  Groups,
  Speed,
  Timeline,
  Merge,
  ViewKanban,
  List,
  AccountTree,
  TableChart,
  CalendarMonth,
  LinearScale,
  Check,
} from '@mui/icons-material'
import type { WizardData, Methodology } from '@/types/hybrid'

interface WizardStepReviewProps {
  data: WizardData
}

const methodologyInfo: Record<
  Methodology,
  { label: string; icon: React.ReactNode; color: string }
> = {
  agile: { label: 'Ágil', icon: <Speed />, color: '#6366f1' },
  predictive: { label: 'Preditivo', icon: <Timeline />, color: '#10b981' },
  hybrid: { label: 'Híbrido', icon: <Merge />, color: '#f59e0b' },
}

const moduleInfo: Record<
  keyof WizardData['modules'],
  { label: string; icon: React.ReactNode }
> = {
  kanban: { label: 'Kanban', icon: <ViewKanban fontSize="small" /> },
  backlog: { label: 'Backlog', icon: <List fontSize="small" /> },
  sprints: { label: 'Sprints', icon: <Speed fontSize="small" /> },
  gantt: { label: 'Gantt', icon: <Timeline fontSize="small" /> },
  wbs: { label: 'WBS', icon: <AccountTree fontSize="small" /> },
  grid_view: { label: 'Grade', icon: <TableChart fontSize="small" /> },
  calendar: { label: 'Calendário', icon: <CalendarMonth fontSize="small" /> },
  timeline: { label: 'Linha do Tempo', icon: <LinearScale fontSize="small" /> },
}

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: '#10b981' },
  'on-hold': { label: 'Em Espera', color: '#f59e0b' },
  completed: { label: 'Concluído', color: '#6366f1' },
  archived: { label: 'Arquivado', color: '#6b7280' },
}

export default function WizardStepReview({ data }: WizardStepReviewProps) {
  const methodology = methodologyInfo[data.methodology]
  const status = statusLabels[data.status] || statusLabels.active
  const enabledModules = Object.entries(data.modules)
    .filter(([, enabled]) => enabled)
    .map(([key]) => moduleInfo[key as keyof WizardData['modules']])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Não definida'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Revise as Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Confira os detalhes do projeto antes de criar
        </Typography>
      </Box>

      {/* Project Info Card */}
      <Paper
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'rgba(99, 102, 241, 0.2)',
          bgcolor: 'rgba(99, 102, 241, 0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
            }}
          >
            <Assignment sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {data.name || 'Sem nome'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.description || 'Sem descrição'}
            </Typography>
          </Box>
          <Chip
            label={status.label}
            size="small"
            sx={{
              bgcolor: alpha(status.color, 0.1),
              color: status.color,
              fontWeight: 600,
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Details Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {/* Methodology */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: alpha(methodology.color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: methodology.color,
              }}
            >
              {methodology.icon}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Metodologia
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {methodology.label}
              </Typography>
            </Box>
          </Box>

          {/* Teams */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <Groups fontSize="small" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Times
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {data.selectedTeams.length > 0
                  ? `${data.selectedTeams.length} time(s) selecionado(s)`
                  : 'Nenhum time'}
              </Typography>
            </Box>
          </Box>

          {/* Start Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <CalendarToday fontSize="small" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Data de Início
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatDate(data.start_date)}
              </Typography>
            </Box>
          </Box>

          {/* End Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <CalendarToday fontSize="small" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Data de Término
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatDate(data.end_date)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Enabled Modules */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Módulos Habilitados ({enabledModules.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {enabledModules.map((module, index) => (
            <Chip
              key={index}
              icon={module.icon as React.ReactElement}
              label={module.label}
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: '#6366f1',
                },
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Ready to go */}
      <Paper
        sx={{
          p: 3,
          bgcolor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
          }}
        >
          <Check sx={{ fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} color="#10b981">
            Tudo pronto!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Clique em "Criar Projeto" para começar a trabalhar
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
