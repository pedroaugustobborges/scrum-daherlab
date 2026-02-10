import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import { Close, Delete, ArrowForward, ArrowBack } from '@mui/icons-material'
import type { HierarchicalTask, DependencyType, TaskDependency } from '@/types/hybrid'
import { DEPENDENCY_TYPE_INFO } from '@/types/hybrid'
import { useCreateDependency, useDeleteDependency, useTaskDependencies } from '@/hooks/useDependencies'

interface DependencyModalProps {
  open: boolean
  onClose: () => void
  task: HierarchicalTask
  allTasks: HierarchicalTask[]
}

export default function DependencyModal({
  open,
  onClose,
  task,
  allTasks,
}: DependencyModalProps) {
  const [selectedTask, setSelectedTask] = useState<HierarchicalTask | null>(null)
  const [dependencyType, setDependencyType] = useState<DependencyType>('FS')
  const [lagDays, setLagDays] = useState(0)
  const [direction, setDirection] = useState<'predecessor' | 'successor'>('predecessor')

  const { data: taskDeps, isLoading: loadingDeps } = useTaskDependencies(task.id)
  const createDependency = useCreateDependency()
  const deleteDependency = useDeleteDependency()

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTask(null)
      setDependencyType('FS')
      setLagDays(0)
      setDirection('predecessor')
    }
  }, [open])

  // Filter out the current task and already linked tasks
  const availableTasks = allTasks.filter((t) => {
    if (t.id === task.id) return false
    if (t.is_summary) return false

    // Check if already a predecessor or successor
    const isPred = taskDeps?.predecessors.some(
      (d: { predecessor_id: string }) => d.predecessor_id === t.id
    )
    const isSucc = taskDeps?.successors.some(
      (d: { successor_id: string }) => d.successor_id === t.id
    )

    return !isPred && !isSucc
  })

  const handleAddDependency = async () => {
    if (!selectedTask) return

    const params = direction === 'predecessor'
      ? {
          predecessor_id: selectedTask.id,
          successor_id: task.id,
          dependency_type: dependencyType,
          lag_days: lagDays,
        }
      : {
          predecessor_id: task.id,
          successor_id: selectedTask.id,
          dependency_type: dependencyType,
          lag_days: lagDays,
        }

    await createDependency.mutateAsync(params)
    setSelectedTask(null)
    setLagDays(0)
  }

  const handleDeleteDependency = async (id: string) => {
    await deleteDependency.mutateAsync(id)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Dependências</Typography>
          <Typography variant="body2" color="text.secondary">
            {task.wbs_code} - {task.title}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Add New Dependency */}
        <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Adicionar Dependência
          </Typography>

          {/* Direction Selection */}
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={direction}
              exclusive
              onChange={(_, value) => value && setDirection(value)}
              size="small"
              fullWidth
            >
              <ToggleButton value="predecessor">
                <ArrowBack sx={{ mr: 1 }} /> Predecessora
              </ToggleButton>
              <ToggleButton value="successor">
                Sucessora <ArrowForward sx={{ ml: 1 }} />
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {direction === 'predecessor'
                ? 'Selecione uma tarefa que deve ser concluída ANTES desta'
                : 'Selecione uma tarefa que deve ser iniciada DEPOIS desta'}
            </Typography>
          </Box>

          {/* Task Selection */}
          <Autocomplete
            options={availableTasks}
            getOptionLabel={(option) =>
              `${option.wbs_code || '#'} - ${option.title}`
            }
            value={selectedTask}
            onChange={(_, value) => setSelectedTask(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={direction === 'predecessor' ? 'Tarefa Predecessora' : 'Tarefa Sucessora'}
                placeholder="Buscar tarefa..."
                size="small"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body2">
                    {option.wbs_code && (
                      <Chip
                        label={option.wbs_code}
                        size="small"
                        sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {option.title}
                  </Typography>
                  {option.start_date && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(option.start_date).toLocaleDateString('pt-BR')}
                      {option.end_date && ` - ${new Date(option.end_date).toLocaleDateString('pt-BR')}`}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            sx={{ mb: 2 }}
          />

          {/* Dependency Type */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={600} gutterBottom sx={{ display: 'block', mb: 1 }}>
              Tipo de Dependência
            </Typography>
            <ToggleButtonGroup
              value={dependencyType}
              exclusive
              onChange={(_, value) => value && setDependencyType(value)}
              size="small"
              fullWidth
            >
              {(['FS', 'SS', 'FF', 'SF'] as DependencyType[]).map((type) => (
                <ToggleButton key={type} value={type}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {type}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                      {DEPENDENCY_TYPE_INFO[type].label.split(' ')[0]}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {DEPENDENCY_TYPE_INFO[dependencyType].description}
            </Typography>
          </Box>

          {/* Lag Days */}
          <TextField
            label="Lag (dias)"
            type="number"
            value={lagDays}
            onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
            size="small"
            fullWidth
            helperText="Positivo = atraso, Negativo = antecipação (lead)"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={handleAddDependency}
            disabled={!selectedTask || createDependency.isPending}
            fullWidth
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            }}
          >
            {createDependency.isPending ? 'Adicionando...' : 'Adicionar Dependência'}
          </Button>
        </Box>

        {/* Existing Dependencies */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Predecessoras ({taskDeps?.predecessors?.length || 0})
          </Typography>
          {loadingDeps ? (
            <Typography variant="body2" color="text.secondary">
              Carregando...
            </Typography>
          ) : taskDeps?.predecessors?.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Nenhuma predecessora
            </Typography>
          ) : (
            <List dense sx={{ mb: 2 }}>
              {taskDeps?.predecessors?.map((dep: TaskDependency & { predecessor: { title: string; wbs_code: string } }) => (
                <ListItem
                  key={dep.id}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    mb: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {dep.predecessor?.wbs_code && (
                          <Chip label={dep.predecessor.wbs_code} size="small" />
                        )}
                        {dep.predecessor?.title}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={dep.dependency_type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {dep.lag_days !== 0 && (
                          <Typography variant="caption">
                            Lag: {dep.lag_days} dias
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteDependency(dep.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Sucessoras ({taskDeps?.successors?.length || 0})
          </Typography>
          {loadingDeps ? (
            <Typography variant="body2" color="text.secondary">
              Carregando...
            </Typography>
          ) : taskDeps?.successors?.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhuma sucessora
            </Typography>
          ) : (
            <List dense>
              {taskDeps?.successors?.map((dep: TaskDependency & { successor: { title: string; wbs_code: string } }) => (
                <ListItem
                  key={dep.id}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    mb: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {dep.successor?.wbs_code && (
                          <Chip label={dep.successor.wbs_code} size="small" />
                        )}
                        {dep.successor?.title}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={dep.dependency_type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {dep.lag_days !== 0 && (
                          <Typography variant="caption">
                            Lag: {dep.lag_days} dias
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteDependency(dep.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
