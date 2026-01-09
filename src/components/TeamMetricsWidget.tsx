import { useState, useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Avatar, AvatarGroup } from '@mui/material'
import { People, TrendingUp, Speed } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface TeamMember {
  id: string
  full_name: string
  avatar_url?: string
}

interface TeamMetrics {
  totalMembers: number
  activeTeams: number
  averageVelocity: number
  members: TeamMember[]
}

export default function TeamMetricsWidget() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<TeamMetrics>({
    totalMembers: 0,
    activeTeams: 0,
    averageVelocity: 0,
    members: [],
  })

  useEffect(() => {
    fetchTeamMetrics()
  }, [])

  const fetchTeamMetrics = async () => {
    try {
      setLoading(true)

      // Fetch all team members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(5)

      if (profilesError) throw profilesError

      const totalMembers = profiles?.length || 0

      // Fetch active teams (teams with at least one active sprint)
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, sprints!inner(status)')
        .eq('sprints.status', 'active')

      if (teamsError) throw teamsError

      // Count unique teams
      const uniqueTeams = new Set(teams?.map((t) => t.id) || [])
      const activeTeams = uniqueTeams.size

      // Calculate average velocity from last 5 completed sprints
      const { data: completedSprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, velocity')
        .eq('status', 'completed')
        .order('end_date', { ascending: false })
        .limit(5)

      if (sprintsError) throw sprintsError

      const velocities = completedSprints?.map((s) => s.velocity || 0) || []
      const averageVelocity =
        velocities.length > 0 ? Math.round(velocities.reduce((sum, v) => sum + v, 0) / velocities.length) : 0

      setMetrics({
        totalMembers,
        activeTeams,
        averageVelocity,
        members: profiles || [],
      })
    } catch (error) {
      console.error('Error fetching team metrics:', error)
      setMetrics({
        totalMembers: 0,
        activeTeams: 0,
        averageVelocity: 0,
        members: [],
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '2px solid rgba(124, 58, 237, 0.2)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} sx={{ color: '#7c3aed' }} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
        border: '2px solid rgba(124, 58, 237, 0.2)',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(124, 58, 237, 0.15)',
          border: '2px solid rgba(124, 58, 237, 0.4)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(124, 58, 237, 0.3)',
          }}
        >
          <People sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#7c3aed', mb: 0.5 }}>
            {metrics.totalMembers}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Membros do Time
          </Typography>
        </Box>
      </Box>

      {metrics.totalMembers > 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(124, 58, 237, 0.08)',
            }}
          >
            <TrendingUp sx={{ fontSize: 18, color: '#7c3aed' }} />
            <Typography variant="body2" fontWeight={600} sx={{ color: '#7c3aed' }}>
              Em {metrics.activeTeams} {metrics.activeTeams === 1 ? 'time ativo' : 'times ativos'}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              Membros Recentes
            </Typography>
            <AvatarGroup
              max={5}
              sx={{
                '& .MuiAvatar-root': {
                  width: 36,
                  height: 36,
                  border: '2px solid white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  bgcolor: '#7c3aed',
                },
              }}
            >
              {metrics.members.map((member) => (
                <Avatar key={member.id} alt={member.full_name} src={member.avatar_url}>
                  {member.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Avatar>
              ))}
            </AvatarGroup>
          </Box>

          {metrics.averageVelocity > 0 && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'white',
                border: '1px solid rgba(124, 58, 237, 0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Speed sx={{ fontSize: 18, color: '#7c3aed' }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  Velocity Média
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#7c3aed' }}>
                  {metrics.averageVelocity}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  pontos/sprint
                </Typography>
              </Box>
            </Box>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nenhum membro cadastrado
        </Typography>
      )}
    </Paper>
  )
}
