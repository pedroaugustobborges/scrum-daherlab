import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  alpha,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
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
  Save,
  Edit,
  Delete,
  Archive,
  Refresh,
  Warning,
  CheckCircle,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useProjectContext } from './ProjectDetail'
import { useUpdateProjectConfig, useCreateProjectConfig } from '@/hooks/useProjectConfig'
import { supabase } from '@/lib/supabase'
import type { ProjectConfiguration, GanttZoomLevel, Methodology } from '@/types/hybrid'

interface ModuleOption {
  key: keyof Pick<ProjectConfiguration,
    'module_kanban' | 'module_backlog' | 'module_sprints' |
    'module_gantt' | 'module_wbs' | 'module_grid_view' |
    'module_calendar' | 'module_timeline'
  >
  label: string
  description: string
  icon: React.ReactNode
  category: 'agile' | 'predictive' | 'shared'
  color: string
}

const modules: ModuleOption[] = [
  {
    key: 'module_kanban',
    label: 'Kanban Board',
    description: 'Visualize o fluxo de trabalho com colunas drag-and-drop',
    icon: <ViewKanban />,
    category: 'agile',
    color: '#6366f1',
  },
  {
    key: 'module_backlog',
    label: 'Product Backlog',
    description: 'Gerencie e priorize itens do backlog do produto',
    icon: <List />,
    category: 'agile',
    color: '#6366f1',
  },
  {
    key: 'module_sprints',
    label: 'Sprints',
    description: 'Organize o trabalho em iterações com burndown e velocity',
    icon: <Speed />,
    category: 'agile',
    color: '#6366f1',
  },
  {
    key: 'module_gantt',
    label: 'Gráfico de Gantt',
    description: 'Visualize cronograma com dependências e caminho crítico',
    icon: <Timeline />,
    category: 'predictive',
    color: '#10b981',
  },
  {
    key: 'module_wbs',
    label: 'WBS (Estrutura Analítica)',
    description: 'Diagrama hierárquico de decomposição do trabalho',
    icon: <AccountTree />,
    category: 'predictive',
    color: '#10b981',
  },
  {
    key: 'module_grid_view',
    label: 'Visão em Grade',
    description: 'Lista hierárquica de tarefas estilo MS Project',
    icon: <TableChart />,
    category: 'predictive',
    color: '#10b981',
  },
  {
    key: 'module_calendar',
    label: 'Calendário',
    description: 'Visualize tarefas e marcos em formato de calendário',
    icon: <CalendarMonth />,
    category: 'shared',
    color: '#f59e0b',
  },
  {
    key: 'module_timeline',
    label: 'Linha do Tempo',
    description: 'Visão temporal horizontal de eventos e entregas',
    icon: <LinearScale />,
    category: 'shared',
    color: '#f59e0b',
  },
]

const categoryLabels = {
  agile: { label: 'Módulos Ágeis', color: '#6366f1' },
  predictive: { label: 'Módulos Preditivos', color: '#10b981' },
  shared: { label: 'Módulos Compartilhados', color: '#f59e0b' },
}

const methodologyInfo: Record<Methodology, {
  label: string
  description: string
  color: string
  modules: string[]
}> = {
  agile: {
    label: 'Ágil',
    description: 'Sprints, Kanban, Backlog - Ideal para projetos iterativos e adaptativos',
    color: '#6366f1',
    modules: ['Kanban', 'Backlog', 'Sprints'],
  },
  predictive: {
    label: 'Preditivo',
    description: 'Gantt, WBS, Caminho Crítico - Ideal para projetos com escopo bem definido',
    color: '#10b981',
    modules: ['Gantt', 'WBS', 'Grade'],
  },
  hybrid: {
    label: 'Híbrido',
    description: 'Combine Ágil + Preditivo - Flexibilidade total para qualquer projeto',
    color: '#f59e0b',
    modules: ['Todos os módulos'],
  },
}

const statusOptions = [
  { value: 'active', label: 'Ativo', color: '#10b981' },
  { value: 'on-hold', label: 'Em Espera', color: '#f59e0b' },
  { value: 'completed', label: 'Concluído', color: '#6366f1' },
]

// Default config values for when no config exists
const defaultConfig: Partial<ProjectConfiguration> = {
  methodology: 'agile',
  module_kanban: true,
  module_backlog: true,
  module_sprints: true,
  module_gantt: false,
  module_wbs: false,
  module_grid_view: false,
  module_calendar: true,
  module_timeline: false,
  gantt_zoom_level: 'week',
  working_days_per_week: 5,
  hours_per_day: 8,
}

