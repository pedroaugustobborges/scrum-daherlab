import { useState, useCallback, useRef, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTaskHierarchy } from '@/hooks/useTaskHierarchy'
import type { HierarchicalTask } from '@/types/hybrid'
import {
  TimelineCanvas,
  TimelineToolbar,
  TimelineTaskPanel,
  useTimelineStore,
} from '@/components/timeline'
import type { TimelineCanvasHandle, ToolType, TaskItem } from '@/components/timeline'
import {
  TIMELINE_Y, TIMELINE_START_X,
  TASK_W, TASK_H, TASK_SPACING_X,
  DEFAULT_TIMELINE_END_X,
} from '@/components/timeline/types'

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

/** Calculate where to place task card N on the canvas */
function nextTaskPosition(n: number): { x: number; y: number; position: 'above' | 'below' } {
  const x        = TIMELINE_START_X + 80 + n * TASK_SPACING_X
  const position = n % 2 === 0 ? 'above' : 'below'
  const y        = position === 'above' ? TIMELINE_Y - TASK_H - 90 : TIMELINE_Y + 70
  return { x, y, position }
}

/**
 * Minimum arrow length needed to cover `totalTasks` task cards.
 * Based on the dot position of the last card plus a trailing margin.
 */
function requiredArrowEndX(totalTasks: number): number {
  if (totalTasks === 0) return DEFAULT_TIMELINE_END_X
  const lastCardX  = TIMELINE_START_X + 80 + (totalTasks - 1) * TASK_SPACING_X
  const lastDotX   = lastCardX + TASK_W / 2
  return lastDotX + 120   // 120 px trailing margin after the last dot
}

function buildTaskItem(task: HierarchicalTask, index: number, zBase: number): TaskItem {
  const { x, y, position } = nextTaskPosition(index)
  return {
    id: uid(),
    type: 'task',
    taskId: task.id,
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    date: task.due_date ?? task.start_date ?? null,
    position,
    x, y,
    width: TASK_W,
    height: TASK_H,
    zIndex: zBase + index + 1,
  }
}

export default function TimelineView() {
  const { projectId } = useParams<{ projectId: string }>()
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [activeColor, setActiveColor] = useState('#6366f1')
  const canvasRef = useRef<TimelineCanvasHandle>(null)

  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId)
  const store = useTimelineStore(projectId ?? '')

  // ── Auto-populate: add any task that is not yet on canvas and not dismissed ──
  // Uses stable ref-based helpers (hasTask / isDismissed) so there is no
  // re-render loop — the effect only re-runs when the project task list changes.
  useEffect(() => {
    if (isLoading || tasks.length === 0) return

    const missing = tasks
      .filter(t => !store.hasTask(t.id) && !store.isDismissed(t.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (missing.length === 0) return

    const baseIndex  = store.taskItems.length
    const zBase      = store.items.length
    const newItems   = missing.map((task, i) => buildTaskItem(task, baseIndex + i, zBase))
    store.batchAddItems(newItems)

    // Grow the arrow to cover all tasks (never shrink — user's drag is preserved)
    const totalTasks = baseIndex + missing.length
    const needed     = requiredArrowEndX(totalTasks)
    if (needed > store.timelineEndX) store.setTimelineEndX(needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, isLoading])
  // ^ intentionally omit `store` — its mutation helpers use refs and are stable

  // ── Manual "add" from the panel (re-adds a dismissed task) ───────────────
  const addTaskToTimeline = useCallback((task: HierarchicalTask) => {
    if (!projectId) return
    if (store.hasTask(task.id)) {
      toast('Tarefa já está na linha do tempo', { icon: 'ℹ️' })
      return
    }
    const index    = store.taskItems.length
    const item     = buildTaskItem(task, index, store.items.length)
    store.addItem(item)

    // Grow arrow if the new card would fall outside current length
    const needed = requiredArrowEndX(index + 1)
    if (needed > store.timelineEndX) store.setTimelineEndX(needed)

    toast.success(`"${task.title}" adicionado à linha do tempo`)
  }, [projectId, store])

  // ── Remove: tasks go to dismissed (won't auto-re-add); shapes/text just delete ──
  const handleRemoveItem = useCallback((id: string) => {
    const item = store.items.find(i => i.id === id)
    if (item?.type === 'task') {
      store.dismissTask((item as TaskItem).taskId)
    } else {
      store.removeItem(id)
    }
    toast.success('Removido da linha do tempo')
  }, [store])

  const handleClearAll = useCallback(() => {
    if (store.items.length === 0) return
    store.clearAll()
    toast.success('Canvas limpo — as tarefas serão recarregadas automaticamente')
  }, [store])

  const handleExport = useCallback(() => {
    canvasRef.current?.exportPng()
  }, [])

  if (!projectId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Projeto não encontrado</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 130px)',
      minHeight: 500,
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(99,102,241,0.1)',
      background: 'white',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }}>
      <TimelineToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onClearAll={handleClearAll}
        onExport={handleExport}
      />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TimelineTaskPanel
          tasks={tasks}
          isLoading={isLoading}
          onAddTask={addTaskToTimeline}
          hasTask={store.hasTask}
        />

        <TimelineCanvas
          ref={canvasRef}
          items={store.items}
          timelineEndX={store.timelineEndX}
          activeTool={activeTool}
          activeColor={activeColor}
          onAddItem={store.addItem}
          onUpdateItem={store.updateItem}
          onRemoveItem={handleRemoveItem}
          onUpdateTimelineEndX={store.setTimelineEndX}
          onToolChange={setActiveTool}
        />
      </Box>
    </Box>
  )
}
