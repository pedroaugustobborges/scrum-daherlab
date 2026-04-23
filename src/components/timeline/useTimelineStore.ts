import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimelineElement, TaskItem, SprintItem } from './types'
import { isTask, isSprint, DEFAULT_TIMELINE_END_X } from './types'

const storageKey = (projectId: string) => `daherplan_timeline_v1_${projectId}`

interface PersistedState {
  items: TimelineElement[]
  /** Task IDs the user explicitly removed — will not be auto-re-added */
  dismissedTaskIds: string[]
  /** Sprint IDs the user explicitly removed — will not be auto-re-added */
  dismissedSprintIds: string[]
  timelineEndX: number
}

function loadState(projectId: string): PersistedState {
  try {
    const raw = localStorage.getItem(storageKey(projectId))
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        items:               Array.isArray(parsed.items)               ? parsed.items               : [],
        dismissedTaskIds:    Array.isArray(parsed.dismissedTaskIds)    ? parsed.dismissedTaskIds    : [],
        dismissedSprintIds:  Array.isArray(parsed.dismissedSprintIds)  ? parsed.dismissedSprintIds  : [],
        timelineEndX:        typeof parsed.timelineEndX === 'number'
          ? parsed.timelineEndX
          : DEFAULT_TIMELINE_END_X,
      }
    }
  } catch { /* ignore */ }
  return { items: [], dismissedTaskIds: [], dismissedSprintIds: [], timelineEndX: DEFAULT_TIMELINE_END_X }
}

/**
 * Manages timeline canvas state with localStorage persistence.
 * Does NOT interact with Supabase — timeline items are local-only.
 */
