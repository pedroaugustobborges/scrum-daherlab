import { Box, Typography, Paper, Chip, alpha } from '@mui/material'
import {
  Speed,
  Timeline,
  Merge,
  Check,
  ViewKanban,
  List,
  AccountTree,
  CalendarMonth,
} from '@mui/icons-material'
import type { WizardData, Methodology } from '@/types/hybrid'

interface WizardStepMethodologyProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
  onMethodologyChange: (methodology: Methodology) => void
}

interface MethodologyOption {
  type: Methodology
  title: string
  subtitle: string
  description: string
  icon: React.ReactNode
  features: { icon: React.ReactNode; label: string }[]
  color: string
  recommended?: boolean
}

const methodologies: MethodologyOption[] = [
  {
    type: 'agile',
    title: 'Ágil',
    subtitle: 'Scrum / Kanban',
    description:
      'Ideal para projetos com requisitos evolutivos. Iterações curtas, entregas frequentes e adaptação contínua.',
    icon: <Speed sx={{ fontSize: 40 }} />,
    color: '#6366f1',
    features: [
      { icon: <ViewKanban fontSize="small" />, label: 'Kanban Board' },
      { icon: <List fontSize="small" />, label: 'Product Backlog' },
      { icon: <Speed fontSize="small" />, label: 'Sprints' },
      { icon: <CalendarMonth fontSize="small" />, label: 'Cerimônias' },
    ],
    recommended: true,
  },
  {
    type: 'predictive',
    title: 'Preditivo',
    subtitle: 'Waterfall / PMBOK',
    description:
      'Ideal para projetos com escopo bem definido. Planejamento detalhado, fases sequenciais e controle rigoroso.',
    icon: <Timeline sx={{ fontSize: 40 }} />,
    color: '#10b981',
    features: [
      { icon: <Timeline fontSize="small" />, label: 'Gantt Chart' },
      { icon: <AccountTree fontSize="small" />, label: 'WBS' },
      { icon: <List fontSize="small" />, label: 'Grade de Tarefas' },
      { icon: <CalendarMonth fontSize="small" />, label: 'Linha do Tempo' },
    ],
  },
  {
    type: 'hybrid',
    title: 'Híbrido',
    subtitle: 'Melhor dos Dois',
    description:
      'Combine agilidade com planejamento. Use Sprints para execução e Gantt para visão macro do cronograma.',
    icon: <Merge sx={{ fontSize: 40 }} />,
    color: '#f59e0b',
    features: [
      { icon: <ViewKanban fontSize="small" />, label: 'Todos os módulos' },
      { icon: <Timeline fontSize="small" />, label: 'Gantt + Kanban' },
      { icon: <AccountTree fontSize="small" />, label: 'WBS + Backlog' },
      { icon: <Speed fontSize="small" />, label: 'Flexibilidade total' },
    ],
  },
]

export default function WizardStepMethodology({
  data,
  onMethodologyChange,
}: WizardStepMethodologyProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Escolha a Metodologia
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Selecione a abordagem que melhor se adapta ao seu projeto. Você pode
          personalizar os módulos no próximo passo.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {methodologies.map((methodology) => {
          const isSelected = data.methodology === methodology.type

          return (
            <Paper
              key={methodology.type}
              onClick={() => onMethodologyChange(methodology.type)}
              sx={{
                p: 3,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                border: '2px solid',
                borderColor: isSelected
                  ? methodology.color
                  : 'rgba(0, 0, 0, 0.08)',
                bgcolor: isSelected
                  ? alpha(methodology.color, 0.05)
                  : 'background.paper',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                '&:hover': {
                  borderColor: methodology.color,
                  bgcolor: alpha(methodology.color, 0.03),
                  transform: 'scale(1.02)',
                },
              }}
            >
              {/* Recommended badge */}
              {methodology.recommended && (
                <Chip
                  label="Recomendado"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    bgcolor: alpha(methodology.color, 0.1),
                    color: methodology.color,
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    height: 22,
                  }}
                />
              )}

              {/* Selected indicator */}
              {isSelected && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: methodology.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check sx={{ fontSize: 16, color: 'white' }} />
                </Box>
              )}

              {/* Icon */}
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  bgcolor: alpha(methodology.color, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: methodology.color,
                  mb: 2,
                  mt: methodology.recommended ? 2 : 0,
                }}
              >
                {methodology.icon}
              </Box>

              {/* Title */}
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: isSelected ? methodology.color : 'text.primary' }}
              >
                {methodology.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  mb: 1,
                }}
              >
                {methodology.subtitle}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, lineHeight: 1.6 }}
              >
                {methodology.description}
              </Typography>

              {/* Features */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {methodology.features.map((feature, index) => (
                  <Chip
                    key={index}
                    icon={feature.icon as React.ReactElement}
                    label={feature.label}
                    size="small"
                    sx={{
                      bgcolor: alpha(methodology.color, 0.08),
                      color: isSelected ? methodology.color : 'text.secondary',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      '& .MuiChip-icon': {
                        color: 'inherit',
                      },
                    }}
                  />
                ))}
              </Box>
            </Paper>
          )
        })}
      </Box>

      {/* Info box */}
      <Paper
        sx={{
          p: 2,
          bgcolor: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Dica:</strong> Não se preocupe em fazer a escolha perfeita agora.
          Você pode habilitar ou desabilitar módulos a qualquer momento nas
          configurações do projeto.
        </Typography>
      </Paper>
    </Box>
  )
}
