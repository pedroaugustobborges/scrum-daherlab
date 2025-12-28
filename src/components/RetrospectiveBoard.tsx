import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  Rating,
  CircularProgress,
  Tooltip,
  Stack,
} from '@mui/material'
import {
  Add,
  ThumbUp,
  TrendingUp,
  CheckCircle,
  Delete,
  EmojiEvents,
  Person,
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface RetrospectiveBoardProps {
  sprintId: string
  sprintName: string
}

interface RetroItem {
  id: string
  category: 'went_well' | 'to_improve' | 'action_item'
  content: string
  votes: number
  status: string
  assigned_to?: string
  profiles?: { full_name: string }
  created_by: string
}

interface Retrospective {
  id: string
  mood_rating: number
  summary: string
}

const columns = [
  {
    id: 'went_well',
    title: 'O que foi bem? 😊',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: ThumbUp,
  },
  {
    id: 'to_improve',
    title: 'O que melhorar? 🤔',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: TrendingUp,
  },
  {
    id: 'action_item',
    title: 'Ações para o próximo sprint 🎯',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    icon: CheckCircle,
  },
]

const moodIcons = [
  { value: 1, icon: SentimentVeryDissatisfied, label: 'Muito ruim', color: '#ef4444' },
  { value: 2, icon: SentimentDissatisfied, label: 'Ruim', color: '#f59e0b' },
  { value: 3, icon: SentimentNeutral, label: 'Neutro', color: '#6b7280' },
  { value: 4, icon: SentimentSatisfied, label: 'Bom', color: '#10b981' },
  { value: 5, icon: SentimentVerySatisfied, label: 'Excelente', color: '#6366f1' },
]

export default function RetrospectiveBoard({ sprintId, sprintName }: RetrospectiveBoardProps) {
  const [loading, setLoading] = useState(true)
  const [retrospective, setRetrospective] = useState<Retrospective | null>(null)
  const [items, setItems] = useState<RetroItem[]>([])
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<string>('')

  useEffect(() => {
    fetchRetrospective()
    getCurrentUser()
  }, [sprintId])

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) setCurrentUser(data.user.id)
  }

  const fetchRetrospective = async () => {
    setLoading(true)
    try {
      // Fetch or create retrospective
      let { data: retro, error: retroError } = await supabase
        .from('sprint_retrospectives')
        .select('*')
        .eq('sprint_id', sprintId)
        .single()

      if (retroError && retroError.code !== 'PGRST116') throw retroError

      if (!retro) {
        // Create new retrospective
        const { data: user } = await supabase.auth.getUser()
        const { data: newRetro, error: createError } = await supabase
          .from('sprint_retrospectives')
          .insert([
            {
              sprint_id: sprintId,
              meeting_date: new Date().toISOString().split('T')[0],
              mood_rating: 3,
              created_by: user.user?.id,
            },
          ])
          .select()
          .single()

        if (createError) throw createError
        retro = newRetro
      }

      setRetrospective(retro)

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('retrospective_items')
        .select('*, assigned_to_profile:profiles!assigned_to(full_name), created_by_profile:profiles!created_by(full_name)')
        .eq('retrospective_id', retro.id)
        .order('votes', { ascending: false })
        .order('created_at')

      if (itemsError) throw itemsError
      setItems(itemsData || [])
    } catch (error) {
      console.error('Error fetching retrospective:', error)
      toast.error('Erro ao carregar retrospectiva')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (category: string) => {
    const content = newItemContent[category]?.trim()
    if (!content) {
      toast.error('Digite o conteúdo do item')
      return
    }

    try {
      const { data: user } = await supabase.auth.getUser()
      const { error } = await supabase.from('retrospective_items').insert([
        {
          retrospective_id: retrospective!.id,
          category,
          content,
          created_by: user.user?.id,
        },
      ])

      if (error) throw error

      setNewItemContent({ ...newItemContent, [category]: '' })
      toast.success('Item adicionado!')
      await fetchRetrospective()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Erro ao adicionar item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('retrospective_items').delete().eq('id', itemId)

      if (error) throw error

      toast.success('Item removido!')
      await fetchRetrospective()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Erro ao remover item')
    }
  }

  const handleVote = async (itemId: string, currentVotes: number) => {
    try {
      const { error } = await supabase
        .from('retrospective_items')
        .update({ votes: currentVotes + 1 })
        .eq('id', itemId)

      if (error) throw error

      await fetchRetrospective()
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Erro ao votar')
    }
  }

  const handleMoodChange = async (newMood: number) => {
    if (!retrospective) return

    try {
      const { error } = await supabase
        .from('sprint_retrospectives')
        .update({ mood_rating: newMood })
        .eq('id', retrospective.id)

      if (error) throw error

      setRetrospective({ ...retrospective, mood_rating: newMood })
      toast.success('Humor do time atualizado!')
    } catch (error) {
      console.error('Error updating mood:', error)
      toast.error('Erro ao atualizar humor')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const currentMood = moodIcons.find((m) => m.value === retrospective?.mood_rating) || moodIcons[2]
  const MoodIcon = currentMood.icon

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '2px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EmojiEvents sx={{ fontSize: 40, color: '#6366f1' }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Retrospectiva - {sprintName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reflexão e aprendizado contínuo
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              Humor do Time
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {moodIcons.map((mood) => {
                const Icon = mood.icon
                return (
                  <Tooltip key={mood.value} title={mood.label}>
                    <IconButton
                      onClick={() => handleMoodChange(mood.value)}
                      sx={{
                        bgcolor: retrospective?.mood_rating === mood.value ? `${mood.color}20` : 'transparent',
                        border: `2px solid ${retrospective?.mood_rating === mood.value ? mood.color : 'transparent'}`,
                        '&:hover': {
                          bgcolor: `${mood.color}10`,
                        },
                      }}
                    >
                      <Icon sx={{ color: mood.color }} />
                    </IconButton>
                  </Tooltip>
                )
              })}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: `${currentMood.color}15`,
            border: `2px solid ${currentMood.color}30`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <MoodIcon sx={{ fontSize: 32, color: currentMood.color }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: currentMood.color }}>
            O time está se sentindo: <strong>{currentMood.label}</strong>
          </Typography>
        </Box>
      </Paper>

      {/* Retrospective Board */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        {columns.map((column) => {
          const Icon = column.icon
          const columnItems = items.filter((item) => item.category === column.id)

          return (
            <Paper
              key={column.id}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: column.bgColor,
                border: `2px solid ${column.color}30`,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 400,
              }}
            >
              {/* Column Header */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Icon sx={{ color: column.color, fontSize: 24 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: column.color }}>
                    {column.title}
                  </Typography>
                </Box>
                <Chip
                  label={`${columnItems.length} ${columnItems.length === 1 ? 'item' : 'itens'}`}
                  size="small"
                  sx={{
                    bgcolor: 'white',
                    color: column.color,
                    fontWeight: 600,
                  }}
                />
              </Box>

              {/* Add Item */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Adicionar item..."
                  value={newItemContent[column.id] || ''}
                  onChange={(e) => setNewItemContent({ ...newItemContent, [column.id]: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddItem(column.id)
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <IconButton size="small" onClick={() => handleAddItem(column.id)}>
                        <Add />
                      </IconButton>
                    ),
                  }}
                  sx={{
                    bgcolor: 'white',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>

              {/* Items */}
              <Stack spacing={1.5} sx={{ flex: 1 }}>
                {columnItems.map((item) => (
                  <Paper
                    key={item.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'white',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: 2,
                      '&:hover': {
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="body2" sx={{ flex: 1, pr: 1 }}>
                        {item.content}
                      </Typography>
                      {item.created_by === currentUser && (
                        <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                          <Delete sx={{ fontSize: 16, color: '#ef4444' }} />
                        </IconButton>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tooltip title="Votar neste item">
                        <Button
                          size="small"
                          startIcon={<ThumbUp sx={{ fontSize: 14 }} />}
                          onClick={() => handleVote(item.id, item.votes)}
                          sx={{
                            minWidth: 'auto',
                            px: 1,
                            fontSize: '0.75rem',
                            color: column.color,
                          }}
                        >
                          {item.votes}
                        </Button>
                      </Tooltip>

                      {(item.assigned_to_profile?.full_name || item.created_by_profile?.full_name) && (
                        <Chip
                          label={item.assigned_to_profile?.full_name || item.created_by_profile?.full_name}
                          size="small"
                          icon={<Person sx={{ fontSize: 12 }} />}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: `${column.color}15`,
                            color: column.color,
                          }}
                        />
                      )}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}
