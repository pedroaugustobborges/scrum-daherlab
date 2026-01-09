import { useState, useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Chip, Stack } from '@mui/material'
import { CheckCircle, Person, TrendingUp } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface ActionItem {
  id: string
  content: string
  status: string
  sprint_name: string
  assigned_to_name?: string
  votes: number
}

export default function ActionItemsWidget() {
  const [loading, setLoading] = useState(true)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)

  useEffect(() => {
    fetchActionItems()
  }, [])

  const fetchActionItems = async () => {
    try {
      setLoading(true)

      // Fetch all action items from retrospectives
      const { data: items, error: itemsError } = await supabase
        .from('retrospective_items')
        .select(
          `
          id,
          content,
          status,
          votes,
          sprint_retrospectives!inner(sprint_id),
          sprints!sprint_retrospectives_sprint_id_fkey(name),
          assigned_to_profile:profiles!assigned_to(full_name)
        `
        )
        .eq('category', 'action_item')
        .order('votes', { ascending: false })
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      // Transform data
      const transformedItems = (items || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        status: item.status,
        sprint_name: item.sprints?.name || 'Sprint desconhecido',
        assigned_to_name: item.assigned_to_profile?.full_name,
        votes: item.votes || 0,
      }))

      // Filter pending items
      const pendingItems = transformedItems.filter((item) => item.status === 'pending' || item.status === 'in_progress')

      setActionItems(pendingItems.slice(0, 5))
      setTotalCount(pendingItems.length)

      // Calculate completion rate
      const completedCount = transformedItems.filter((item) => item.status === 'done').length
      const total = transformedItems.length
      const rate = total > 0 ? Math.round((completedCount / total) * 100) : 0
      setCompletionRate(rate)
    } catch (error) {
      console.error('Error fetching action items:', error)
      setActionItems([])
      setTotalCount(0)
      setCompletionRate(0)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Pendente' }
      case 'in_progress':
        return { bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', label: 'Em progresso' }
      case 'done':
        return { bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Concluído' }
      default:
        return { bgcolor: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: status }
    }
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '2px solid rgba(5, 150, 105, 0.2)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} sx={{ color: '#059669' }} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
        border: '2px solid rgba(5, 150, 105, 0.2)',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(5, 150, 105, 0.15)',
          border: '2px solid rgba(5, 150, 105, 0.4)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(5, 150, 105, 0.3)',
          }}
        >
          <CheckCircle sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#059669', mb: 0.5 }}>
            {totalCount}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Ações Pendentes
          </Typography>
        </Box>
      </Box>

      {completionRate > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(5, 150, 105, 0.08)',
          }}
        >
          <TrendingUp sx={{ fontSize: 18, color: '#059669' }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: '#059669' }}>
            {completionRate}% de taxa de conclusão
          </Typography>
        </Box>
      )}

      {actionItems.length > 0 ? (
        <>
          <Stack spacing={1.5}>
            {actionItems.map((item) => {
              const statusStyle = getStatusColor(item.status)
              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'white',
                    border: '1px solid rgba(5, 150, 105, 0.15)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        flex: 1,
                        pr: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.content}
                    </Typography>
                    <Chip
                      label={statusStyle.label}
                      size="small"
                      sx={{
                        bgcolor: statusStyle.bgcolor,
                        color: statusStyle.color,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {item.sprint_name}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.votes > 0 && (
                        <Chip
                          label={`${item.votes} votos`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(5, 150, 105, 0.1)',
                            color: '#059669',
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            height: 18,
                          }}
                        />
                      )}
                      {item.assigned_to_name && (
                        <Chip
                          icon={<Person sx={{ fontSize: 12 }} />}
                          label={item.assigned_to_name.split(' ')[0]}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366f1',
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            height: 18,
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Stack>

          {totalCount > 5 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5, textAlign: 'center', fontWeight: 600 }}
            >
              +{totalCount - 5} {totalCount - 5 === 1 ? 'outra ação' : 'outras ações'}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nenhuma ação pendente
        </Typography>
      )}
    </Paper>
  )
}
