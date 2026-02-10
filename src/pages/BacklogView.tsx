import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  Add,
  Inventory,
  Flag,
  Functions,
  Person,
  Delete,
  MoveUp,
  DragIndicator,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { useProjectContext } from './ProjectDetail'
import CreateBacklogItemModal from '@/components/CreateBacklogItemModal'
import { supabase } from '@/lib/supabase'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface BacklogItem {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string
  assigned_to_profile?: { full_name: string }
  position?: number
}

interface Sprint {
  id: string
  name: string
  status: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'A Fazer', color: '#6b7280' },
  'in-progress': { label: 'Em Progresso', color: '#f59e0b' },
  review: { label: 'Em Revisão', color: '#8b5cf6' },
  done: { label: 'Concluído', color: '#10b981' },
  blocked: { label: 'Bloqueado', color: '#ef4444' },
}

const priorityConfig: Record<string, { label: string; color: string; order: number }> = {
  urgent: { label: 'Urgente', color: '#dc2626', order: 1 },
  high: { label: 'Alta', color: '#ef4444', order: 2 },
  medium: { label: 'Média', color: '#f59e0b', order: 3 },
  low: { label: 'Baixa', color: '#6b7280', order: 4 },
}

// Sortable Card Component
function SortableBacklogCard({
  item,
  onEdit,
  onDelete,
  onMoveToSprint,
}: {
  item: BacklogItem
  onEdit: (item: BacklogItem) => void
  onDelete: (id: string, title: string) => void
  onMoveToSprint: (itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const statusInfo = statusConfig[item.status] || statusConfig.todo
  const priorityInfo = priorityConfig[item.priority] || priorityConfig.medium

  return (
    <Card
      ref={setNodeRef}
      style={style}
      elevation={0}
      onClick={() => onEdit(item)}
      sx={{
        border: '2px solid rgba(99, 102, 241, 0.1)',
        borderRadius: 3,
        transition: 'all 0.2s',
        cursor: 'pointer',
        '&:hover': {
          border: '2px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Drag Handle */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: '#9ca3af',
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
              mt: 0.5,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DragIndicator sx={{ fontSize: 20 }} />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {item.title}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={statusInfo.label}
                size="small"
                sx={{
                  bgcolor: `${statusInfo.color}20`,
                  color: statusInfo.color,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />

              <Chip
                label={priorityInfo.label}
                size="small"
                icon={<Flag sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: `${priorityInfo.color}20`,
                  color: priorityInfo.color,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />

              {item.story_points > 0 && (
                <Chip
                  label={`${item.story_points} pts`}
                  size="small"
                  icon={<Functions sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              )}

              {item.assigned_to_profile?.full_name && (
                <Chip
                  label={item.assigned_to_profile.full_name}
                  size="small"
                  icon={<Person sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Mover para Sprint">
              <IconButton
                size="small"
                onClick={() => onMoveToSprint(item.id)}
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                }}
              >
                <MoveUp sx={{ fontSize: 18, color: '#6366f1' }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Excluir">
              <IconButton
                size="small"
                onClick={() => onDelete(item.id, item.title)}
                sx={{
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' },
                }}
              >
                <Delete sx={{ fontSize: 18, color: '#ef4444' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function BacklogView() {
  const { project } = useProjectContext()
  const [loading, setLoading] = useState(true)
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<BacklogItem | null>(null)
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'position' | 'priority' | 'points'>('position')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    if (project?.id) {
      fetchBacklogItems()
      fetchSprints()
    }
  }, [project?.id])

  const fetchBacklogItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, story_points, assigned_to, assigned_to_profile:profiles!assigned_to(full_name)')
        .eq('project_id', project.id)
        .is('sprint_id', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transform data
      const transformed = (data || []).map((item: any, index: number) => ({
        ...item,
        assigned_to_profile: Array.isArray(item.assigned_to_profile)
          ? item.assigned_to_profile[0]
          : item.assigned_to_profile,
        position: index,
      }))

      setBacklogItems(transformed)
    } catch (error) {
      console.error('Error fetching backlog items:', error)
      toast.error('Erro ao carregar backlog')
    } finally {
      setLoading(false)
    }
  }

  const fetchSprints = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, name, status')
        .eq('project_id', project.id)
        .in('status', ['planning', 'active'])
        .order('start_date', { ascending: false })

      if (error) throw error
      setSprints(data || [])
    } catch (error) {
      console.error('Error fetching sprints:', error)
    }
  }

  const handleDeleteItem = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${title}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error

      toast.success('Item excluído com sucesso!')
      await fetchBacklogItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Erro ao excluir item')
    }
  }

  const handleEditItem = (item: BacklogItem) => {
    setEditItem(item)
    setCreateModalOpen(true)
  }

  const handleOpenMoveDialog = (itemId: string) => {
    setSelectedItemId(itemId)
    setSprintDialogOpen(true)
  }

  const handleMoveToSprint = async (sprintId: string) => {
    if (!selectedItemId) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ sprint_id: sprintId })
        .eq('id', selectedItemId)

      if (error) throw error

      toast.success('Item movido para o sprint!')
      setSprintDialogOpen(false)
      setSelectedItemId(null)
      await fetchBacklogItems()
    } catch (error) {
      console.error('Error moving item:', error)
      toast.error('Erro ao mover item')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    setBacklogItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const getSortedItems = () => {
    if (sortBy === 'priority') {
      return [...backlogItems].sort((a, b) => {
        const priorityA = priorityConfig[a.priority]?.order || 999
        const priorityB = priorityConfig[b.priority]?.order || 999
        return priorityA - priorityB
      })
    }
    if (sortBy === 'points') {
      return [...backlogItems].sort((a, b) => (b.story_points || 0) - (a.story_points || 0))
    }
    return backlogItems
  }

  const getTotalPoints = () => {
    return backlogItems.reduce((sum, item) => sum + (item.story_points || 0), 0)
  }

  const activeItem = activeId ? backlogItems.find((item) => item.id === activeId) : null
  const sortedItems = getSortedItems()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%)',
          border: '2px solid rgba(245, 158, 11, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Product Backlog
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {backlogItems.length} ite{backlogItems.length !== 1 ? 'ns' : 'm'} no backlog
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={sortBy}
                label="Ordenar por"
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <MenuItem value="position">Posição</MenuItem>
                <MenuItem value="priority">Prioridade</MenuItem>
                <MenuItem value="points">Story Points</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditItem(null)
                setCreateModalOpen(true)
              }}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
                  boxShadow: '0 6px 16px rgba(245, 158, 11, 0.4)',
                },
              }}
            >
              Novo Item
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Total de Itens
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#f59e0b' }}>
              {backlogItems.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Story Points
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
              {getTotalPoints()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Alta Prioridade
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#ef4444' }}>
              {backlogItems.filter((i) => i.priority === 'high' || i.priority === 'urgent').length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Sprints Disponíveis
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981' }}>
              {sprints.length}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Backlog Items */}
      {backlogItems.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            borderRadius: 3,
            bgcolor: 'rgba(245, 158, 11, 0.05)',
            border: '2px dashed rgba(245, 158, 11, 0.2)',
          }}
        >
          <Inventory sx={{ fontSize: 80, color: '#f59e0b', opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Backlog vazio
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adicione itens ao backlog deste projeto
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => {
              setEditItem(null)
              setCreateModalOpen(true)
            }}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              borderWidth: 2,
              borderColor: '#f59e0b',
              color: '#f59e0b',
              fontWeight: 600,
              '&:hover': {
                borderWidth: 2,
                borderColor: '#f59e0b',
                bgcolor: 'rgba(245, 158, 11, 0.05)',
              },
            }}
          >
            Criar Primeiro Item
          </Button>
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <Stack spacing={2}>
              {sortedItems.map((item) => (
                <SortableBacklogCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onMoveToSprint={handleOpenMoveDialog}
                />
              ))}
            </Stack>
          </SortableContext>

          <DragOverlay>
            {activeItem ? (
              <Card
                elevation={3}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: 'white',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  transform: 'rotate(-2deg)',
                }}
              >
                <Typography variant="body1" fontWeight={600}>
                  {activeItem.title}
                </Typography>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create/Edit Modal */}
      <CreateBacklogItemModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditItem(null)
        }}
        onSuccess={() => {
          setCreateModalOpen(false)
          setEditItem(null)
          fetchBacklogItems()
        }}
        item={
          editItem
            ? {
                id: editItem.id,
                title: editItem.title,
                description: editItem.description,
                status: editItem.status,
                priority: editItem.priority,
                story_points: editItem.story_points,
                project_id: project.id,
                assigned_to: editItem.assigned_to,
              }
            : {
                id: '',
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                story_points: 0,
                project_id: project.id,
                assigned_to: '',
              }
        }
      />

      {/* Sprint Selection Dialog */}
      <Dialog
        open={sprintDialogOpen}
        onClose={() => {
          setSprintDialogOpen(false)
          setSelectedItemId(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mover para Sprint</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione o sprint para onde deseja mover este item
          </Typography>
          {sprints.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum sprint disponível. Crie um novo sprint primeiro.
              </Typography>
            </Box>
          ) : (
            <List>
              {sprints.map((sprint, index) => (
                <Box key={sprint.id}>
                  <ListItem
                    component="div"
                    onClick={() => handleMoveToSprint(sprint.id)}
                    sx={{
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' },
                    }}
                  >
                    <ListItemText
                      primary={sprint.name}
                      secondary={sprint.status === 'active' ? 'Ativo' : 'Planejamento'}
                    />
                    <Chip
                      label={sprint.status === 'active' ? 'Ativo' : 'Planejamento'}
                      size="small"
                      color={sprint.status === 'active' ? 'success' : 'warning'}
                    />
                  </ListItem>
                  {index < sprints.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSprintDialogOpen(false)
              setSelectedItemId(null)
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
