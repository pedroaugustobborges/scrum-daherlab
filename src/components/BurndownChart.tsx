import { useMemo } from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingDown } from '@mui/icons-material'

interface BurndownChartProps {
  sprint: {
    start_date: string
    end_date: string
  }
  stories: Array<{
    story_points: number
    status: string
    completed_at?: string
  }>
}

export default function BurndownChart({ sprint, stories }: BurndownChartProps) {
  const chartData = useMemo(() => {
    const startDate = new Date(sprint.start_date)
    const endDate = new Date(sprint.end_date)
    const today = new Date()

    // Calculate total points
    const totalPoints = stories.reduce((sum, story) => sum + (story.story_points || 0), 0)

    // Calculate number of days
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // Generate data points for each day
    const data = []
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)

      // Ideal burndown (linear)
      const idealRemaining = totalPoints - (totalPoints / totalDays) * i

      // Actual burndown (based on completed stories)
      const completedByDate = stories.filter((story) => {
        if (story.status !== 'done' || !story.completed_at) return false
        const completedDate = new Date(story.completed_at)
        return completedDate <= currentDate
      })
      const completedPoints = completedByDate.reduce((sum, story) => sum + (story.story_points || 0), 0)
      const actualRemaining = totalPoints - completedPoints

      // Only show actual data up to today
      const isToday = currentDate.toDateString() === today.toDateString()
      const isFuture = currentDate > today

      data.push({
        day: i,
        date: currentDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        ideal: Math.max(0, idealRemaining),
        actual: isFuture ? null : actualRemaining,
        isToday,
      })
    }

    return data
  }, [sprint, stories])

  const totalPoints = stories.reduce((sum, story) => sum + (story.story_points || 0), 0)
  const completedPoints = stories
    .filter((s) => s.status === 'done')
    .reduce((sum, story) => sum + (story.story_points || 0), 0)
  const remainingPoints = totalPoints - completedPoints

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
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
            {payload[0].payload.date}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="caption"
              sx={{ display: 'block', color: entry.color, fontWeight: 600 }}
            >
              {entry.name}: {entry.value !== null ? Math.round(entry.value) : '-'} pontos
            </Typography>
          ))}
        </Paper>
      )
    }
    return null
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
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingDown sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Burndown Chart
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Progresso do Sprint
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${completedPoints}/${totalPoints} pts`}
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontWeight: 700,
            }}
          />
          <Chip
            label={`${remainingPoints} restantes`}
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
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: 12, fontWeight: 600 }}
            tick={{ fill: '#6b7280' }}
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
            iconType="line"
          />

          {/* Ideal Line */}
          <Line
            type="linear"
            dataKey="ideal"
            name="Ideal"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
          />

          {/* Actual Line */}
          <Line
            type="monotone"
            dataKey="actual"
            name="Real"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ fill: '#6366f1', r: 4 }}
            activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: 'white' }}
          />

          {/* Today Reference Line */}
          {chartData.findIndex((d) => d.isToday) >= 0 && (
            <ReferenceLine
              x={chartData.find((d) => d.isToday)?.date}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: 'Hoje',
                position: 'top',
                fill: '#10b981',
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Status Message */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: remainingPoints === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          border: `2px solid ${remainingPoints === 0 ? '#10b981' : '#6366f1'}30`,
        }}
      >
        <Typography variant="body2" fontWeight={600} sx={{ color: remainingPoints === 0 ? '#10b981' : '#6366f1' }}>
          {remainingPoints === 0
            ? '🎉 Parabéns! Todos os story points foram concluídos!'
            : completedPoints > 0
            ? `📊 ${Math.round((completedPoints / totalPoints) * 100)}% do sprint concluído`
            : '🚀 Sprint iniciado! Comece a trabalhar nas histórias'}
        </Typography>
      </Box>
    </Paper>
  )
}
