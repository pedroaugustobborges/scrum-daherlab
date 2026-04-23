import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimelineElement, TaskItem } from './types'
import { isTask, DEFAULT_TIMELINE_END_X } from './types'

const storageKey = (projectId: string) => `daherplan_timeline_v1_${projectId}`

interface PersistedState {
  items: TimelineElement[]
  /** Task IDs the user explicitly removed — will not be auto-re-added */
  dismissedTaskIds: string[]
  timelineEndX: number
}

function loadState(projectId: string): PersistedState {
  try {
    const raw = localStorage.getItem(storageKey(projectId))
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        items:            Array.isArray(parsed.items)            ? parsed.items            : [],
        dismissedTaskIds: Array.isArray(parsed.dismissedTaskIds) ? parsed.dismissedTaskIds : [],
        timelineEndX:     typeof parsed.timelineEndX === 'number'
          ? parsed.timelineEndX
          : DEFAULT_TIMELINE_END_X,
      }
    }
  } catch { /* ignore */ }
  return { items: [], dismissedTaskIds: [], timelineEndX: DEFAULT_TIMELINE_END_X }
}

/**
 * Manages timeline canvas state with localStorage persistence.
 * Does NOT interact with Supabase — timeline items are local-only.
 *
 * IMPORTANT: refs are updated EAGERLY inside each mutation so that
 * back-to-back calls (e.g. batchAddItems → setTimelineEndX) always
 * persist with the correct combined state instead of stale snapshots.
 */
export function useTimelineStore(projectId: string) {
  const initial = () => loadState(projectId)

  const [items,            setItems]            = useState<TimelineElement[]>(() => initial().items)
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>(() => initial().dismissedTaskIds)
  const [timelineEndX,     setTimelineEndXRaw]  = useState<number>(() => initial().timelineEndX)

  // Refs mirror state — updated both eagerly (inside mutations) and
  // at render time so they're always current.
  const itemsRef     = useRef(items)
  const dismissedRef = useRef(dismissedTaskIds)
  const endXRef      = useRef(timelineEndX)
  itemsRef.current     = items
  dismissedRef.current = dismissedTaskIds
  endXRef.current      = timelineEndX

  // Re-load when navigating between projects
  useEffect(() => {
    const s = loadState(projectId)
    itemsRef.current     = s.items
    dismissedRef.current = s.dismissedTaskIds
    endXRef.current      = s.timelineEndX
    setItems(s.items)
    setDismissedTaskIds(s.dismissedTaskIds)
    setTimelineEndXRaw(s.timelineEndX)
  }, [projectId])

  // ── Persistence (single source of truth) ─────────────────────────────────

  const persist = useCallback((
    nextItems: TimelineElement[],
    nextDismissed: string[],
    endX: number,
  ) => {
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify({
        items: nextItems,
        dismissedTaskIds: nextDismissed,
        timelineEndX: endX,
      }))
    } catch { /* quota exceeded */ }
  }, [projectId])

  // ── Mutations — eager ref updates prevent stale-closure overwrites ────────

  const addItem = useCallback((item: TimelineElement) => {
    const next = [...itemsRef.current, item]
    itemsRef.current = next                         // ← eager
    setItems(next)
    persist(next, dismissedRef.current, endXRef.current)
  }, [persist])

  /** Add multiple items at once; used for auto-population. */
  const batchAddItems = useCallback((newItems: TimelineElement[]) => {
    if (newItems.length === 0) return
    const next = [...itemsRef.current, ...newItems]
    itemsRef.current = next                         // ← eager
    setItems(next)
    persist(next, dismissedRef.current, endXRef.current)
  }, [persist])

  const updateItem = useCallback((id: string, patch: Partial<TimelineElement>) => {
    const next = itemsRef.current.map(i =>
      i.id === id ? { ...i, ...patch } as TimelineElement : i,
    )
    itemsRef.current = next                         // ← eager
    setItems(next)
    persist(next, dismissedRef.current, endXRef.current)
  }, [persist])

  const removeItem = useCallback((id: string) => {
    const next = itemsRef.current.filter(i => i.id !== id)
    itemsRef.current = next                         // ← eager
    setItems(next)
    persist(next, dismissedRef.current, endXRef.current)
  }, [persist])

  /**
   * Remove a TASK item from the canvas and record it as dismissed.
   * Dismissed tasks are not auto-re-added on subsequent loads.
   */
  const dismissTask = useCallback((taskId: string) => {
    const nextItems = itemsRef.current.filter(
      i => !(isTask(i) && (i as TaskItem).taskId === taskId),
    )
    const nextDismissed = dismissedRef.current.includes(taskId)
      ? dismissedRef.current
      : [...dismissedRef.current, taskId]
    itemsRef.current     = nextItems               // ← eager
    dismissedRef.current = nextDismissed           // ← eager
    setItems(nextItems)
    setDismissedTaskIds(nextDismissed)
    persist(nextItems, nextDismissed, endXRef.current)
  }, [persist])

  /** Remove all canvas items but keep dismissed list and arrow length. */
  const clearAll = useCallback(() => {
    itemsRef.current = []                          // ← eager
    setItems([])
    persist([], dismissedRef.current, endXRef.current)
  }, [persist])

  /**
   * Full reset: wipe items, dismissed list, and arrow length.
   * After this the caller should immediately re-populate from project tasks.
   */
  const resetToDefault = useCallback(() => {
    itemsRef.current     = []                      // ← eager
    dismissedRef.current = []                      // ← eager
    endXRef.current      = DEFAULT_TIMELINE_END_X  // ← eager
    setItems([])
    setDismissedTaskIds([])
    setTimelineEndXRaw(DEFAULT_TIMELINE_END_X)
    persist([], [], DEFAULT_TIMELINE_END_X)
  }, [persist])

  /** Update the arrow end position. */
  const setTimelineEndX = useCallback((endX: number) => {
    endXRef.current = endX                         // ← eager
    setTimelineEndXRaw(endX)
    persist(itemsRef.current, dismissedRef.current, endX)
  }, [persist])

  // ── Queries (always read from refs — safe without deps) ──────────────────

  const hasTask = useCallback((taskId: string): boolean =>
    itemsRef.current.some(i => isTask(i) && (i as TaskItem).taskId === taskId),
  [])

  const isDismissed = useCallback((taskId: string): boolean =>
    dismissedRef.current.includes(taskId),
  [])

  const taskItems = items.filter(isTask) as TaskItem[]

  return {
    items, taskItems, timelineEndX,
    addItem, batchAddItems, updateItem, removeItem, dismissTask, clearAll, resetToDefault,
    setTimelineEndX, hasTask, isDismissed,
  }
}
