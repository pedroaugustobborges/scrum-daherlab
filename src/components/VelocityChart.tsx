import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Chip, CircularProgress } from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Speed, TrendingUp } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface VelocityChartProps {
  teamId: string
  currentSprintId?: string
}

interface SprintVelocity {
  id: string
  name: string
  committed: number
  completed: number
  status: string
}

export default function VelocityChart({ teamId, currentSprintId }: VelocityChartProps) {
  const [loading, setLoading] = useState(true)
  const [velocityData, setVelocityData] = useState<SprintVelocity[]>([])

  useEffect(() => {
    fetchVelocityData()
  }, [teamId])

  const fetchVelocityData = async () => {
    setLoading(true)
    try {
      // Fetch last 6 completed sprints + current sprint
      const { data: sprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, name, status, start_date, end_date')
        .eq('team_id', teamId)
        .in('status', ['completed', 'active'])
        .order('end_date', { ascending: false })
        .limit(6)

      if (sprintsError) throw sprintsError

      if (!sprints || sprints.length === 0) {
        setVelocityData([])
        setLoading(false)
        return
      }

      // Fetch tasks for each sprint
      const velocityPromises = sprints.map(async (sprint) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('story_points, status')
          .eq('sprint_id', sprint.id)

        const committed = (tasks || []).reduce((sum, task) => sum + (task.story_points || 0), 0)
        const completed = (tasks || [])
          .filter((task) => task.status === 'done')
          .reduce((sum, task) => sum + (task.story_points || 0), 0)

        return {
          id: sprint.id,
          name: sprint.name,
          committed,
          completed,
          status: sprint.status,
        }
      })

      const velocities = await Promise.all(velocityPromises)

      // Reverse to show chronological order
      setVelocityData(velocities.reverse())
    } catch (error) {
      console.error('Error fetching velocity data:', error)
      toast.error('Erro ao carregar dados de velocity')
    } finally {
      setLoading(false)
    }
  }

  const calculateAverageVelocity = () => {
    const completedSprints = velocityData.filter((v) => v.status === 'completed')
    if (completedSprints.length === 0) return 0

    const total = completedSprints.reduce((sum, v) => sum + v.completed, 0)
    return Math.round(total / completedSprints.length)
  }

  const averageVelocity = calculateAverageVelocity()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            bgcolor: 'white',
            border: '2px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
            {data.name}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', fontWeight: 600 }}>
            Comprometido: {data.committed} pts
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#10b981', fontWeight: 600 }}>
            Concluído: {data.completed} pts
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#6366f1', fontWeight: 600, mt: 0.5 }}>
            Taxa: {data.committed > 0 ? Math.round((data.completed / data.committed) * 100) : 0}%
          </Typography>
        </Paper>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '2px solid rgba(99, 102, 241, 0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Paper>
    )
  }

  if (velocityData.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '2px solid rgba(99, 102, 241, 0.1)',
          textAlign: 'center',
        }}
      >
        <Speed sx={{ fontSize: 60, color: '#6366f1', opacity: 0.3, mb: 2 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Sem dados de velocity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete alguns sprints para ver o histórico de velocity do time
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '2px solid rgba(99, 102, 241, 0.1)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Speed sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Velocity do Time
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Últimos {velocityData.length} sprints
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`Média: ${averageVelocity} pts`}
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontWeight: 700,
            }}
          />
          <Chip
            label={`${velocityData.filter((v) => v.status === 'completed').length} concluídos`}
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              fontWeight: 700,
            }}
          />
        </Box>
      </Box>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={velocityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            style={{ fontSize: 12, fontWeight: 600 }}
            tick={{ fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: 12, fontWeight: 600 }}
            tick={{ fill: '#6b7280' }}
            label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontWeight: 600 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 14, fontWeight: 600 }}
            iconType="square"
          />

          {/* Average Velocity Line */}
          {averageVelocity > 0 && (
            <ReferenceLine
              y={averageVelocity}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `Média: ${averageVelocity}`,
                position: 'right',
                fill: '#10b981',
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          )}

          {/* Committed Points */}
          <Bar
            dataKey="committed"
            name="Comprometido"
            fill="#9ca3af"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          />

          {/* Completed Points */}
          <Bar
            dataKey="completed"
            name="Concluído"
            fill="#10b981"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          >
            {velocityData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.id === currentSprintId ? '#6366f1' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Insights */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        <Typography variant="body2" fontWeight={600} sx={{ color: '#10b981' }}>
          💡 Insight: {averageVelocity > 0
            ? `O time tem uma velocity média de ${averageVelocity} pontos por sprint. Use este valor para planejar futuros sprints.`
            : 'Complete mais sprints para calcular a velocity média do time.'}
        </Typography>
      </Box>
    </Paper>
  )
}