export default function ProjectSettings() {
  const navigate = useNavigate()
  const { project, config, refreshProject } = useProjectContext()
  const updateConfig = useUpdateProjectConfig()
  const createConfig = useCreateProjectConfig()

  const [configCreated, setConfigCreated] = useState(false)

  // Project info state
  const [projectInfo, setProjectInfo] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'active',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
  })

  // Config state - use default if no config exists
  const [localConfig, setLocalConfig] = useState<Partial<ProjectConfiguration>>(
    config || defaultConfig
  )

  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  // Auto-create config if it doesn't exist
  useEffect(() => {
    const createDefaultConfig = async () => {
      if (!config && project?.id && !configCreated && !createConfig.isPending) {
        setConfigCreated(true)
        try {
          await createConfig.mutateAsync({
            projectId: project.id,
            methodology: 'agile',
          })
          await refreshProject()
        } catch (error) {
          console.error('Error creating default config:', error)
        }
      }
    }
    createDefaultConfig()
  }, [config, project?.id, configCreated, createConfig, refreshProject])

  // Sync state when project/config changes
  useEffect(() => {
    if (project) {
      setProjectInfo({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
      })
    }
  }, [project])

  useEffect(() => {
    if (config) {
      setLocalConfig(config)
    }
  }, [config])

  const handleProjectInfoChange = (field: string, value: string) => {
    setProjectInfo((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleModuleToggle = (key: keyof ProjectConfiguration) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }))
    setHasChanges(true)
  }

  const handleSettingChange = (key: keyof ProjectConfiguration, value: unknown) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
    setHasChanges(true)
  }

  const handleMethodologyChange = (methodology: Methodology) => {
    // Update methodology and set recommended modules
    const newConfig: Partial<ProjectConfiguration> = {
      ...localConfig,
      methodology,
    }

    // Apply recommended module defaults based on methodology
    if (methodology === 'agile') {
      newConfig.module_kanban = true
      newConfig.module_backlog = true
      newConfig.module_sprints = true
      newConfig.module_gantt = false
      newConfig.module_wbs = false
      newConfig.module_grid_view = false
    } else if (methodology === 'predictive') {
      newConfig.module_kanban = false
      newConfig.module_backlog = false
      newConfig.module_sprints = false
      newConfig.module_gantt = true
      newConfig.module_wbs = true
      newConfig.module_grid_view = true
    } else if (methodology === 'hybrid') {
      newConfig.module_kanban = true
      newConfig.module_backlog = true
      newConfig.module_sprints = true
      newConfig.module_gantt = true
      newConfig.module_wbs = true
      newConfig.module_grid_view = true
    }

    setLocalConfig(newConfig)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!project?.id) return

    setSaving(true)
    try {
      // Update project info
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          name: projectInfo.name,
          description: projectInfo.description,
          status: projectInfo.status,
          start_date: projectInfo.start_date || null,
          end_date: projectInfo.end_date || null,
        })
        .eq('id', project.id)

      if (projectError) throw projectError

      // Update or create config
      if (config) {
        // Config exists - update it
        await updateConfig.mutateAsync({
          projectId: project.id,
          updates: localConfig,
        })
      } else {
        // Config doesn't exist - create it
        await createConfig.mutateAsync({
          projectId: project.id,
          methodology: (localConfig.methodology as Methodology) || 'agile',
          modules: localConfig,
        })
      }

      setHasChanges(false)
      await refreshProject()
      toast.success('Configurações salvas com sucesso')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!project?.id) return

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', project.id)

      if (error) throw error

      toast.success('Projeto arquivado')
      navigate('/projects')
    } catch (error) {
      console.error('Error archiving project:', error)
      toast.error('Erro ao arquivar projeto')
    }
    setArchiveDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!project?.id) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      toast.success('Projeto excluído')
      navigate('/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Erro ao excluir projeto')
    }
    setDeleteDialogOpen(false)
  }

  const renderModulesByCategory = (category: 'agile' | 'predictive' | 'shared') => {
    const categoryModules = modules.filter((m) => m.category === category)
    const categoryInfo = categoryLabels[category]

    return (
      <Box key={category} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: categoryInfo.color,
            }}
          />
          <Typography variant="subtitle2" fontWeight={600}>
            {categoryInfo.label}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {categoryModules.map((module) => {
            const isEnabled = localConfig[module.key] ?? config?.[module.key] ?? false

            return (
              <Paper
                key={module.key}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  border: '1px solid',
                  borderColor: isEnabled
                    ? alpha(module.color, 0.3)
                    : 'transparent',
                  bgcolor: isEnabled
                    ? alpha(module.color, 0.02)
                    : 'background.paper',
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: isEnabled
                      ? alpha(module.color, 0.15)
                      : 'rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isEnabled ? module.color : 'text.secondary',
                    '& svg': { fontSize: 20 },
                  }}
                >
                  {module.icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {module.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {module.description}
                  </Typography>
                </Box>

                <Switch
                  size="small"
                  checked={isEnabled}
                  onChange={() => handleModuleToggle(module.key)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: module.color,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: module.color,
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

  // Show loading while creating config
  if (!config && createConfig.isPending) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Criando configuração padrão...</Typography>
      </Box>
    )
  }

  // Use local config values (will have defaults if no config exists yet)
  const currentMethodology = localConfig.methodology ?? 'agile'

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Configurações do Projeto
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalize a metodologia, módulos e informações do projeto
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasChanges && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          {/* Project Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Edit sx={{ color: '#6366f1' }} />
              <Typography variant="h6" fontWeight={700}>
                Informações do Projeto
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome do Projeto"
                  value={projectInfo.name}
                  onChange={(e) => handleProjectInfoChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  value={projectInfo.description}
                  onChange={(e) => handleProjectInfoChange('description', e.target.value)}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={projectInfo.status}
                    label="Status"
                    onChange={(e) => handleProjectInfoChange('status', e.target.value)}
                  >
                    {statusOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: opt.color,
                            }}
                          />
                          {opt.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Início"
                  value={projectInfo.start_date}
                  onChange={(e) => handleProjectInfoChange('start_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data de Término"
                  value={projectInfo.end_date}
                  onChange={(e) => handleProjectInfoChange('end_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Methodology */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Refresh sx={{ color: '#6366f1' }} />
              <Typography variant="h6" fontWeight={700}>
                Metodologia
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Alterar a metodologia ajustará os módulos recomendados automaticamente
            </Typography>

            <Grid container spacing={2}>
              {(['agile', 'predictive', 'hybrid'] as Methodology[]).map((method) => {
                const info = methodologyInfo[method]
                const isSelected = currentMethodology === method

                return (
                  <Grid item xs={12} sm={4} key={method}>
                    <Paper
                      onClick={() => handleMethodologyChange(method)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isSelected ? info.color : 'transparent',
                        bgcolor: isSelected ? alpha(info.color, 0.05) : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: alpha(info.color, 0.5),
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {isSelected && <CheckCircle sx={{ color: info.color, fontSize: 20 }} />}
                        <Typography variant="subtitle1" fontWeight={700}>
                          {info.label}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        {info.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {info.modules.map((mod) => (
                          <Chip
                            key={mod}
                            label={mod}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: alpha(info.color, 0.1),
                              color: info.color,
                            }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>

          {/* Modules */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Módulos Habilitados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ative ou desative os módulos conforme as necessidades do projeto
            </Typography>

            {renderModulesByCategory('agile')}
            {renderModulesByCategory('predictive')}
            {renderModulesByCategory('shared')}
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          {/* Gantt Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Configurações do Gantt
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Nível de Zoom Padrão</InputLabel>
                <Select
                  value={localConfig.gantt_zoom_level ?? config?.gantt_zoom_level ?? 'week'}
                  label="Nível de Zoom Padrão"
                  onChange={(e) =>
                    handleSettingChange('gantt_zoom_level', e.target.value as GanttZoomLevel)
                  }
                >
                  <MenuItem value="day">Dia</MenuItem>
                  <MenuItem value="week">Semana</MenuItem>
                  <MenuItem value="month">Mês</MenuItem>
                  <MenuItem value="quarter">Trimestre</MenuItem>
                  <MenuItem value="year">Ano</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                type="number"
                label="Dias de Trabalho por Semana"
                value={localConfig.working_days_per_week ?? config?.working_days_per_week ?? 5}
                onChange={(e) =>
                  handleSettingChange('working_days_per_week', parseInt(e.target.value))
                }
                inputProps={{ min: 1, max: 7 }}
              />

              <TextField
                fullWidth
                size="small"
                type="number"
                label="Horas por Dia"
                value={localConfig.hours_per_day ?? config?.hours_per_day ?? 8}
                onChange={(e) =>
                  handleSettingChange('hours_per_day', parseFloat(e.target.value))
                }
                inputProps={{ min: 1, max: 24, step: 0.5 }}
              />
            </Box>
          </Paper>

          {/* Info Box */}
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>Dica:</strong> As alterações nos módulos afetam apenas a
              navegação e visualização. Seus dados não serão perdidos ao
              desabilitar um módulo.
            </Typography>
          </Paper>

          {/* Danger Zone */}
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'error.light' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Warning sx={{ color: 'error.main' }} />
              <Typography variant="h6" fontWeight={700} color="error.main">
                Zona de Perigo
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Arquivar Projeto
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  O projeto será movido para arquivados e não aparecerá na lista principal
                </Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<Archive />}
                  onClick={() => setArchiveDialogOpen(true)}
                >
                  Arquivar Projeto
                </Button>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Excluir Projeto
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Esta ação é irreversível. Todas as tarefas e dados serão perdidos.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<Delete />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Excluir Projeto
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Archive Dialog */}
      <Dialog open={archiveDialogOpen} onClose={() => setArchiveDialogOpen(false)}>
        <DialogTitle>Arquivar Projeto</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            O projeto "{project?.name}" será arquivado. Você poderá restaurá-lo posteriormente.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleArchive} color="warning" variant="contained">
            Arquivar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Excluir Projeto</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 1 }}>
            <strong>Atenção!</strong> Esta ação é irreversível. Todas as tarefas, sprints e dados
            do projeto "{project?.name}" serão permanentemente excluídos.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir Permanentemente
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
