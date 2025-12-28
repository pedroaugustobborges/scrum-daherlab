import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Stack,
  Menu,
  ListItemIcon,
  ListItemText,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Divider,
} from '@mui/material'
import {
  Add,
  Search,
  FilterList,
  Assignment,
  Flag,
  Person,
  Functions,
  Edit,
  Delete,
  MoreVert,
  PlaylistAdd,
  TrendingUp,
  Inventory,
  DragIndicator,
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
import Navbar from '@/components/Navbar'
import CreateBacklogItemModal from '@/components/CreateBacklogItemModal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface BacklogItem {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  project_id: string
  assigned_to: string
  created_at: string
  order_index: number
  projects?: { name: string }
  assigned_to_profile?: { full_name: string }
}

interface Sprint {
  id: string
  name: string
  status: string
}

const statusConfig: Record<string, { label: string; color: any }> = {
  todo: { label: 'A Fazer', color: 'default' },
  'in-progress': { label: 'Em Progresso', color: 'warning' },
  review: { label: 'Em Revisão', color: 'info' },
  done: { label: 'Concluído', color: 'success' },
  blocked: { label: 'Bloqueado', color: 'error' },
}

const priorityConfig: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'Baixa', color: '#6b7280', icon: '▼' },
  medium: { label: 'Média', color: '#f59e0b', icon: '■' },
  high: { label: 'Alta', color: '#ef4444', icon: '▲' },
  urgent: { label: 'Urgente', color: '#dc2626', icon: '▲▲' },
}

// Draggable Backlog Item Component
interface DraggableBacklogItemProps {
  item: BacklogItem
  onMenuClick: (event: React.MouseEvent<HTMLElement>, item: BacklogItem) => void
}

