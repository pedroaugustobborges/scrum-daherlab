import { useMemo } from 'react'
import type { HierarchicalTask, GanttZoomLevel } from '@/types/hybrid'
import { dateToX, addDays } from '@/utils/gantt/dateCalculations'

interface GanttDependencyLinesProps {
  tasks: HierarchicalTask[]
  dateRange: { start: Date; end: Date }
  zoom: GanttZoomLevel
  rowHeight: number
}

interface DependencyLine {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  type: string
}

export default function GanttDependencyLines({
  tasks,
  dateRange,
  zoom,
  rowHeight,
}: GanttDependencyLinesProps) {
  const lines = useMemo(() => {
    const result: DependencyLine[] = []
    const taskIndexMap = new Map(tasks.map((t, i) => [t.id, i]))

    tasks.forEach((task) => {
      if (!task.dependencies || task.dependencies.length === 0) return

      const successorIndex = taskIndexMap.get(task.id)
      if (successorIndex === undefined) return

      task.dependencies.forEach((dep) => {
        const predecessorIndex = taskIndexMap.get(dep.predecessor_id)
        if (predecessorIndex === undefined) return

        const predecessor = tasks[predecessorIndex]
        if (!predecessor.start_date) return
        if (!task.start_date) return

        const predStartDate = new Date(predecessor.start_date)
        const predEndDate = predecessor.end_date
          ? new Date(predecessor.end_date)
          : addDays(predStartDate, (predecessor.planned_duration || 1) - 1)

        const succStartDate = new Date(task.start_date)
        const succEndDate = task.end_date
          ? new Date(task.end_date)
          : addDays(succStartDate, (task.planned_duration || 1) - 1)

        let fromX: number
        let toX: number

        // Calculate positions based on dependency type
        switch (dep.dependency_type) {
          case 'FS': // Finish-to-Start (most common)
            fromX = dateToX(predEndDate, dateRange.start, zoom) + 20 // End of predecessor
            toX = dateToX(succStartDate, dateRange.start, zoom) // Start of successor
            break
          case 'SS': // Start-to-Start
            fromX = dateToX(predStartDate, dateRange.start, zoom)
            toX = dateToX(succStartDate, dateRange.start, zoom)
            break
          case 'FF': // Finish-to-Finish
            fromX = dateToX(predEndDate, dateRange.start, zoom) + 20
            toX = dateToX(succEndDate, dateRange.start, zoom) + 20
            break
          case 'SF': // Start-to-Finish
            fromX = dateToX(predStartDate, dateRange.start, zoom)
            toX = dateToX(succEndDate, dateRange.start, zoom) + 20
            break
          default:
            fromX = dateToX(predEndDate, dateRange.start, zoom) + 20
            toX = dateToX(succStartDate, dateRange.start, zoom)
        }

        const fromY = predecessorIndex * rowHeight + rowHeight / 2
        const toY = successorIndex * rowHeight + rowHeight / 2

        result.push({
          id: dep.id,
          fromX,
          fromY,
          toX,
          toY,
          type: dep.dependency_type,
        })
      })
    })

    return result
  }, [tasks, dateRange, zoom, rowHeight])

  if (lines.length === 0) return null

  // Calculate SVG dimensions
  const maxX = Math.max(...lines.flatMap((l) => [l.fromX, l.toX])) + 50
  const maxY = tasks.length * rowHeight

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: maxX,
        height: maxY,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
        </marker>
        <marker
          id="arrowhead-critical"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
        </marker>
      </defs>

      {lines.map((line) => {
        // Different path for going forward vs backward
        let path: string
        if (line.toX >= line.fromX) {
          // Forward dependency (normal case)
          if (Math.abs(line.fromY - line.toY) < rowHeight) {
            // Same or adjacent row - simple curve
            const midX = (line.fromX + line.toX) / 2
            path = `
              M ${line.fromX} ${line.fromY}
              C ${midX} ${line.fromY},
                ${midX} ${line.toY},
                ${line.toX} ${line.toY}
            `
          } else {
            // Different rows - step path
            const stepX = line.fromX + 15
            path = `
              M ${line.fromX} ${line.fromY}
              L ${stepX} ${line.fromY}
              L ${stepX} ${line.toY}
              L ${line.toX} ${line.toY}
            `
          }
        } else {
          // Backward dependency (loops back)
          const offset = 20
          path = `
            M ${line.fromX} ${line.fromY}
            L ${line.fromX + offset} ${line.fromY}
            L ${line.fromX + offset} ${line.fromY + (line.toY > line.fromY ? offset : -offset)}
            L ${line.toX - offset} ${line.toY + (line.toY > line.fromY ? offset : -offset)}
            L ${line.toX - offset} ${line.toY}
            L ${line.toX} ${line.toY}
          `
        }

        return (
          <path
            key={line.id}
            d={path}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray={line.type === 'SF' ? '4 2' : undefined}
            markerEnd="url(#arrowhead)"
            opacity={0.7}
          />
        )
      })}
    </svg>
  )
}
