import {
  useRef, useState, useEffect, useCallback,
  forwardRef, useImperativeHandle,
} from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, IconButton, Tooltip,
} from '@mui/material'
import { Close as CloseIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { useTheme } from '@/contexts/ThemeContext'
import type { TimelineElement, TaskItem, TextItem, ShapeItem, ToolType, ShapeType } from './types'
import {
  isTask, isText, isShape,
  STATUS_CONFIG,
  CANVAS_WIDTH, CANVAS_HEIGHT,
  TIMELINE_Y, TIMELINE_HEIGHT, TIMELINE_START_X,
  DOT_RADIUS, MIN_ITEM_W, MIN_ITEM_H,
} from './types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

// ─── Internal state types ────────────────────────────────────────────────────

interface DragState {
  id: string; offsetX: number; offsetY: number
  currentX: number; currentY: number
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

interface ResizeState {
  id: string; handle: ResizeHandle
  startMouseX: number; startMouseY: number
  origX: number; origY: number; origW: number; origH: number
}

interface ResizeOverride { id: string; x: number; y: number; w: number; h: number }

interface ArrowDragState { startMouseX: number; origEndX: number }

interface CreateState {
  tool: ShapeType; startX: number; startY: number; currentX: number; currentY: number
}

interface TextDialogState {
  open: boolean; placeX: number; placeY: number; content: string; editingId: string | null
}

// ─── Resize handle sub-component ────────────────────────────────────────────

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
}

function ResizeHandle({ handle, onMouseDown }: {
  handle: ResizeHandle
  onMouseDown: (e: React.MouseEvent) => void
}) {
  const { isDarkMode } = useTheme()
  const pos: Record<ResizeHandle, React.CSSProperties> = {
    nw: { top: -5, left: -5 },
    ne: { top: -5, right: -5 },
    sw: { bottom: -5, left: -5 },
    se: { bottom: -5, right: -5 },
  }
  return (
    <Box
      component="span"
      data-no-export="true"
      onMouseDown={onMouseDown}
      sx={{
        position: 'absolute',
        width: 10, height: 10,
        background: isDarkMode ? '#1e293b' : 'white',
        border: '2px solid #6366f1',
        borderRadius: '2px',
        cursor: HANDLE_CURSORS[handle],
        zIndex: 1001,
        ...pos[handle],
        '&:hover': { background: isDarkMode ? '#334155' : '#ede9fe' },
      }}
    />
  )
}

// ─── Delete button sub-component ─────────────────────────────────────────────

function DeleteBtn({ onDelete, onMouseDown }: {
  onDelete: () => void
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <Tooltip title="Remover da linha do tempo" arrow>
      <IconButton
        size="small"
        className="item-delete"
        onClick={e => { e.stopPropagation(); onDelete() }}
        onMouseDown={onMouseDown}
        sx={{
          position: 'absolute', top: -11, right: -11,
          opacity: 0, transition: 'opacity 0.15s',
          background: '#ef4444', color: 'white',
          width: 22, height: 22,
          '&:hover': { background: '#dc2626' },
        }}
      >
        <CloseIcon sx={{ fontSize: 12 }} />
      </IconButton>
    </Tooltip>
  )
}

// ─── Public handle (for parent to call exportPng) ────────────────────────────

export interface TimelineCanvasHandle {
  exportPng: () => Promise<void>
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  items: TimelineElement[]
  timelineEndX: number
  activeTool: ToolType
  activeColor: string
  onAddItem: (item: TimelineElement) => void
  onUpdateItem: (id: string, patch: Partial<TimelineElement>) => void
  onRemoveItem: (id: string) => void
  onUpdateTimelineEndX: (endX: number) => void
  onToolChange: (tool: ToolType) => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TimelineCanvas = forwardRef<TimelineCanvasHandle, Props>(function TimelineCanvas(
  { items, timelineEndX, activeTool, activeColor, onAddItem, onUpdateItem, onRemoveItem, onUpdateTimelineEndX, onToolChange },
  ref,
) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const surfaceRef      = useRef<HTMLDivElement>(null)

  // Interaction states
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [dragState, setDragState]         = useState<DragState | null>(null)
  const [resizeState, setResizeState]     = useState<ResizeState | null>(null)
  const [resizeOverride, setResizeOverride] = useState<ResizeOverride | null>(null)
  const [arrowDrag, setArrowDrag]         = useState<ArrowDragState | null>(null)
  const [localEndX, setLocalEndX]         = useState(timelineEndX)
  const [createState, setCreateState]     = useState<CreateState | null>(null)
  const [textDialog, setTextDialog]       = useState<TextDialogState>({
    open: false, placeX: 0, placeY: 0, content: '', editingId: null,
  })

  // Keep localEndX in sync when store changes (e.g., switching projects)
  useEffect(() => { setLocalEndX(timelineEndX) }, [timelineEndX])

  // ── Export via forwardRef ────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    exportPng: async () => {
      const el = surfaceRef.current
      if (!el) return
      const toastId = toast.loading('Gerando PNG…')

      // Temporarily hide UI-only elements (resize handles, arrow drag handle)
      const hidden = el.querySelectorAll<HTMLElement>('[data-no-export]')
      hidden.forEach(h => { h.style.visibility = 'hidden' })

      try {
        const { default: html2canvas } = await import('html2canvas')
        const padding = 60
        const contentMaxX = localEndX + padding
        const fullCanvas = await html2canvas(el, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          useCORS: true,
          logging: false,
          width: contentMaxX,
          windowWidth: contentMaxX,
        })
        // Crop to content width
        const crop = document.createElement('canvas')
        crop.width  = contentMaxX * 1.5
        crop.height = fullCanvas.height
        const ctx = crop.getContext('2d')!
        ctx.drawImage(fullCanvas, 0, 0)

        const link = document.createElement('a')
        link.download = 'linha-do-tempo.png'
        link.href = crop.toDataURL('image/png')
        link.click()
        toast.success('PNG exportado!', { id: toastId })
      } catch {
        toast.error('Erro ao exportar', { id: toastId })
      } finally {
        // Always restore visibility
        hidden.forEach(h => { h.style.visibility = '' })
      }
    },
  }))

  // ── Mouse position relative to scrollable canvas surface ────────────────
  const getPos = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return { x: e.clientX - rect.left + el.scrollLeft, y: e.clientY - rect.top + el.scrollTop }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        onRemoveItem(selectedId); setSelectedId(null); return
      }
      if (e.key === 'Escape') { setSelectedId(null); setCreateState(null) }
      if (e.key === 's') onToolChange('select')
      if (e.key === 't') onToolChange('text')
      if (e.key === 'r') onToolChange('rect')
      if (e.key === 'c') onToolChange('circle')
      if (e.key === 'd') onToolChange('diamond')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, onRemoveItem, onToolChange])

  // ── Canvas background click (deselect / start create) ────────────────────
  const handleCanvasBgDown = (e: React.MouseEvent) => {
    setSelectedId(null)
    const pos = getPos(e)
    if (activeTool === 'select') return
    if (activeTool === 'text') {
      setTextDialog({ open: true, placeX: pos.x, placeY: pos.y, content: '', editingId: null })
      return
    }
    setCreateState({ tool: activeTool as ShapeType, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }

  // ── Item drag ─────────────────────────────────────────────────────────────
  const handleItemDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    setSelectedId(id)
    const pos = getPos(e)
    const item = items.find(i => i.id === id)
    if (!item) return
    setDragState({ id, offsetX: pos.x - item.x, offsetY: pos.y - item.y, currentX: item.x, currentY: item.y })
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  const handleResizeDown = (e: React.MouseEvent, id: string, handle: ResizeHandle) => {
    e.preventDefault(); e.stopPropagation()
    const pos = getPos(e)
    const item = items.find(i => i.id === id)
    if (!item) return
    setResizeState({
      id, handle,
      startMouseX: pos.x, startMouseY: pos.y,
      origX: item.x, origY: item.y, origW: item.width, origH: item.height,
    })
  }

  // ── Arrow tip drag ────────────────────────────────────────────────────────
  const handleArrowTipDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setArrowDrag({ startMouseX: getPos(e).x, origEndX: localEndX })
  }

  // ── Unified mouse move ────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState && !resizeState && !arrowDrag && !createState) return
    e.preventDefault()
    const pos = getPos(e)

    if (dragState) {
      setDragState(prev => prev
        ? { ...prev, currentX: Math.max(0, pos.x - prev.offsetX), currentY: Math.max(0, pos.y - prev.offsetY) }
        : null)
    }

    if (resizeState) {
      const dx = pos.x - resizeState.startMouseX
      const dy = pos.y - resizeState.startMouseY
      const { origX, origY, origW, origH, handle } = resizeState

      let nx = origX, ny = origY
      let nw = Math.max(MIN_ITEM_W, origW + (handle === 'ne' || handle === 'se' ? dx : -dx))
      let nh = Math.max(MIN_ITEM_H, origH + (handle === 'sw' || handle === 'se' ? dy : -dy))

      if (handle === 'nw' || handle === 'sw') nx = origX + origW - nw
      if (handle === 'nw' || handle === 'ne') ny = origY + origH - nh

      setResizeOverride({ id: resizeState.id, x: nx, y: ny, w: nw, h: nh })
    }

    if (arrowDrag) {
      const newEndX = Math.max(TIMELINE_START_X + 300, arrowDrag.origEndX + (pos.x - arrowDrag.startMouseX))
      setLocalEndX(newEndX)
    }

    if (createState) {
      setCreateState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null)
    }
  }

  // ── Unified mouse up ──────────────────────────────────────────────────────
  const handleMouseUp = () => {
    if (dragState) {
      onUpdateItem(dragState.id, { x: dragState.currentX, y: dragState.currentY })
      setDragState(null)
    }
    if (resizeState && resizeOverride) {
      onUpdateItem(resizeState.id, { x: resizeOverride.x, y: resizeOverride.y, width: resizeOverride.w, height: resizeOverride.h })
      setResizeState(null); setResizeOverride(null)
    }
    if (arrowDrag) {
      onUpdateTimelineEndX(localEndX)
      setArrowDrag(null)
    }
    if (createState) {
      const { tool, startX, startY, currentX, currentY } = createState
      const x = Math.min(startX, currentX), y = Math.min(startY, currentY)
      const w = Math.abs(currentX - startX), h = Math.abs(currentY - startY)
      if (w > 20 && h > 20) {
        onAddItem({
          id: uid(), type: tool, x, y, width: w, height: h,
          strokeColor: activeColor, fillColor: activeColor + '28', label: '', zIndex: items.length + 10,
        } as ShapeItem)
      }
      setCreateState(null)
      onToolChange('select')
    }
  }

  // ── Text dialog handlers ──────────────────────────────────────────────────
  const closeTextDialog = () => setTextDialog(prev => ({ ...prev, open: false, content: '' }))

  const handleTextConfirm = () => {
    const content = textDialog.content.trim()
    if (!content) { closeTextDialog(); return }
    if (textDialog.editingId) {
      onUpdateItem(textDialog.editingId, { content })
    } else {
      onAddItem({
        id: uid(), type: 'text',
        x: textDialog.placeX - 60, y: textDialog.placeY - 20,
        width: 200, height: 50,
        content, fontSize: 16, color: activeColor, bold: false,
        zIndex: items.length + 10,
      } as TextItem)
      onToolChange('select')
    }
    closeTextDialog()
  }

  // ── Computed position/size (accounts for drag/resize overrides) ───────────
  const rx = (i: TimelineElement) =>
    dragState?.id === i.id ? dragState.currentX : resizeOverride?.id === i.id ? resizeOverride.x : i.x
  const ry = (i: TimelineElement) =>
    dragState?.id === i.id ? dragState.currentY : resizeOverride?.id === i.id ? resizeOverride.y : i.y
  const rw = (i: TimelineElement) => resizeOverride?.id === i.id ? resizeOverride.w : i.width
  const rh = (i: TimelineElement) => resizeOverride?.id === i.id ? resizeOverride.h : i.height

  // ── Cursor ────────────────────────────────────────────────────────────────
  const cursor = dragState || resizeState ? 'grabbing'
    : arrowDrag ? 'ew-resize'
    : activeTool === 'text' ? 'text'
    : activeTool !== 'select' ? 'crosshair'
    : 'default'

  const { isDarkMode } = useTheme()

  const taskItems  = items.filter(isTask)  as TaskItem[]
  const textItems  = items.filter(isText)  as TextItem[]
  const shapeItems = items.filter(isShape) as ShapeItem[]

  // ── Create preview rect ───────────────────────────────────────────────────
  const preview = createState ? {
    x: Math.min(createState.startX, createState.currentX),
    y: Math.min(createState.startY, createState.currentY),
    w: Math.abs(createState.currentX - createState.startX),
    h: Math.abs(createState.currentY - createState.startY),
  } : null

  // ── Shared resize handles renderer ────────────────────────────────────────
  const renderResizeHandles = (id: string) => (
    <>
      {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map(h => (
        <ResizeHandle
          key={h}
          handle={h}
          onMouseDown={e => handleResizeDown(e, id, h)}
        />
      ))}
    </>
  )

  // ── Timeline bar display end X ────────────────────────────────────────────
  const displayEndX = localEndX  // updates live during arrow drag

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        overflow: 'auto',
        background: isDarkMode
          ? 'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)'
          : 'radial-gradient(circle, rgba(99,102,241,0.055) 1px, transparent 1px)',
        backgroundColor: isDarkMode ? '#0f172a' : undefined,
        backgroundSize: '32px 32px',
        position: 'relative',
      }}
    >
      {/* ── Canvas Surface ─────────────────────────────────────────────────── */}
      <Box
        ref={surfaceRef}
        sx={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, position: 'relative', cursor, userSelect: 'none' }}
        onMouseDown={handleCanvasBgDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        {/* ── TIMELINE BAR (CSS — renders cleanly in html2canvas) ──────────── */}
        {/* Bar body */}
        <Box sx={{
          position: 'absolute',
          left: TIMELINE_START_X,
          top: TIMELINE_Y - TIMELINE_HEIGHT / 2,
          width: displayEndX - TIMELINE_START_X - 42,
          height: TIMELINE_HEIGHT,
          borderRadius: `${TIMELINE_HEIGHT / 2}px 0 0 ${TIMELINE_HEIGHT / 2}px`,
          background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 50%, #10b981 100%)',
          boxShadow: '0 6px 24px rgba(99,102,241,0.22)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />
        {/* Arrow tip (CSS triangle) */}
        <Box sx={{
          position: 'absolute',
          left: displayEndX - 43,
          top: TIMELINE_Y - 22,
          width: 0, height: 0,
          borderTop: '22px solid transparent',
          borderBottom: '22px solid transparent',
          borderLeft: '44px solid #10b981',
          zIndex: 1,
          pointerEvents: 'none',
        }} />
        {/* Start cap */}
        <Box sx={{
          position: 'absolute',
          left: TIMELINE_START_X - TIMELINE_HEIGHT / 2 - 2,
          top: TIMELINE_Y - TIMELINE_HEIGHT / 2 - 2,
          width: TIMELINE_HEIGHT + 4,
          height: TIMELINE_HEIGHT + 4,
          borderRadius: '50%',
          background: '#6366f1',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* ── Arrow tip drag handle (hidden on export) ──────────────────────── */}
        <Tooltip title="Arraste para ajustar o comprimento da seta" arrow placement="top">
          <Box
            data-no-export="true"
            onMouseDown={handleArrowTipDown}
            sx={{
              position: 'absolute',
              left: displayEndX - 14,
              top: TIMELINE_Y - 14,
              width: 28, height: 28,
              borderRadius: '50%',
              background: arrowDrag
                ? (isDarkMode ? '#064e3b' : '#ecfdf5')
                : (isDarkMode ? '#1e293b' : 'white'),
              border: `2.5px solid ${arrowDrag ? '#059669' : '#10b981'}`,
              cursor: 'ew-resize',
              zIndex: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isDarkMode ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.14)',
              transition: 'background 0.1s, transform 0.1s',
              '&:hover': {
                background: isDarkMode ? '#064e3b' : '#ecfdf5',
                transform: 'scale(1.15)',
              },
            }}
          >
            <SwapHorizIcon sx={{ fontSize: 14, color: '#10b981', pointerEvents: 'none' }} />
          </Box>
        </Tooltip>

        {/* ── TASK CARDS ─────────────────────────────────────────────────────── */}
        {taskItems.map(task => {
          const x = rx(task); const y = ry(task)
          const w = rw(task); const h = rh(task)
          const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo
          const sel = selectedId === task.id
          const dragging = dragState?.id === task.id || resizeState?.id === task.id
          const cardBg = isDarkMode ? `${sc.color}18` : sc.bg
          const titleColor = isDarkMode ? '#f1f5f9' : '#1f2937'
          const descColor = isDarkMode ? '#94a3b8' : '#6b7280'

          return (
            <Box
              key={task.id}
              onMouseDown={e => handleItemDown(e, task.id)}
              sx={{
                position: 'absolute', left: x, top: y,
                width: w, height: h,
                background: cardBg,
                border: `2px solid ${sel ? '#6366f1' : sc.color + (isDarkMode ? '60' : '80')}`,
                borderRadius: '14px',
                p: 1.5,
                cursor: dragging ? 'grabbing' : 'grab',
                zIndex: sel ? 200 : task.zIndex,
                boxShadow: sel
                  ? '0 0 0 3px rgba(99,102,241,0.25), 0 8px 28px rgba(0,0,0,0.14)'
                  : isDarkMode ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                '&:hover': {
                  boxShadow: isDarkMode ? '0 6px 20px rgba(0,0,0,0.45)' : '0 6px 20px rgba(0,0,0,0.12)',
                },
                '&:hover .item-delete': { opacity: 1 },
                overflow: 'hidden',
              }}
            >
              {/* Top accent bar */}
              <Box sx={{ position: 'absolute', top: 0, left: 8, right: 8, height: 3, background: sc.color, borderRadius: '4px 4px 0 0' }} />

              <DeleteBtn
                onDelete={() => { onRemoveItem(task.id); setSelectedId(null) }}
                onMouseDown={e => e.stopPropagation()}
              />
              {sel && renderResizeHandles(task.id)}

              <Box component="span" sx={{
                display: 'inline-block', background: sc.color, color: 'white',
                px: 0.75, py: 0.2, borderRadius: '5px', fontSize: '9px', fontWeight: 700, letterSpacing: 0.3, mb: 0.75,
              }}>
                {sc.label}
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: '12px', lineHeight: 1.35, color: titleColor, mb: task.description ? 0.5 : 0, overflow: 'hidden' }}>
                {task.title}
              </Typography>

              {task.description && (
                <Typography sx={{ fontSize: '10.5px', color: descColor, lineHeight: 1.4, overflow: 'auto', maxHeight: h - 90 }}>
                  {task.description}
                </Typography>
              )}

              {task.date && (
                <Typography sx={{ display: 'block', position: 'absolute', bottom: 8, left: 12, fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>
                  {new Date(task.date).toLocaleDateString('pt-BR')}
                </Typography>
              )}
            </Box>
          )
        })}

        {/* ── SHAPE ITEMS ─────────────────────────────────────────────────────── */}
        {shapeItems.map(shape => {
          const x = rx(shape); const y = ry(shape)
          const w = rw(shape); const h = rh(shape)
          const sel = selectedId === shape.id
          const dragging = dragState?.id === shape.id || resizeState?.id === shape.id

          const base = {
            position: 'absolute' as const,
            left: x, top: y, width: w, height: h,
            cursor: dragging ? 'grabbing' : ('grab' as const),
            zIndex: sel ? 200 : shape.zIndex,
            '&:hover .item-delete': { opacity: 1 },
            overflow: 'visible' as const,
          }

          if (shape.type === 'circle') return (
            <Box key={shape.id} onMouseDown={e => handleItemDown(e, shape.id)} sx={{
              ...base,
              borderRadius: '50%',
              border: `2px solid ${sel ? '#6366f1' : shape.strokeColor}`,
              background: shape.fillColor,
              boxShadow: sel ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {shape.label && <Typography sx={{ fontSize: 12, fontWeight: 700, color: shape.strokeColor }}>{shape.label}</Typography>}
              <DeleteBtn onDelete={() => { onRemoveItem(shape.id); setSelectedId(null) }} onMouseDown={e => e.stopPropagation()} />
              {sel && renderResizeHandles(shape.id)}
            </Box>
          )

          if (shape.type === 'diamond') return (
            <Box key={shape.id} onMouseDown={e => handleItemDown(e, shape.id)} sx={{
              ...base,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <polygon
                  points={`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`}
                  fill={shape.fillColor} stroke={sel ? '#6366f1' : shape.strokeColor} strokeWidth={2}
                />
              </svg>
              {shape.label && <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 700, color: shape.strokeColor }}>{shape.label}</Typography>}
              <DeleteBtn onDelete={() => { onRemoveItem(shape.id); setSelectedId(null) }} onMouseDown={e => e.stopPropagation()} />
              {sel && renderResizeHandles(shape.id)}
            </Box>
          )

          // rect
          return (
            <Box key={shape.id} onMouseDown={e => handleItemDown(e, shape.id)} sx={{
              ...base,
              border: `2px solid ${sel ? '#6366f1' : shape.strokeColor}`,
              borderRadius: '10px',
              background: shape.fillColor,
              boxShadow: sel ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {shape.label && <Typography sx={{ fontSize: 12, fontWeight: 700, color: shape.strokeColor }}>{shape.label}</Typography>}
              <DeleteBtn onDelete={() => { onRemoveItem(shape.id); setSelectedId(null) }} onMouseDown={e => e.stopPropagation()} />
              {sel && renderResizeHandles(shape.id)}
            </Box>
          )
        })}

        {/* ── TEXT ITEMS ──────────────────────────────────────────────────────── */}
        {textItems.map(textItem => {
          const x = rx(textItem); const y = ry(textItem)
          const w = rw(textItem); const h = rh(textItem)
          const sel = selectedId === textItem.id
          const dragging = dragState?.id === textItem.id

          return (
            <Box
              key={textItem.id}
              onMouseDown={e => handleItemDown(e, textItem.id)}
              onDoubleClick={e => {
                e.stopPropagation()
                setTextDialog({ open: true, placeX: 0, placeY: 0, content: textItem.content, editingId: textItem.id })
              }}
              sx={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                cursor: dragging ? 'grabbing' : 'grab',
                zIndex: sel ? 200 : textItem.zIndex,
                border: `1.5px dashed ${sel ? '#6366f1' : 'transparent'}`,
                borderRadius: '6px', p: 0.5,
                '&:hover': { border: '1.5px dashed rgba(99,102,241,0.35)' },
                '&:hover .item-delete': { opacity: 1 },
                overflow: 'visible',
              }}
            >
              <Typography sx={{
                fontSize: textItem.fontSize, fontWeight: textItem.bold ? 700 : 400,
                color: textItem.color, whiteSpace: 'pre-wrap', lineHeight: 1.4, pointerEvents: 'none',
              }}>
                {textItem.content}
              </Typography>
              <DeleteBtn onDelete={() => { onRemoveItem(textItem.id); setSelectedId(null) }} onMouseDown={e => e.stopPropagation()} />
              {sel && renderResizeHandles(textItem.id)}
            </Box>
          )
        })}

        {/* ── SVG OVERLAY — rendered LAST so dots/lines are always on top ──────
            zIndex 400 sits above all task cards (max 200 when selected) but
            below the arrow drag handle (500). SVG is pointer-events:none so
            it never blocks clicks on cards or resize handles.               */}
        <svg
          style={{
            position: 'absolute', inset: 0,
            width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
            pointerEvents: 'none',
            zIndex: 400,
            overflow: 'visible',
          }}
        >
          {/* Task dots + dashed connector lines */}
          {taskItems.map(task => {
            const x = rx(task); const y = ry(task)
            const w = rw(task); const h = rh(task)
            const cx = x + w / 2
            const sc = STATUS_CONFIG[task.status]?.color ?? '#6b7280'
            const above = task.position === 'above'
            const dotFill = isDarkMode ? '#0f172a' : 'white'
            return (
              <g key={task.id}>
                <line
                  x1={cx} y1={above ? y + h : y}
                  x2={cx} y2={above ? TIMELINE_Y - DOT_RADIUS : TIMELINE_Y + DOT_RADIUS}
                  stroke={sc} strokeWidth={1.5} strokeDasharray="5,4" strokeOpacity={0.65}
                />
                <circle cx={cx} cy={TIMELINE_Y} r={DOT_RADIUS}
                  fill={dotFill} stroke={sc} strokeWidth={3} />
              </g>
            )
          })}

          {/* Shape draw-preview */}
          {preview && preview.w > 4 && preview.h > 4 && (() => {
            const { x, y, w, h } = preview
            const dash = '6,4'
            const fill = activeColor + '22'
            if (createState?.tool === 'circle')
              return <ellipse cx={x+w/2} cy={y+h/2} rx={w/2} ry={h/2} fill={fill} stroke={activeColor} strokeWidth={2} strokeDasharray={dash} />
            if (createState?.tool === 'diamond') {
              const cx2=x+w/2, cy2=y+h/2
              return <polygon points={`${cx2},${y} ${x+w},${cy2} ${cx2},${y+h} ${x},${cy2}`} fill={fill} stroke={activeColor} strokeWidth={2} strokeDasharray={dash} />
            }
            return <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={activeColor} strokeWidth={2} strokeDasharray={dash} />
          })()}
        </svg>
      </Box>

      {/* ── Text Dialog ──────────────────────────────────────────────────────── */}
      <Dialog
        open={textDialog.open}
        onClose={closeTextDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
          {textDialog.editingId ? 'Editar Texto' : 'Adicionar Texto'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            autoFocus fullWidth multiline rows={3}
            placeholder="Digite o texto…"
            value={textDialog.content}
            onChange={e => setTextDialog(prev => ({ ...prev, content: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextConfirm() } }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& fieldset': { borderColor: 'rgba(99,102,241,0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
            Enter para confirmar · Shift+Enter para nova linha · Duplo clique para editar
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeTextDialog} sx={{ borderRadius: '10px', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleTextConfirm}
            variant="contained"
            sx={{
              borderRadius: '10px', textTransform: 'none', fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #4f52e0 0%, #7c4fef 100%)' },
            }}
          >
            {textDialog.editingId ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
})

export default TimelineCanvas
