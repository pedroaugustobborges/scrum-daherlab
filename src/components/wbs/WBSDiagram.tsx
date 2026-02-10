import { useState, useCallback, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Slider,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Download,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material'
import { useTaskHierarchy } from '@/hooks/useTaskHierarchy'
import { useWBSData } from '@/hooks/useWBSData'
import type { WBSNode as WBSNodeType } from '@/types/hybrid'
import WBSNode from './WBSNode'

interface WBSDiagramProps {
  projectId: string
}

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

export default function WBSDiagram({ projectId }: WBSDiagramProps) {
  const { data: tasks = [], isLoading } = useTaskHierarchy(projectId)
  const { wbsTree, totalNodes, maxDepth } = useWBSData(tasks)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM))
    }
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  const handleExport = async () => {
    // TODO: Implement export to PNG/PDF
    console.log('Export WBS')
  }

  // Render WBS tree recursively
  const renderTree = (node: WBSNodeType, level = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0

    return (
      <Box
        key={node.id}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Node */}
        <WBSNode
          node={node}
          isSelected={selectedId === node.id}
          onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
        />

        {/* Connector line down */}
        {hasChildren && (
          <Box
            sx={{
              width: 2,
              height: 20,
              bgcolor: 'divider',
            }}
          />
        )}

        {/* Children container */}
        {hasChildren && (
          <Box sx={{ display: 'flex', gap: 3, position: 'relative' }}>
            {/* Horizontal connector line */}
            {node.children!.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: `calc(100% - 180px)`,
                  height: 2,
                  bgcolor: 'divider',
                }}
              />
            )}

            {/* Child nodes */}
            {node.children!.map((child) => (
              <Box key={child.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Vertical connector from horizontal line */}
                <Box
                  sx={{
                    width: 2,
                    height: 20,
                    bgcolor: 'divider',
                    mb: 0,
                  }}
                />
                {renderTree(child, level + 1)}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!wbsTree) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Nenhuma estrutura WBS disponível
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adicione tarefas ao projeto para visualizar o WBS
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'grey.50',
      }}
    >
      {/* Toolbar */}
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          mb: 2,
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          WBS - Estrutura Analítica do Projeto
        </Typography>

        <Chip
          label={`${totalNodes} elementos`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={`${maxDepth + 1} níveis`}
          size="small"
          variant="outlined"
        />

        <Box sx={{ flex: 1 }} />

        {/* Zoom Controls */}
        <Tooltip title="Diminuir zoom">
          <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}>
            <ZoomOut />
          </IconButton>
        </Tooltip>

        <Slider
          value={zoom}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          onChange={(_, value) => setZoom(value as number)}
          sx={{ width: 100 }}
        />

        <Tooltip title="Aumentar zoom">
          <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}>
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ minWidth: 40 }}>
          {Math.round(zoom * 100)}%
        </Typography>

        <Tooltip title="Centralizar">
          <IconButton size="small" onClick={handleResetView}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>

        <Tooltip title="Tela cheia">
          <IconButton size="small" onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Exportar">
          <IconButton size="small" onClick={handleExport}>
            <Download />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Diagram Area */}
      <Paper
        sx={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: 2,
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            p: 4,
          }}
        >
          {renderTree(wbsTree)}
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2, px: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">Resumo/Fase</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 16,
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">Tarefa</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 16,
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: 'error.main',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">Caminho Crítico</Typography>
        </Box>
      </Box>
    </Box>
  )
}
