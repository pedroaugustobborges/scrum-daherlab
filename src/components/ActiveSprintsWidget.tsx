import { useState, useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Chip, LinearProgress, IconButton } from '@mui/material'
import { SpaceDashboard, CalendarToday, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import SprintDetailsModal from './SprintDetailsModal'

interface ActiveSprint {
  id: string
  name: string
  start_date: string
  end_date: string
  project_id: string
  team_id: string
  completed_stories: number
  total_stories: number
}

const ITEMS_PER_PAGE = 2

export default function ActiveSprintsWidget() {
  const [loading, setLoading] = useState(true)
  const [activeSprints, setActiveSprints] = useState<ActiveSprint[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSprint, setSelectedSprint] = useState<ActiveSprint | null>(null)

  const totalPages = Math.ceil(activeSprints.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedSprints = activeSprints.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    fetchActiveSprints()
  }, [])

  const fetchActiveSprints = async () => {
    try {
      setLoading(true)

      // Fetch active sprints
      const { data: sprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, name, start_date, end_date, project_id, team_id')
        .eq('status', 'active')
        .order('end_date', { ascending: true })

      if (sprintsError) throw sprintsError

      if (!sprints || sprints.length === 0) {
        setTotalCount(0)
        setActiveSprints([])
        setDaysRemaining(0)
        return
      }

      setTotalCount(sprints.length)

      // Calculate days remaining for the nearest ending sprint
      const nearestSprint = sprints[0]
      const endDate = new Date(nearestSprint.end_date).getTime()
      const now = Date.now()
      const diff = endDate - now
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      setDaysRemaining(days > 0 ? days : 0)

      // Fetch story counts for each sprint
      const sprintData = await Promise.all(
        sprints.map(async (sprint) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('status')
            .eq('sprint_id', sprint.id)

          if (tasksError) throw tasksError

          const completed = tasks?.filter((task) => task.status === 'done').length || 0
          const total = tasks?.length || 0

          return {
            id: sprint.id,
            name: sprint.name,
            start_date: sprint.start_date,
            end_date: sprint.end_date,
            project_id: sprint.project_id,
            team_id: sprint.team_id,
            completed_stories: completed,
            total_stories: total,
          }
        })
      )

      setActiveSprints(sprintData)
    } catch (error) {
      console.error('Error fetching active sprints:', error)
      setTotalCount(0)
      setActiveSprints([])
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (sprint: ActiveSprint) => {
    if (sprint.total_stories === 0) return 0
    return Math.round((sprint.completed_stories / sprint.total_stories) * 100)
  }

  const handleOpenDetails = (sprint: ActiveSprint) => {
    setSelectedSprint(sprint)
    setDetailsModalOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailsModalOpen(false)
    setSelectedSprint(null)
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
          border: '2px solid rgba(8, 145, 178, 0.2)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} sx={{ color: '#0891b2' }} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: '2px solid rgba(8, 145, 178, 0.2)',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(8, 145, 178, 0.15)',
          border: '2px solid rgba(8, 145, 178, 0.4)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(8, 145, 178, 0.3)',
          }}
        >
          <SpaceDashboard sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#0891b2', mb: 0.5 }}>
            {totalCount}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Sprints Ativos
          </Typography>
        </Box>
      </Box>

      {totalCount > 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(8, 145, 178, 0.08)',
            }}
          >
            <CalendarToday sx={{ fontSize: 18, color: '#0891b2' }} />
            <Typography variant="body2" fontWeight={600} sx={{ color: '#0891b2' }}>
              {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
            </Typography>
          </Box>

          <Box
            sx={{
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              pr: 0.5,
              '&::-webkit-scrollbar': {
                width: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(8, 145, 178, 0.05)',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(8, 145, 178, 0.3)',
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: 'rgba(8, 145, 178, 0.5)',
                },
              },
            }}
          >
            {paginatedSprints.map((sprint) => (
              <Box
                key={sprint.id}
                onClick={() => handleOpenDetails(sprint)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'white',
                  border: '1px solid rgba(8, 145, 178, 0.15)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'rgba(8, 145, 178, 0.3)',
                    boxShadow: '0 4px 12px rgba(8, 145, 178, 0.15)',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                    {sprint.name}
                  </Typography>
                  <Chip
                    label={`${calculateProgress(sprint)}%`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(8, 145, 178, 0.1)',
                      color: '#0891b2',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculateProgress(sprint)}
                  sx={{
                    height: 6,
                    borderRadius: 10,
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #0891b2 0%, #06b6d4 100%)',
                      borderRadius: 10,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {sprint.completed_stories}/{sprint.total_stories} histórias concluídas
                </Typography>
              </Box>
            ))}
          </Box>

          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 2,
                pt: 1.5,
                borderTop: '1px solid rgba(8, 145, 178, 0.1)',
              }}
            >
              <IconButton
                size="small"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                sx={{
                  color: '#0891b2',
                  '&:disabled': { color: 'rgba(8, 145, 178, 0.3)' },
                  '&:hover': { bgcolor: 'rgba(8, 145, 178, 0.1)' },
                }}
              >
                <KeyboardArrowUp fontSize="small" />
              </IconButton>
              <Typography variant="caption" fontWeight={600} sx={{ color: '#0891b2' }}>
                {currentPage} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                sx={{
                  color: '#0891b2',
                  '&:disabled': { color: 'rgba(8, 145, 178, 0.3)' },
                  '&:hover': { bgcolor: 'rgba(8, 145, 178, 0.1)' },
                }}
              >
                <KeyboardArrowDown fontSize="small" />
              </IconButton>
            </Box>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nenhum sprint ativo no momento
        </Typography>
      )}

      {selectedSprint && (
        <SprintDetailsModal
          open={detailsModalOpen}
          onClose={handleCloseDetails}
          sprint={{
            id: selectedSprint.id,
            name: selectedSprint.name,
            project_id: selectedSprint.project_id,
            team_id: selectedSprint.team_id,
            start_date: selectedSprint.start_date,
            end_date: selectedSprint.end_date,
          }}
        />
      )}
    </Paper>
  )
}
