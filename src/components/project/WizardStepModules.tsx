import {
  Box,
  Typography,
  Paper,
  Switch,
  alpha,
  Chip,
} from '@mui/material'
import {
  ViewKanban,
  List,
  Speed,
  Timeline,
  AccountTree,
  TableChart,
  CalendarMonth,
  LinearScale,
} from '@mui/icons-material'
import type { WizardData } from '@/types/hybrid'

interface WizardStepModulesProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
}

interface ModuleOption {
  key: keyof WizardData['modules']
  label: string
  description: string
  icon: React.ReactNode
  category: 'agile' | 'predictive' | 'shared'
}

const modules: ModuleOption[] = [
  // Agile modules
  {
    key: 'kanban',
    label: 'Kanban Board',
    description: 'Visualize o fluxo de trabalho com colunas drag-and-drop',
    icon: <ViewKanban />,
    category: 'agile',
  },
  {
    key: 'backlog',
    label: 'Product Backlog',
    description: 'Gerencie e priorize itens do backlog do produto',
    icon: <List />,
    category: 'agile',
  },
  {
    key: 'sprints',
    label: 'Sprints',
    description: 'Organize o trabalho em iterações com burndown e velocity',
    icon: <Speed />,
    category: 'agile',
  },
  // Predictive modules
  {
    key: 'gantt',
    label: 'Gráfico de Gantt',
    description: 'Visualize cronograma com dependências e caminho crítico',
    icon: <Timeline />,
    category: 'predictive',
  },
  {
    key: 'wbs',
    label: 'WBS (Estrutura Analítica)',
    description: 'Diagrama hierárquico de decomposição do trabalho',
    icon: <AccountTree />,
    category: 'predictive',
  },
  {
    key: 'grid_view',
    label: 'Visão em Grade',
    description: 'Lista hierárquica de tarefas estilo MS Project',
    icon: <TableChart />,
    category: 'predictive',
  },
  // Shared modules
  {
    key: 'calendar',
    label: 'Calendário',
    description: 'Visualize tarefas e marcos em formato de calendário',
    icon: <CalendarMonth />,
    category: 'shared',
  },
  {
    key: 'timeline',
    label: 'Linha do Tempo',
    description: 'Visão temporal horizontal de eventos e entregas',
    icon: <LinearScale />,
    category: 'shared',
  },
]

const categoryLabels = {
  agile: { label: 'Módulos Ágeis', color: '#6366f1' },
  predictive: { label: 'Módulos Preditivos', color: '#10b981' },
  shared: { label: 'Módulos Compartilhados', color: '#f59e0b' },
}

export default function WizardStepModules({
  data,
  onChange,
}: WizardStepModulesProps) {
  const handleToggle = (key: keyof WizardData['modules']) => {
    onChange({
      modules: {
        ...data.modules,
        [key]: !data.modules[key],
      },
    })
  }

  const enabledCount = Object.values(data.modules).filter(Boolean).length

  const renderModulesByCategory = (category: 'agile' | 'predictive' | 'shared') => {
    const categoryModules = modules.filter((m) => m.category === category)
    const categoryInfo = categoryLabels[category]

    return (
      <Box key={category}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: categoryInfo.color,
            }}
          />
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
            {categoryInfo.label}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {categoryModules.map((module) => {
            const isEnabled = data.modules[module.key]

            return (
              <Paper
                key={module.key}
                onClick={() => handleToggle(module.key)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.2s ease',
                  border: '1px solid',
                  borderColor: isEnabled
                    ? alpha(categoryInfo.color, 0.5)
                    : 'transparent',
                  bgcolor: isEnabled
                    ? alpha(categoryInfo.color, 0.05)
                    : 'background.paper',
                  '&:hover': {
                    bgcolor: alpha(categoryInfo.color, 0.08),
                    borderColor: alpha(categoryInfo.color, 0.3),
                  },
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: isEnabled
                      ? alpha(categoryInfo.color, 0.15)
                      : 'rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isEnabled ? categoryInfo.color : 'text.secondary',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {module.icon}
                </Box>

                {/* Info */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    sx={{
                      color: isEnabled ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {module.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {module.description}
                  </Typography>
                </Box>

                {/* Switch */}
                <Switch
                  checked={isEnabled}
                  onChange={() => handleToggle(module.key)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: categoryInfo.color,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: categoryInfo.color,
                    },
                  }}
                />
              </Paper>
            )
          })}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Personalize os Módulos
          </Typography>
          <Chip
            label={`${enabledCount} módulos ativos`}
            size="small"
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              fontWeight: 600,
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Ative ou desative os módulos conforme as necessidades do seu projeto.
          Baseado na metodologia {data.methodology === 'agile' ? 'Ágil' : data.methodology === 'predictive' ? 'Preditiva' : 'Híbrida'}, selecionamos os módulos mais adequados.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Left column: Agile + Shared */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {renderModulesByCategory('agile')}
          {renderModulesByCategory('shared')}
        </Box>

        {/* Right column: Predictive */}
        <Box>{renderModulesByCategory('predictive')}</Box>
      </Box>

      {/* Warning if no modules */}
      {enabledCount === 0 && (
        <Paper
          sx={{
            p: 2,
            bgcolor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Typography variant="body2" color="error">
            <strong>Atenção:</strong> Selecione pelo menos um módulo para continuar.
          </Typography>
        </Paper>
      )}

      {/* Info box */}
      <Paper
        sx={{
          p: 2,
          bgcolor: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Dica:</strong> Você pode alterar esses módulos a qualquer momento
          nas configurações do projeto. Comece com menos e adicione conforme
          necessário.
        </Typography>
      </Paper>
    </Box>
  )
}
