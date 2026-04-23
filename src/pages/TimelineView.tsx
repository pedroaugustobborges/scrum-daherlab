import { useState, useCallback, useRef, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTheme } from '@/contexts/ThemeContext'
import { useTaskHierarchy } from '@/hooks/useTaskHierarchy'
import type { HierarchicalTask } from '@/types/hybrid'
import { supabase } from '@/lib/supabase'
import {
  TimelineCanvas,
  TimelineToolbar,
  TimelineTaskPanel,
  useTimelineStore,
} from '@/components/timeline'
import type { TimelineCanvasHandle, ToolType, TaskItem, SprintItem } from '@/components/timeline'
import type { SprintInfo } from '@/components/timeline/TimelineTaskPanel'
import {
  TIMELINE_Y, TIMELINE_START_X,
  TASK_W, TASK_H, TASK_SPACING_X,
  SPRINT_W, SPRINT_H, SPRINT_SPACING_X,
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

/** Calculate where to place sprint card N on the canvas.
 *  Sprints are pushed far from the arrow so they clear the task card zone:
 *  - Task 'above' cards occupy ~200–330; sprint 'above' cards land at ~27–195 (above that).
 *  - Task 'below' cards occupy ~490–620; sprint 'below' cards land at ~650–818 (below that).
 *  This gives a ~225px dashed connector line for visual clarity. */
function nextSprintPosition(n: number): { x: number; y: number; position: 'above' | 'below' } {
  const x        = TIMELINE_START_X + 60 + n * SPRINT_SPACING_X
  const position = n % 2 === 0 ? 'below' : 'above'
  const y        = position === 'below'
    ? TIMELINE_Y + 230          // card top at 650, no overlap with task-below zone (490–620)
    : TIMELINE_Y - SPRINT_H - 225  // card top at 27, card bottom at 195, no overlap with task-above zone (200–330)
  return { x, y, position }
}

function requiredArrowEndX(totalItems: number): number {
  if (totalItems === 0) return DEFAULT_TIMELINE_END_X
  const lastCardX  = TIMELINE_START_X + 80 + (totalItems - 1) * TASK_SPACING_X
  const lastDotX   = lastCardX + TASK_W / 2
  return lastDotX + 120
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

function buildSprintItem(sprint: SprintInfo, index: number, zBase: number): SprintItem {
  const { x, y, position } = nextSprintPosition(index)
  return {
    id: uid(),
    type: 'sprint',
    sprintId: sprint.id,
    name: sprint.name,
    description: sprint.description ?? undefined,
    startDate: sprint.start_date,
    endDate: sprint.end_date,
    position,
    x, y,
    width: SPRINT_W,
    height: SPRINT_H,
    zIndex: zBase + index + 1,
  }
}

export default function TimelineView() {
  const { projectId } = useParams<{ projectId: string }>()
  const { isDarkMode } = useTheme()
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [activeColor, setActiveColor] = useState('#6366f1')
  const canvasRef = useRef<TimelineCanvasHandle>(null)

  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId)
  const store = useTimelineStore(projectId ?? '')

  // ── Fetch sprints for this project ────────────────────────────────────────
  const [sprints, setSprints] = useState<SprintInfo[]>([])
  const [sprintsLoading, setSprintsLoading] = useState(true)

  useEffect(() => {
    if (!projectId) { setSprintsLoading(false); return }
    setSprintsLoading(true)
    supabase
      .from('sprints')
      .select('id, name, start_date, end_date, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setSprints((data ?? []) as SprintInfo[])
        setSprintsLoading(false)
      })
  }, [projectId])

  // ── Auto-populate tasks ───────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || tasks.length === 0) return

    const missing = tasks
      .filter(t => !store.hasTask(t.id) && !store.isDismissed(t.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (missing.length === 0) return

    const baseIndex = store.taskItems.length
    const zBase     = store.items.length
    const newItems  = missing.map((task, i) => buildTaskItem(task, baseIndex + i, zBase))
    store.batchAddItems(newItems)

    const totalTasks = baseIndex + missing.length
    const needed     = requiredArrowEndX(totalTasks)
    if (needed > store.timelineEndX) store.setTimelineEndX(needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, isLoading])

  // ── Auto-populate sprints ─────────────────────────────────────────────────
  useEffect(() => {
    if (sprintsLoading || sprints.length === 0) return

    const missing = sprints.filter(
      s => !store.hasSprint(s.id) && !store.isSprintDismissed(s.id),
    )
    if (missing.length === 0) return

    const baseIndex = store.sprintItems.length
    const zBase     = store.items.length
    const newItems  = missing.map((sprint, i) => buildSprintItem(sprint, baseIndex + i, zBase))
    store.batchAddItems(newItems)

    // Grow arrow to cover sprint cards too (sprint x spans can be wider)
    const maxSprintX = store.sprintItems.length + missing.length
    const needed = Math.max(
      requiredArrowEndX(store.taskItems.length),
      TIMELINE_START_X + 60 + (maxSprintX - 1) * SPRINT_SPACING_X + SPRINT_W + 60,
    )
    if (needed > store.timelineEndX) store.setTimelineEndX(needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints, sprintsLoading])

  // ── Manual add from panel ─────────────────────────────────────────────────
  const addTaskToTimeline = useCallback((task: HierarchicalTask) => {
    if (!projectId) return
    if (store.hasTask(task.id)) {
      toast('Tarefa já está na linha do tempo', { icon: 'ℹ️' })
      return
    }
    const index  = store.taskItems.length
    const item   = buildTaskItem(task, index, store.items.length)
    store.addItem(item)

    const needed = requiredArrowEndX(index + 1)
    if (needed > store.timelineEndX) store.setTimelineEndX(needed)
    toast.success(`"${task.title}" adicionado à linha do tempo`)
  }, [projectId, store])

  const addSprintToTimeline = useCallback((sprint: SprintInfo) => {
    if (!projectId) return
    if (store.hasSprint(sprint.id)) {
      toast('Sprint já está na linha do tempo', { icon: 'ℹ️' })
      return
    }
    const index = store.sprintItems.length
    const item  = buildSprintItem(sprint, index, store.items.length)
    store.addItem(item)

    const needed = TIMELINE_START_X + 60 + index * SPRINT_SPACING_X + SPRINT_W + 60
    if (needed > store.timelineEndX) store.setTimelineEndX(needed)
    toast.success(`Sprint "${sprint.name}" adicionado à linha do tempo`)
  }, [projectId, store])

  // ── Remove items ──────────────────────────────────────────────────────────
  const handleRemoveItem = useCallback((id: string) => {
    const item = store.items.find(i => i.id === id)
    if (item?.type === 'task') {
      store.dismissTask((item as TaskItem).taskId)
    } else if (item?.type === 'sprint') {
      store.dismissSprint((item as SprintItem).sprintId)
    } else {
      store.removeItem(id)
    }
    toast.success('Removido da linha do tempo')
  }, [store])

  const handleClearAll = useCallback(() => {
    if (store.items.length === 0) return
    store.clearAll()
    toast.success('Canvas limpo — os itens serão recarregados automaticamente')
  }, [store])

  const handleReset = useCallback(() => {
    store.resetToDefault()
    if ((isLoading || tasks.length === 0) && (sprintsLoading || sprints.length === 0)) {
      toast.success('Canvas restaurado')
      return
    }
    const sortedTasks = [...tasks].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const newTaskItems = sortedTasks.map((task, i) => buildTaskItem(task, i, 0))

    const sortedSprints = [...sprints] // already sorted by created_at from DB
    const newSprintItems = sortedSprints.map((sprint, i) => buildSprintItem(sprint, i, newTaskItems.length))

    store.batchAddItems([...newTaskItems, ...newSprintItems])
    store.setTimelineEndX(requiredArrowEndX(newTaskItems.length))
    toast.success('Canvas restaurado com todas as tarefas e sprints')
  }, [store, tasks, isLoading, sprints, sprintsLoading])

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
      border: isDarkMode ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.1)',
      background: isDarkMode ? '#0f172a' : 'white',
      boxShadow: isDarkMode ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    }}>
      <TimelineToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onClearAll={handleClearAll}
        onReset={handleReset}
        onExport={handleExport}
      />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TimelineTaskPanel
          tasks={tasks}
          isLoading={isLoading}
          onAddTask={addTaskToTimeline}
          hasTask={store.hasTask}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          onAddSprint={addSprintToTimeline}
          hasSprint={store.hasSprint}
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