function DraggableBacklogItem({ item, onMenuClick }: DraggableBacklogItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      elevation={0}
      sx={{
        border: '2px solid rgba(99, 102, 241, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isDragging ? 'grabbing' : 'default',
        '&:hover': {
          transform: isDragging ? 'none' : 'translateX(8px)',
          boxShadow: '0 8px 16px rgba(99, 102, 241, 0.1)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'start' }}>
          {/* Drag Handle */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
              color: 'text.secondary',
              '&:hover': {
                color: '#6366f1',
              },
            }}
          >
            <DragIndicator />
          </Box>

          {/* Priority Indicator */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: `${priorityConfig[item.priority]?.color}20`,
              border: `2px solid ${priorityConfig[item.priority]?.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" fontWeight={800} sx={{ color: priorityConfig[item.priority]?.color }}>
              {priorityConfig[item.priority]?.icon}
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {item.title}
            </Typography>
            {item.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={statusConfig[item.status]?.label || item.status}
                color={statusConfig[item.status]?.color || 'default'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={priorityConfig[item.priority]?.label || item.priority}
                size="small"
                icon={<Flag sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: `${priorityConfig[item.priority]?.color}20`,
                  color: priorityConfig[item.priority]?.color,
                  fontWeight: 600,
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
                  }}
                />
              )}
              {item.projects?.name && (
                <Chip
                  label={item.projects.name}
                  size="small"
                  icon={<Assignment sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    fontWeight: 600,
                  }}
                />
              )}
              {item.assigned_to_profile?.full_name && (
                <Chip
                  label={item.assigned_to_profile.full_name}
                  size="small"
                  icon={<Person sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Tooltip title="Ações">
            <IconButton onClick={(e) => onMenuClick(e, item)}>
              <MoreVert />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function ProductBacklog() {
  const [loading, setLoading] = useState(true)
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [filteredItems, setFilteredItems] = useState<BacklogItem[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<BacklogItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [projects, setProjects] = useState<any[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null)
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [sprints, setSprints] = useState<Sprint[]>([])

  // Drag and drop sensors
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

  useEffect(() => {
    fetchBacklogItems()
    fetchProjects()
    fetchActiveSprints()
  }, [])

  useEffect(() => {
    filterItems()
  }, [searchQuery, statusFilter, priorityFilter, projectFilter, backlogItems])

  const fetchBacklogItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name), assigned_to_profile:profiles!assigned_to(full_name)')
        .is('sprint_id', null) // Only items not in a sprint
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setBacklogItems(data || [])
    } catch (error) {
      console.error('Error fetching backlog items:', error)
      toast.error('Erro ao carregar backlog')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('id, name').order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchActiveSprints = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, name, status')
        .in('status', ['planning', 'active'])
        .order('start_date', { ascending: false })

      if (error) throw error
      setSprints(data || [])
    } catch (error) {
      console.error('Error fetching sprints:', error)
    }
  }

  const filterItems = () => {
    let filtered = [...backlogItems]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((item) => item.priority === priorityFilter)
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter((item) => item.project_id === projectFilter)
    }

    setFilteredItems(filtered)
  }

  const handleDeleteItem = async (item: BacklogItem) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${item.title}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', item.id)

      if (error) throw error

      toast.success('Item excluído com sucesso!')
      await fetchBacklogItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Erro ao excluir item')
    }
  }

  const handleAddToSprint = async (sprintId: string) => {
    if (!selectedItem) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ sprint_id: sprintId })
        .eq('id', selectedItem.id)

      if (error) throw error

      toast.success('Item adicionado ao sprint com sucesso!')
      setSprintDialogOpen(false)
      setSelectedItem(null)
      await fetchBacklogItems()
    } catch (error) {
      console.error('Error adding to sprint:', error)
      toast.error('Erro ao adicionar item ao sprint')
    }
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: BacklogItem) => {
    setAnchorEl(event.currentTarget)
    setSelectedItem(item)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    if (selectedItem) {
      setEditItem(selectedItem)
      setCreateModalOpen(true)
    }
    handleMenuClose()
  }

  const handleOpenSprintDialog = () => {
    setSprintDialogOpen(true)
    handleMenuClose()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = filteredItems.findIndex((item) => item.id === active.id)
    const newIndex = filteredItems.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Optimistically update UI
    const newOrder = arrayMove(filteredItems, oldIndex, newIndex)
    setFilteredItems(newOrder)

    // Update database
    try {
      // Update all affected items with new order_index
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        order_index: index,
      }))

      // Batch update
      const updatePromises = updates.map((update) =>
        supabase.from('tasks').update({ order_index: update.order_index }).eq('id', update.id)
      )

      await Promise.all(updatePromises)

      // Refresh to get accurate data
      await fetchBacklogItems()
      toast.success('Prioridade atualizada!')
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Erro ao atualizar prioridade')
      // Revert on error
      await fetchBacklogItems()
    }
  }

  const getTotalPoints = () => {
    return filteredItems.reduce((sum, item) => sum + (item.story_points || 0), 0)
  }

  const getPriorityCount = (priority: string) => {
    return filteredItems.filter((item) => item.priority === priority).length
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Product Backlog
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Gerencie e priorize as histórias de usuário do produto
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditItem(null)
              setCreateModalOpen(true)
            }}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              display: { xs: 'none', sm: 'flex' },
            }}
          >
            Novo Item
          </Button>
        </Box>

        {/* Statistics */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 2,
            mb: 4,
          }}
        >
          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
              border: '2px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Inventory sx={{ color: '#6366f1', fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Total de Itens
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#6366f1' }}>
                {filteredItems.length}
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '2px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Functions sx={{ color: '#10b981', fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Story Points
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#10b981' }}>
                {getTotalPoints()}
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Flag sx={{ color: '#ef4444', fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Alta Prioridade
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#ef4444' }}>
                {getPriorityCount('high') + getPriorityCount('urgent')}
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 146, 60, 0.05) 100%)',
              border: '2px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Em Progresso
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#f59e0b' }}>
                {filteredItems.filter((item) => item.status === 'in-progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Filters */}
        <Card
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList sx={{ color: '#6366f1' }} />
            <Typography variant="h6" fontWeight={700}>
              Filtros
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              placeholder="Buscar por título ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="todo">A Fazer</MenuItem>
              <MenuItem value="in-progress">Em Progresso</MenuItem>
              <MenuItem value="review">Em Revisão</MenuItem>
              <MenuItem value="done">Concluído</MenuItem>
              <MenuItem value="blocked">Bloqueado</MenuItem>
            </TextField>
            <TextField
              select
              label="Prioridade"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="urgent">Urgente</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="low">Baixa</MenuItem>
            </TextField>
            <TextField
              select
              label="Projeto"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Todos</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Card>

        {/* Backlog Items */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
              px: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
              border: '2px dashed rgba(99, 102, 241, 0.2)',
            }}
          >
            <Inventory sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {backlogItems.length === 0 ? 'Backlog vazio' : 'Nenhum item encontrado'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              {backlogItems.length === 0
                ? 'Adicione histórias de usuário ao backlog para começar'
                : 'Tente ajustar os filtros de busca'}
            </Typography>
            {backlogItems.length === 0 && (
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => {
                  setEditItem(null)
                  setCreateModalOpen(true)
                }}
                sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
              >
                Adicionar Primeiro Item
              </Button>
            )}
          </Box>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <Stack spacing={2}>
                {filteredItems.map((item) => (
                  <DraggableBacklogItem key={item.id} item={item} onMenuClick={handleMenuClick} />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        )}

        {/* Mobile FAB */}
        <Fab
          color="primary"
          onClick={() => {
            setEditItem(null)
            setCreateModalOpen(true)
          }}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            display: { xs: 'flex', sm: 'none' },
            width: 64,
            height: 64,
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Add sx={{ fontSize: 32 }} />
        </Fab>
      </Container>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenSprintDialog}>
          <ListItemIcon>
            <PlaylistAdd fontSize="small" />
          </ListItemIcon>
          <ListItemText>Adicionar ao Sprint</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedItem) handleDeleteItem(selectedItem)
            handleMenuClose()
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add to Sprint Dialog */}
      <Dialog open={sprintDialogOpen} onClose={() => setSprintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar ao Sprint</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione o sprint onde deseja adicionar este item
          </Typography>
          {sprints.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Nenhum sprint disponível. Crie um sprint primeiro.
            </Typography>
          ) : (
            <List>
              {sprints.map((sprint, index) => (
                <Box key={sprint.id}>
                  <ListItem
                    button
                    onClick={() => handleAddToSprint(sprint.id)}
                    sx={{
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.05)',
                      },
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
          <Button onClick={() => setSprintDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Modal */}
      <CreateBacklogItemModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditItem(null)
        }}
        onSuccess={fetchBacklogItems}
        item={editItem || undefined}
      />
    </Box>
  )
}