export function useTimelineStore(projectId: string) {
  const initial = () => loadState(projectId)

  const [items,               setItems]               = useState<TimelineElement[]>(() => initial().items)
  const [dismissedTaskIds,    setDismissedTaskIds]    = useState<string[]>(() => initial().dismissedTaskIds)
  const [dismissedSprintIds,  setDismissedSprintIds]  = useState<string[]>(() => initial().dismissedSprintIds)
  const [timelineEndX,        setTimelineEndXRaw]     = useState<number>(() => initial().timelineEndX)

  const itemsRef          = useRef(items)
  const dismissedRef      = useRef(dismissedTaskIds)
  const dismissedSprRef   = useRef(dismissedSprintIds)
  const endXRef           = useRef(timelineEndX)
  itemsRef.current         = items
  dismissedRef.current     = dismissedTaskIds
  dismissedSprRef.current  = dismissedSprintIds
  endXRef.current          = timelineEndX

  useEffect(() => {
    const s = loadState(projectId)
    itemsRef.current         = s.items
    dismissedRef.current     = s.dismissedTaskIds
    dismissedSprRef.current  = s.dismissedSprintIds
    endXRef.current          = s.timelineEndX
    setItems(s.items)
    setDismissedTaskIds(s.dismissedTaskIds)
    setDismissedSprintIds(s.dismissedSprintIds)
    setTimelineEndXRaw(s.timelineEndX)
  }, [projectId])

  // ── Persistence ───────────────────────────────────────────────────────────

  const persist = useCallback((
    nextItems:          TimelineElement[],
    nextDismissed:      string[],
    nextDismissedSprs:  string[],
    endX:               number,
  ) => {
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify({
        items:              nextItems,
        dismissedTaskIds:   nextDismissed,
        dismissedSprintIds: nextDismissedSprs,
        timelineEndX:       endX,
      }))
    } catch { /* quota exceeded */ }
  }, [projectId])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addItem = useCallback((item: TimelineElement) => {
    const next = [...itemsRef.current, item]
    itemsRef.current = next
    setItems(next)
    persist(next, dismissedRef.current, dismissedSprRef.current, endXRef.current)
  }, [persist])

  const batchAddItems = useCallback((newItems: TimelineElement[]) => {
    if (newItems.length === 0) return
    const next = [...itemsRef.current, ...newItems]
    itemsRef.current = next
    setItems(next)
    persist(next, dismissedRef.current, dismissedSprRef.current, endXRef.current)
  }, [persist])

  const updateItem = useCallback((id: string, patch: Partial<TimelineElement>) => {
    const next = itemsRef.current.map(i =>
      i.id === id ? { ...i, ...patch } as TimelineElement : i,
    )
    itemsRef.current = next
    setItems(next)
    persist(next, dismissedRef.current, dismissedSprRef.current, endXRef.current)
  }, [persist])

  const removeItem = useCallback((id: string) => {
    const next = itemsRef.current.filter(i => i.id !== id)
    itemsRef.current = next
    setItems(next)
    persist(next, dismissedRef.current, dismissedSprRef.current, endXRef.current)
  }, [persist])

  const dismissTask = useCallback((taskId: string) => {
    const nextItems = itemsRef.current.filter(
      i => !(isTask(i) && (i as TaskItem).taskId === taskId),
    )
    const nextDismissed = dismissedRef.current.includes(taskId)
      ? dismissedRef.current
      : [...dismissedRef.current, taskId]
    itemsRef.current     = nextItems
    dismissedRef.current = nextDismissed
    setItems(nextItems)
    setDismissedTaskIds(nextDismissed)
    persist(nextItems, nextDismissed, dismissedSprRef.current, endXRef.current)
  }, [persist])

  const dismissSprint = useCallback((sprintId: string) => {
    const nextItems = itemsRef.current.filter(
      i => !(isSprint(i) && (i as SprintItem).sprintId === sprintId),
    )
    const nextDismissed = dismissedSprRef.current.includes(sprintId)
      ? dismissedSprRef.current
      : [...dismissedSprRef.current, sprintId]
    itemsRef.current        = nextItems
    dismissedSprRef.current = nextDismissed
    setItems(nextItems)
    setDismissedSprintIds(nextDismissed)
    persist(nextItems, dismissedRef.current, nextDismissed, endXRef.current)
  }, [persist])

  const clearAll = useCallback(() => {
    itemsRef.current = []
    setItems([])
    persist([], dismissedRef.current, dismissedSprRef.current, endXRef.current)
  }, [persist])

  const resetToDefault = useCallback(() => {
    itemsRef.current        = []
    dismissedRef.current    = []
    dismissedSprRef.current = []
    endXRef.current         = DEFAULT_TIMELINE_END_X
    setItems([])
    setDismissedTaskIds([])
    setDismissedSprintIds([])
    setTimelineEndXRaw(DEFAULT_TIMELINE_END_X)
    persist([], [], [], DEFAULT_TIMELINE_END_X)
  }, [persist])

  const setTimelineEndX = useCallback((endX: number) => {
    endXRef.current = endX
    setTimelineEndXRaw(endX)
    persist(itemsRef.current, dismissedRef.current, dismissedSprRef.current, endX)
  }, [persist])

  // ── Queries ───────────────────────────────────────────────────────────────

  const hasTask = useCallback((taskId: string): boolean =>
    itemsRef.current.some(i => isTask(i) && (i as TaskItem).taskId === taskId),
  [])

  const isDismissed = useCallback((taskId: string): boolean =>
    dismissedRef.current.includes(taskId),
  [])

  const hasSprint = useCallback((sprintId: string): boolean =>
    itemsRef.current.some(i => isSprint(i) && (i as SprintItem).sprintId === sprintId),
  [])

  const isSprintDismissed = useCallback((sprintId: string): boolean =>
    dismissedSprRef.current.includes(sprintId),
  [])

  const taskItems   = items.filter(isTask)   as TaskItem[]
  const sprintItems = items.filter(isSprint) as SprintItem[]

  return {
    items, taskItems, sprintItems, timelineEndX,
    addItem, batchAddItems, updateItem, removeItem,
    dismissTask, dismissSprint, clearAll, resetToDefault,
    setTimelineEndX, hasTask, isDismissed, hasSprint, isSprintDismissed,
  }
}
