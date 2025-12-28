import { useState, useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Chip, LinearProgress } from '@mui/material'
import { SpaceDashboard, CalendarToday } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface ActiveSprint {
  id: string
  name: string
  start_date: string
  end_date: string
  completed_stories: number
  total_stories: number
}

export default function ActiveSprintsWidget() {
  const [loading, setLoading] = useState(true)
  const [activeSprints, setActiveSprints] = useState<ActiveSprint[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [daysRemaining, setDaysRemaining] = useState(0)

  useEffect(() => {
    fetchActiveSprints()
  }, [])

  const fetchActiveSprints = async () => {
    try {
      setLoading(true)

      // Fetch active sprints
      const { data: sprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, name, start_date, end_date')
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

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {activeSprints.slice(0, 2).map((sprint) => (
              <Box
                key={sprint.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'white',
                  border: '1px solid rgba(8, 145, 178, 0.15)',
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

          {activeSprints.length > 2 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5, textAlign: 'center', fontWeight: 600 }}
            >
              +{activeSprints.length - 2} {activeSprints.length - 2 === 1 ? 'outro sprint' : 'outros sprints'}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nenhum sprint ativo no momento
        </Typography>
      )}
    </Paper>
  )
}
