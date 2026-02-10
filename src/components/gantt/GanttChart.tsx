import { useState, useMemo, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  Today,
  ChevronRight,
  ExpandMore,
  Flag,
} from '@mui/icons-material'
import { useTaskHierarchy, buildTaskTree, flattenTaskTree } from '@/hooks/useTaskHierarchy'
import {
  generateTimelineUnits,
  dateToX,
  dateRangeToWidth,
  getProjectDateRange,
  addDays,
} from '@/utils/gantt/dateCalculations'
import type { GanttZoomLevel } from '@/types/hybrid'
import GanttBar from './GanttBar'
import GanttTimeline from './GanttTimeline'
import GanttDependencyLines from './GanttDependencyLines'

interface GanttChartProps {
  projectId: string
}

const ROW_HEIGHT = 36
const TASK_LIST_WIDTH = 300

const zoomLevels: GanttZoomLevel[] = ['day', 'week', 'month', 'quarter', 'year']
const zoomLabels: Record<GanttZoomLevel, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  quarter: 'Trimestre',
  year: 'Ano',
}

export default function GanttChart({ projectId }: GanttChartProps) {
  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId)
  const [zoom, setZoom] = useState<GanttZoomLevel>('week')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Build tree and flatten
  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks])
  const flatTasks = useMemo(
    () => flattenTaskTree(taskTree, expandedIds),
    [taskTree, expandedIds]
  )
  const visibleTasks = flatTasks.filter((t) => t._visible)

  // Calculate date range
  const dateRange = useMemo(() => getProjectDateRange(tasks), [tasks])
  const timelineUnits = useMemo(
    () => generateTimelineUnits(dateRange.start, dateRange.end, zoom),
    [dateRange, zoom]
  )
  const timelineWidth = timelineUnits.reduce((sum, u) => sum + u.width, 0)

  const toggleExpand = (taskId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoom)
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1])
    }
  }

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoom)
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1])
    }
  }

  const scrollToToday = () => {
    if (chartRef.current) {
      const today = new Date()
      const x = dateToX(today, dateRange.start, zoom)
      chartRef.current.scrollLeft = Math.max(0, x - 200)
    }
  }

  // Sync scroll between timeline and chart
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineRef.current && e.currentTarget !== timelineRef.current) {
      timelineRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Calculate today marker position
  const todayX = dateToX(new Date(), dateRange.start, zoom)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          mb: 2,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          Zoom:
        </Typography>
        <Tooltip title="Aumentar zoom">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={zoom === 'day'}
            >
              <ZoomIn />
            </IconButton>
          </span>
        </Tooltip>
        <Chip
          label={zoomLabels[zoom]}
          size="small"
          sx={{ fontWeight: 600, minWidth: 80 }}
        />
        <Tooltip title="Diminuir zoom">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={zoom === 'year'}
            >
              <ZoomOut />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Ir para hoje">
          <IconButton size="small" onClick={scrollToToday}>
            <Today />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main Chart */}
      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        {/* Task List (Left Panel) */}
        <Box
          sx={{
            width: TASK_LIST_WIDTH,
            flexShrink: 0,
            borderRight: '2px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Task List Header */}
          <Box
            sx={{
              height: 50,
              bgcolor: 'grey.100',
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              px: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Nome da Tarefa
            </Typography>
          </Box>

          {/* Task List Body */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {visibleTasks.map((task, index) => (
              <Box
                key={task.id}
                onClick={() => setSelectedId(task.id)}
                sx={{
                  height: ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  pl: 1 + task._depth * 2,
                  cursor: 'pointer',
                  bgcolor: selectedId === task.id
                    ? 'rgba(99, 102, 241, 0.1)'
                    : index % 2 === 0
                    ? 'transparent'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                  },
                }}
              >
                {task._hasChildren ? (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(task.id)
                    }}
                    sx={{ mr: 0.5, p: 0.25 }}
                  >
                    {expandedIds.has(task.id) ? (
                      <ExpandMore fontSize="small" />
                    ) : (
                      <ChevronRight fontSize="small" />
                    )}
                  </IconButton>
                ) : (
                  <Box sx={{ width: 24 }} />
                )}

                {task.task_type === 'milestone' && (
                  <Flag sx={{ fontSize: 14, color: '#f59e0b', mr: 0.5 }} />
                )}

                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: task.is_summary ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {task.title}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Chart Area (Right Panel) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Timeline Header */}
          <Box
            ref={timelineRef}
            sx={{
              height: 50,
              overflow: 'hidden',
              bgcolor: 'grey.100',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <GanttTimeline units={timelineUnits} />
          </Box>

          {/* Chart Body */}
          <Box
            ref={chartRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {/* Grid Background */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: timelineWidth,
                height: visibleTasks.length * ROW_HEIGHT,
                minHeight: '100%',
              }}
            >
              {/* Row stripes */}
              {visibleTasks.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    top: index * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    bgcolor: index % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                    borderBottom: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.06)',
                  }}
                />
              ))}

              {/* Weekend highlights */}
              {timelineUnits
                .filter((u) => u.isWeekend)
                .map((unit, i) => {
                  const x = dateToX(unit.date, dateRange.start, zoom)
                  return (
                    <Box
                      key={`weekend-${i}`}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: x,
                        width: unit.width,
                        height: '100%',
                        bgcolor: 'rgba(0, 0, 0, 0.03)',
                      }}
                    />
                  )
                })}

              {/* Today marker */}
              {todayX >= 0 && todayX <= timelineWidth && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: todayX,
                    width: 2,
                    height: '100%',
                    bgcolor: '#ef4444',
                    zIndex: 10,
                  }}
                />
              )}

              {/* Task bars */}
              {visibleTasks.map((task, index) => {
                if (!task.start_date) return null

                const startDate = new Date(task.start_date)
                const endDate = task.end_date
                  ? new Date(task.end_date)
                  : addDays(startDate, (task.planned_duration || 1) - 1)

                const x = dateToX(startDate, dateRange.start, zoom)
                const width = dateRangeToWidth(startDate, endDate, zoom)
                const y = index * ROW_HEIGHT + 4

                return (
                  <GanttBar
                    key={task.id}
                    task={task}
                    x={x}
                    y={y}
                    width={Math.max(width, 20)}
                    height={ROW_HEIGHT - 8}
                    isSelected={selectedId === task.id}
                    onClick={() => setSelectedId(task.id)}
                  />
                )
              })}

              {/* Dependency lines */}
              <GanttDependencyLines
                tasks={visibleTasks}
                dateRange={dateRange}
                zoom={zoom}
                rowHeight={ROW_HEIGHT}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2, px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 8, bgcolor: '#6366f1', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Tarefa</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 8, bgcolor: '#8b5cf6', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Resumo</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              bgcolor: '#f59e0b',
              transform: 'rotate(45deg)',
            }}
          />
          <Typography variant="caption" color="text.secondary">Marco</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 8, bgcolor: '#ef4444', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Caminho Crítico</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 2, height: 16, bgcolor: '#ef4444' }} />
          <Typography variant="caption" color="text.secondary">Hoje</Typography>
        </Box>
      </Box>
    </Box>
  )
}
