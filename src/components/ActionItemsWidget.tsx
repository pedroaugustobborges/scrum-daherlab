import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Chip, Stack, IconButton, useTheme } from '@mui/material'
import { CheckCircle, Person, TrendingUp, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { IOSWidget } from './ui'

interface ActionItem {
  id: string
  content: string
  status: string
  sprint_name: string
  assigned_to_name?: string
  votes: number
}

interface ActionItemsWidgetProps {
  teamId?: string | null
  strategicFilter?: 'all' | 'yes' | 'no'
}

const ITEMS_PER_PAGE = 2

export default function ActionItemsWidget({ teamId, strategicFilter = 'all' }: ActionItemsWidgetProps = {}) {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(true)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(actionItems.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = actionItems.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
    fetchActionItems()
  }, [teamId, strategicFilter])

  const fetchActionItems = async () => {
    try {
      setLoading(true)

      // Scope to team and/or strategic filter
      let retroIds: string[] | null = null
      const needSprintScope = teamId || strategicFilter !== 'all'
      if (needSprintScope) {
        if (strategicFilter !== 'all') {
          const { data: strategicProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('strategic_planning', strategicFilter === 'yes')
          const projectIds = (strategicProjects ?? []).map((p: any) => p.id)

          if (strategicFilter === 'no') {
            // Two-query approach to avoid PostgREST OR+IS NULL unreliability
            const collectedSprintIds: string[] = []
            if (projectIds.length > 0) {
              let q1 = supabase.from('sprints').select('id').in('project_id', projectIds)
              if (teamId) q1 = q1.eq('team_id', teamId)
              const { data: d1 } = await q1
              ;(d1 ?? []).forEach((s: any) => collectedSprintIds.push(s.id))
            }
            let q2 = supabase.from('sprints').select('id').is('project_id', null)
            if (teamId) q2 = q2.eq('team_id', teamId)
            const { data: d2 } = await q2
            ;(d2 ?? []).forEach((s: any) => collectedSprintIds.push(s.id))

            if (collectedSprintIds.length > 0) {
              const { data: retros } = await supabase.from('sprint_retrospectives').select('id').in('sprint_id', collectedSprintIds)
              retroIds = (retros ?? []).map((r: any) => r.id)
            } else {
              retroIds = []
            }
          } else {
            // "Sim": single query
            let sprintsQ = supabase.from('sprints').select('id')
            if (teamId) sprintsQ = sprintsQ.eq('team_id', teamId)
            sprintsQ = projectIds.length > 0
              ? sprintsQ.in('project_id', projectIds)
              : sprintsQ.in('project_id', ['00000000-0000-0000-0000-000000000000'])
            const { data: teamSprints } = await sprintsQ
            const sprintIds = (teamSprints ?? []).map((s: any) => s.id)
            if (sprintIds.length > 0) {
              const { data: retros } = await supabase.from('sprint_retrospectives').select('id').in('sprint_id', sprintIds)
              retroIds = (retros ?? []).map((r: any) => r.id)
            } else {
              retroIds = []
            }
          }
        } else if (teamId) {
          // Team filter only, no strategic filter
          const { data: teamSprints } = await supabase.from('sprints').select('id').eq('team_id', teamId)
          const sprintIds = (teamSprints ?? []).map((s: any) => s.id)
          if (sprintIds.length > 0) {
            const { data: retros } = await supabase.from('sprint_retrospectives').select('id').in('sprint_id', sprintIds)
            retroIds = (retros ?? []).map((r: any) => r.id)
          } else {
            retroIds = []
          }
        }
      }

      if (retroIds !== null && retroIds.length === 0) {
        setActionItems([])
        setTotalCount(0)
        setCompletionRate(0)
        setLoading(false)
        return
      }

      // Fetch action items from retrospectives
      let itemsQuery = supabase
        .from('retrospective_items')
        .select(
          `
          id,
          content,
          status,
          votes,
          sprint_retrospectives!retrospective_id(
            sprint_id,
            sprints(name)
          ),
          assigned_to_profile:profiles!assigned_to(full_name)
        `
        )
        .eq('category', 'action_item')
        .order('votes', { ascending: false })
        .order('created_at', { ascending: false })

      if (retroIds !== null) {
        itemsQuery = itemsQuery.in('retrospective_id', retroIds)
      }

      const { data: items, error: itemsError } = await itemsQuery

      if (itemsError) throw itemsError

      // Transform data
      const transformedItems = (items || []).map((item: any) => {
        const retroData = item.sprint_retrospectives
        const sprintRetro = Array.isArray(retroData) ? retroData[0] : retroData
        const sprintsData = sprintRetro?.sprints
        const sprint = Array.isArray(sprintsData) ? sprintsData[0] : sprintsData
        const profileData = item.assigned_to_profile
        const profile = Array.isArray(profileData) ? profileData[0] : profileData

        return {
          id: item.id,
          content: item.content,
          status: item.status,
          sprint_name: sprint?.name || 'Sprint desconhecido',
          assigned_to_name: profile?.full_name,
          votes: item.votes || 0,
        }
      })

      // Filter pending items
      const pendingItems = transformedItems.filter((item) => item.status === 'pending' || item.status === 'in_progress')

      setActionItems(pendingItems)
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
      <IOSWidget accentColor="#059669">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress size={40} sx={{ color: '#059669' }} />
        </Box>
      </IOSWidget>
    )
  }

  return (
    <IOSWidget accentColor="#059669">
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          <Stack spacing={1.5} sx={{ flex: 1, overflowY: 'auto' }}>
            {paginatedItems.map((item) => {
              const statusStyle = getStatusColor(item.status)
              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isDarkMode ? '#1e293b' : 'white',
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

          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 2,
                pt: 1.5,
                borderTop: '1px solid rgba(5, 150, 105, 0.1)',
              }}
            >
              <IconButton
                size="small"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                sx={{
                  color: '#059669',
                  '&:disabled': { color: 'rgba(5, 150, 105, 0.3)' },
                  '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.1)' },
                }}
              >
                <KeyboardArrowUp fontSize="small" />
              </IconButton>
              <Typography variant="caption" fontWeight={600} sx={{ color: '#059669' }}>
                {currentPage} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                sx={{
                  color: '#059669',
                  '&:disabled': { color: 'rgba(5, 150, 105, 0.3)' },
                  '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.1)' },
                }}
              >
                <KeyboardArrowDown fontSize="small" />
              </IconButton>
            </Box>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nenhuma ação pendente
        </Typography>
      )}
      </Box>
    </IOSWidget>
  )
}
