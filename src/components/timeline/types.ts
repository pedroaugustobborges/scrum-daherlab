// ================================================
// TIMELINE TYPES
// ================================================

export type ToolType = 'select' | 'text' | 'rect' | 'circle' | 'diamond'
export type ShapeType = 'rect' | 'circle' | 'diamond'
export type TaskPosition = 'above' | 'below'

// ---- Base ----

export interface BaseItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

// ---- Item Variants ----

export interface TaskItem extends BaseItem {
  type: 'task'
  taskId: string
  title: string
  description: string
  status: string
  priority: string
  date: string | null
  position: TaskPosition
}

export interface TextItem extends BaseItem {
  type: 'text'
  content: string
  fontSize: number
  color: string
  bold: boolean
}

export interface ShapeItem extends BaseItem {
  type: ShapeType
  strokeColor: string
  fillColor: string
  label: string
}

export type TimelineElement = TaskItem | TextItem | ShapeItem

// ---- Discriminators ----

export const isTask  = (i: TimelineElement): i is TaskItem  => i.type === 'task'
export const isText  = (i: TimelineElement): i is TextItem  => i.type === 'text'
export const isShape = (i: TimelineElement): i is ShapeItem =>
  i.type === 'rect' || i.type === 'circle' || i.type === 'diamond'

// ---- Canvas Constants ----

export const CANVAS_WIDTH          = 4000
export const CANVAS_HEIGHT         = 860
export const TIMELINE_Y            = 420
export const TIMELINE_HEIGHT       = 26
export const TIMELINE_START_X      = 60
export const DEFAULT_TIMELINE_END_X = 500    // fallback when project has no tasks
export const DOT_RADIUS            = 9
export const TASK_W                = 210
export const TASK_H                = 130
export const TASK_SPACING_X        = 270
export const MIN_ITEM_W            = 120
export const MIN_ITEM_H            = 80

// ---- Status / Priority palettes (shared) ----

export const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'todo':        { color: '#6b7280', bg: '#f9fafb', label: 'A Fazer'      },
  'in-progress': { color: '#f59e0b', bg: '#fffbeb', label: 'Em Progresso' },
  'review':      { color: '#8b5cf6', bg: '#f5f3ff', label: 'Em Revisão'   },
  'done':        { color: '#10b981', bg: '#ecfdf5', label: 'Concluído'    },
  'blocked':     { color: '#ef4444', bg: '#fef2f2', label: 'Bloqueado'    },
}

export const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  'low':    { color: '#6b7280', label: 'Baixa'   },
  'medium': { color: '#f59e0b', label: 'Média'   },
  'high':   { color: '#ef4444', label: 'Alta'    },
  'urgent': { color: '#dc2626', label: 'Urgente' },
}

export const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#1f2937',
]
