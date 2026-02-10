import { useState, useCallback } from 'react'
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  IconButton,
  Fade,
  CircularProgress,
} from '@mui/material'
import {
  Close,
  ArrowBack,
  ArrowForward,
  Check,
  Rocket,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateProjectConfig } from '@/hooks/useProjectConfig'
import type { WizardData, Methodology } from '@/types/hybrid'
import WizardStepBasicInfo from './WizardStepBasicInfo'
import WizardStepMethodology from './WizardStepMethodology'
import WizardStepModules from './WizardStepModules'
import WizardStepReview from './WizardStepReview'

interface ProjectCreationWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: (projectId: string) => void
}

const steps = [
  { label: 'Informações', description: 'Nome e detalhes do projeto' },
  { label: 'Metodologia', description: 'Agile, Preditivo ou Híbrido' },
  { label: 'Módulos', description: 'Personalize as funcionalidades' },
  { label: 'Revisar', description: 'Confirme e crie' },
]

const initialWizardData: WizardData = {
  // Step 1
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  selectedTeams: [],
  status: 'active',
  // Step 2
  methodology: 'agile',
  // Step 3
  modules: {
    kanban: true,
    backlog: true,
    sprints: true,
    gantt: false,
    wbs: false,
    grid_view: false,
    calendar: true,
    timeline: false,
  },
  // Step 4
  gantt_settings: {
    zoom_level: 'week',
    working_days: 5,
    hours_per_day: 8,
  },
}

export default function ProjectCreationWizard({
  open,
  onClose,
  onSuccess,
}: ProjectCreationWizardProps) {
  const { user } = useAuth()
  const createConfig = useCreateProjectConfig()
  const [activeStep, setActiveStep] = useState(0)
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDataChange = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleMethodologyChange = useCallback((methodology: Methodology) => {
    // Update methodology and auto-set module defaults
    const moduleDefaults = {
      agile: {
        kanban: true,
        backlog: true,
        sprints: true,
        gantt: false,
        wbs: false,
        grid_view: false,
        calendar: true,
        timeline: false,
      },
      predictive: {
        kanban: false,
        backlog: false,
        sprints: false,
        gantt: true,
        wbs: true,
        grid_view: true,
        calendar: true,
        timeline: true,
      },
      hybrid: {
        kanban: true,
        backlog: true,
        sprints: true,
        gantt: true,
        wbs: true,
        grid_view: true,
        calendar: true,
        timeline: true,
      },
    }

    setWizardData((prev) => ({
      ...prev,
      methodology,
      modules: moduleDefaults[methodology],
    }))
  }, [])

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return wizardData.name.trim().length > 0
      case 1:
        return !!wizardData.methodology
      case 2:
        return Object.values(wizardData.modules).some(Boolean)
      case 3:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (isStepValid(activeStep)) {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Create the project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: wizardData.name,
            description: wizardData.description,
            status: wizardData.status,
            start_date: wizardData.start_date || null,
            end_date: wizardData.end_date || null,
            created_by: user.id,
          },
        ])
        .select('id')
        .single()

      if (projectError) throw projectError

      const projectId = projectData.id

      // 2. Create project configuration
      await createConfig.mutateAsync({
        projectId,
        methodology: wizardData.methodology,
        modules: {
          module_kanban: wizardData.modules.kanban,
          module_backlog: wizardData.modules.backlog,
          module_sprints: wizardData.modules.sprints,
          module_gantt: wizardData.modules.gantt,
          module_wbs: wizardData.modules.wbs,
          module_grid_view: wizardData.modules.grid_view,
          module_calendar: wizardData.modules.calendar,
          module_timeline: wizardData.modules.timeline,
          gantt_zoom_level: wizardData.gantt_settings?.zoom_level || 'week',
          working_days_per_week: wizardData.gantt_settings?.working_days || 5,
          hours_per_day: wizardData.gantt_settings?.hours_per_day || 8,
        },
      })

      // 3. Associate teams if selected
      if (wizardData.selectedTeams.length > 0) {
        const projectTeamsData = wizardData.selectedTeams.map((teamId) => ({
          project_id: projectId,
          team_id: teamId,
        }))

        const { error: teamsError } = await supabase
          .from('project_teams')
          .insert(projectTeamsData)

        if (teamsError) {
          console.error('Error associating teams:', teamsError)
          // Don't throw - project was created successfully
        }
      }

      toast.success('Projeto criado com sucesso!')
      resetWizard()
      onSuccess(projectId)
      onClose()
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Erro ao criar projeto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetWizard = () => {
    setActiveStep(0)
    setWizardData(initialWizardData)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  if (!open) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Fade in={open}>
        <Paper
          elevation={24}
          sx={{
            width: '100%',
            maxWidth: 900,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
            mx: 2,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              px: 4,
              py: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Rocket sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Criar Novo Projeto
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Configure seu projeto em poucos passos
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={handleClose}
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Stepper */}
          <Box sx={{ px: 4, pt: 3, pb: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step) => (
                <Step key={step.label}>
                  <StepLabel
                    optional={
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    }
                    StepIconProps={{
                      sx: {
                        '&.Mui-completed': { color: '#10b981' },
                        '&.Mui-active': { color: '#6366f1' },
                      },
                    }}
                  >
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 4,
              py: 2,
            }}
          >
            {activeStep === 0 && (
              <WizardStepBasicInfo
                data={wizardData}
                onChange={handleDataChange}
              />
            )}
            {activeStep === 1 && (
              <WizardStepMethodology
                data={wizardData}
                onChange={handleDataChange}
                onMethodologyChange={handleMethodologyChange}
              />
            )}
            {activeStep === 2 && (
              <WizardStepModules
                data={wizardData}
                onChange={handleDataChange}
              />
            )}
            {activeStep === 3 && (
              <WizardStepReview data={wizardData} />
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              px: 4,
              py: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: 'grey.50',
            }}
          >
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || isSubmitting}
              startIcon={<ArrowBack />}
              sx={{
                color: '#6366f1',
                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
              }}
            >
              Voltar
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={isSubmitting}
                sx={{
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: '#6366f1',
                  '&:hover': {
                    borderColor: '#6366f1',
                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                  },
                }}
              >
                Cancelar
              </Button>

              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!isStepValid(activeStep)}
                  endIcon={<ArrowForward />}
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  }}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Check />
                    )
                  }
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    },
                  }}
                >
                  {isSubmitting ? 'Criando...' : 'Criar Projeto'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Fade>
    </Box>
  )
}
