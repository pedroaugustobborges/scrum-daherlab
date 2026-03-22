import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  alpha,
  Skeleton,
  useTheme,
} from '@mui/material'
import {
  Add,
  ExpandMore,
  Assignment,
  Flag,
  Person,
  Delete,
  CheckCircle,
  Functions,
  Timer,
  ViewKanban,
  ViewList,
  EmojiEvents,
  Visibility,
  Refresh,
  LightbulbOutlined,
  PictureAsPdf,
} from '@mui/icons-material'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import Modal from './Modal'
import CreateUserStoryModal from './CreateUserStoryModal'
import CreateSubtaskModal from './CreateSubtaskModal'
import KanbanBoard from './KanbanBoard'
import BurndownChart from './BurndownChart'
import VelocityChart from './VelocityChart'
import RetrospectiveBoard from './RetrospectiveBoard'
import ReviewMeetingForm from './ReviewMeetingForm'
import AdaModal from './AdaModal'
import { supabase } from '@/lib/supabase'

interface SprintDetailsModalProps {
  open: boolean
  onClose: () => void
  sprint: {
    id: string
    name: string
    project_id: string
    team_id: string
    start_date: string
    end_date: string
    goal?: string
    status?: string
    velocity?: number
  }
}

interface UserStory {
  id: string
  title: string
  description: string
  status: string
  priority: string
  story_points: number
  assigned_to: string
  profiles?: { full_name: string }
  assigned_to_profile?: { full_name: string }
  subtasks?: Subtask[]
}

interface Subtask {
  id: string
  title: string
  description: string
  status: string
  estimated_hours: number
  assigned_to: string
  profiles?: { full_name: string }
  assigned_to_profile?: { full_name: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'A Fazer', color: '#6b7280' },
  'in-progress': { label: 'Em Progresso', color: '#f59e0b' },
  review: { label: 'Em Revisão', color: '#8b5cf6' },
  done: { label: 'Concluído', color: '#10b981' },
  blocked: { label: 'Bloqueado', color: '#ef4444' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#6b7280' },
  medium: { label: 'Média', color: '#f59e0b' },
  high: { label: 'Alta', color: '#ef4444' },
  urgent: { label: 'Urgente', color: '#dc2626' },
}

export default function SprintDetailsModal({ open, onClose, sprint }: SprintDetailsModalProps) {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(true)
  const [stories, setStories] = useState<UserStory[]>([])
  const [createStoryOpen, setCreateStoryOpen] = useState(false)
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [activeTab, setActiveTab] = useState(0)
  const [aiTip, setAiTip] = useState<string>('')
  const [aiTipLoading, setAiTipLoading] = useState(false)
  const [aiTipError, setAiTipError] = useState(false)
  const [adaModalOpen, setAdaModalOpen] = useState(false)
  const [sprintDetails, setSprintDetails] = useState<{
    goal?: string
    status?: string
    velocity?: number
  }>({ goal: sprint.goal, status: sprint.status, velocity: sprint.velocity })
  const [averageVelocity, setAverageVelocity] = useState<number>(0)

  useEffect(() => {
    if (open) {
      fetchUserStories()
      fetchSprintDetails()
      fetchAverageVelocity()
    }
  }, [open, sprint.id])

  // Generate AI tip when stories are loaded and sprint is not completed
  useEffect(() => {
    if (!loading && stories.length >= 0 && sprintDetails.status !== 'completed' && !aiTip && open) {
      generateAiTip()
    }
  }, [loading, stories, sprintDetails.status, open])

  const fetchSprintDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('goal, status, velocity')
        .eq('id', sprint.id)
        .single()

      if (error) throw error

      if (data) {
        setSprintDetails({
          goal: data.goal,
          status: data.status,
          velocity: data.velocity,
        })
      }
    } catch (error) {
      console.error('Error fetching sprint details:', error)
    }
  }

  const fetchAverageVelocity = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('velocity')
        .eq('team_id', sprint.team_id)
        .eq('status', 'completed')
        .not('velocity', 'is', null)
        .order('end_date', { ascending: false })
        .limit(5)

      if (error) throw error

      if (data && data.length > 0) {
        const avg = data.reduce((sum, s) => sum + (s.velocity || 0), 0) / data.length
        setAverageVelocity(Math.round(avg))
      }
    } catch (error) {
      console.error('Error fetching average velocity:', error)
    }
  }

  const fetchPreviousSprintActions = async (): Promise<string> => {
    try {
      // Find the previous sprint
      const { data: prevSprint, error: sprintError } = await supabase
        .from('sprints')
        .select('id')
        .eq('team_id', sprint.team_id)
        .lt('end_date', sprint.start_date)
        .order('end_date', { ascending: false })
        .limit(1)
        .single()

      if (sprintError || !prevSprint) return ''

      // Find the retrospective
      const { data: retro, error: retroError } = await supabase
        .from('sprint_retrospectives')
        .select('id')
        .eq('sprint_id', prevSprint.id)
        .single()

      if (retroError || !retro) return ''

      // Get action items
      const { data: actions, error: actionsError } = await supabase
        .from('retrospective_items')
        .select('content')
        .eq('retrospective_id', retro.id)
        .eq('category', 'action_item')
        .limit(3)

      if (actionsError || !actions) return ''

      return actions.map((a) => a.content).join('; ')
    } catch (error) {
      console.error('Error fetching previous sprint actions:', error)
      return ''
    }
  }

  const generateAiTip = useCallback(async () => {
    if (sprintDetails.status === 'completed') return

    setAiTipLoading(true)
    setAiTipError(false)

    try {
      const completedTasks = stories.filter((s) => s.status === 'done').length
      const blockedTasks = stories.filter((s) => s.status === 'blocked').length
      const completedPoints = stories
        .filter((s) => s.status === 'done')
        .reduce((sum, s) => sum + (s.story_points || 0), 0)
      const totalPoints = stories.reduce((sum, s) => sum + (s.story_points || 0), 0)

      // Calculate days remaining
      const endDate = new Date(sprint.end_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

      // Fetch previous sprint actions
      const previousSprintActions = await fetchPreviousSprintActions()

      const response = await supabase.functions.invoke('generate-sprint-tip', {
        body: {
          sprintName: sprint.name,
          sprintGoal: sprintDetails.goal || '',
          totalTasks: stories.length,
          completedTasks,
          totalPoints,
          completedPoints,
          blockedTasks,
          daysRemaining,
          averageVelocity,
          previousSprintActions,
        },
      })

      if (response.error) throw response.error

      if (response.data?.tip) {
        setAiTip(response.data.tip)
      }
    } catch (error) {
      console.error('Error generating AI tip:', error)
      setAiTipError(true)
    } finally {
      setAiTipLoading(false)
    }
  }, [stories, sprint, sprintDetails, averageVelocity])

  const generatePDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 18
    let yPosition = margin

    // Helper to render "agir ágil" text as image using Canvas with custom font
    const renderAgirAgilAsImage = async (): Promise<string | null> => {
      try {
        // Ensure the font is loaded
        await document.fonts.load("bold 48px 'Kozuka Gothic Pro'")

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        const text = 'agir ágil'
        const fontSize = 72

        // Set font and measure text
        ctx.font = `bold ${fontSize}px 'Kozuka Gothic Pro', sans-serif`
        const metrics = ctx.measureText(text)

        // Set canvas size with padding
        const padding = 10
        canvas.width = Math.ceil(metrics.width) + padding * 2
        canvas.height = fontSize + padding * 2

        // Clear and set font again (canvas reset clears font)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = `bold ${fontSize}px 'Kozuka Gothic Pro', sans-serif`
        ctx.fillStyle = 'white'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'

        // Draw text
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        return canvas.toDataURL('image/png')
      } catch (error) {
        console.warn('Could not render agir ágil as image:', error)
        return null
      }
    }

    // Colors
    const primaryColor: [number, number, number] = [99, 102, 241] // #6366f1
    const secondaryColor: [number, number, number] = [139, 92, 246] // #8b5cf6
    const successColor: [number, number, number] = [16, 185, 129] // #10b981
    const warningColor: [number, number, number] = [245, 158, 11] // #f59e0b
    const dangerColor: [number, number, number] = [239, 68, 68] // #ef4444
    const grayColor: [number, number, number] = [107, 114, 128] // #6b7280
    const darkColor: [number, number, number] = [31, 41, 55] // #1f2937
    const lightBgColor: [number, number, number] = [248, 250, 252] // #f8fafc

    // Fetch project name
    let projectName = ''
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', sprint.project_id)
        .single()
      if (projectData) {
        projectName = projectData.name
      }
    } catch (error) {
      console.warn('Could not fetch project name:', error)
    }

    // Fetch retrospective data
    interface RetroItem {
      category: string
      content: string
      votes: number
    }
    let retroItems: RetroItem[] = []
    let retroMoodRating = 0
    try {
      const { data: retroData } = await supabase
        .from('sprint_retrospectives')
        .select('id, mood_rating')
        .eq('sprint_id', sprint.id)
        .single()

      if (retroData) {
        retroMoodRating = retroData.mood_rating || 0
        const { data: itemsData } = await supabase
          .from('retrospective_items')
          .select('category, content, votes')
          .eq('retrospective_id', retroData.id)
          .order('votes', { ascending: false })

        if (itemsData) {
          retroItems = itemsData
        }
      }
    } catch (error) {
      console.warn('Could not fetch retrospective:', error)
    }

    // Helper function to load image with proper aspect ratio
    const loadImageWithDimensions = (url: string): Promise<{ base64: string; width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            resolve({
              base64: canvas.toDataURL('image/png'),
              width: img.width,
              height: img.height,
            })
          } else {
            reject(new Error('Could not get canvas context'))
          }
        }
        img.onerror = reject
        img.src = url
      })
    }

    // Helper to add page footer
    const addFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - 10

      // Footer line
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

      // Timestamp
      const timestamp = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      doc.setTextColor(...grayColor)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Gerado em: ${timestamp}`, margin, footerY)

      // Page number
      doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' })

      // Powered by DaherLab
      doc.setFont('helvetica', 'italic')
      doc.text('Powered by DaherLab', pageWidth - margin, footerY, { align: 'right' })
    }

    // Helper to check if we need a new page
    const checkNewPage = (neededHeight: number): boolean => {
      if (yPosition + neededHeight > pageHeight - 20) {
        doc.addPage()
        yPosition = margin
        return true
      }
      return false
    }

    // Helper to add section header
    const addSectionHeader = (title: string, color: [number, number, number]) => {
      checkNewPage(18)
      doc.setFillColor(...color)
      doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin + 6, yPosition + 7)
      yPosition += 14
    }

    // ========== HEADER ==========
    // Gradient header background with rounded bottom corners
    const headerHeight = 55
    const cornerRadius = 12

    // Draw gradient
    for (let i = 0; i < headerHeight; i++) {
      const ratio = i / headerHeight
      const r = Math.round(primaryColor[0] + (secondaryColor[0] - primaryColor[0]) * ratio)
      const g = Math.round(primaryColor[1] + (secondaryColor[1] - primaryColor[1]) * ratio)
      const b = Math.round(primaryColor[2] + (secondaryColor[2] - primaryColor[2]) * ratio)
      doc.setFillColor(r, g, b)
      doc.rect(0, i, pageWidth, 1.2, 'F')
    }

    // Create rounded bottom corners by drawing white quarter circles
    doc.setFillColor(255, 255, 255)
    // Bottom-left corner
    doc.rect(0, headerHeight - cornerRadius, cornerRadius, cornerRadius, 'F')
    doc.setFillColor(
      Math.round(primaryColor[0] + (secondaryColor[0] - primaryColor[0]) * 0.95),
      Math.round(primaryColor[1] + (secondaryColor[1] - primaryColor[1]) * 0.95),
      Math.round(primaryColor[2] + (secondaryColor[2] - primaryColor[2]) * 0.95)
    )
    doc.ellipse(cornerRadius, headerHeight - cornerRadius, cornerRadius, cornerRadius, 'F')

    // Bottom-right corner
    doc.setFillColor(255, 255, 255)
    doc.rect(pageWidth - cornerRadius, headerHeight - cornerRadius, cornerRadius, cornerRadius, 'F')
    doc.setFillColor(
      Math.round(primaryColor[0] + (secondaryColor[0] - primaryColor[0]) * 0.95),
      Math.round(primaryColor[1] + (secondaryColor[1] - primaryColor[1]) * 0.95),
      Math.round(primaryColor[2] + (secondaryColor[2] - primaryColor[2]) * 0.95)
    )
    doc.ellipse(pageWidth - cornerRadius, headerHeight - cornerRadius, cornerRadius, cornerRadius, 'F')

    // Logo DaherLab - canto superior direito, menor
    try {
      const logoData = await loadImageWithDimensions('/logo_branca_sem_slogan.png')
      const maxLogoHeight = 18
      const maxLogoWidth = 18
      const aspectRatio = logoData.width / logoData.height
      let logoWidth = maxLogoWidth
      let logoHeight = logoWidth / aspectRatio
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight
        logoWidth = logoHeight * aspectRatio
      }
      doc.addImage(logoData.base64, 'PNG', pageWidth - margin - logoWidth, 8, logoWidth, logoHeight)
    } catch (error) {
      console.warn('Could not load logo:', error)
    }

    // Header text - CENTRALIZADO
    doc.setTextColor(255, 255, 255)
    const centerX = pageWidth / 2

    // H1: Product name - renderizar com fonte customizada via Canvas
    const agirAgilImage = await renderAgirAgilAsImage()
    if (agirAgilImage) {
      // Usar imagem renderizada com fonte customizada
      const imgWidth = 45 // largura em mm
      const imgHeight = 12 // altura em mm
      const imgX = centerX - imgWidth / 2
      doc.addImage(agirAgilImage, 'PNG', imgX, 10, imgWidth, imgHeight)
    } else {
      // Fallback para helvetica
      doc.setFontSize(26)
      doc.setFont('helvetica', 'bold')
      doc.text('agir ágil', centerX, 18, { align: 'center' })
    }
    doc.setFont('helvetica', 'bold')

    // H2: Report type
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Relatório da Sprint', centerX, 28, { align: 'center' })

    // H3: Project and Sprint context
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const contextText = projectName ? `Projeto: ${projectName}  |  Sprint: ${sprint.name}` : `Sprint: ${sprint.name}`
    doc.text(contextText, centerX, 38, { align: 'center' })

    yPosition = headerHeight + 8

    // ========== SPRINT INFO BOX ==========
    // Calcular altura dinâmica baseada no objetivo
    let goalLines: string[] = []
    if (sprintDetails.goal) {
      doc.setFontSize(11)
      goalLines = doc.splitTextToSize(sprintDetails.goal, pageWidth - margin * 2 - 50)
    }
    const goalLinesCount = Math.min(goalLines.length, 3)
    const infoBoxHeight = 22 + (goalLinesCount > 0 ? 8 + goalLinesCount * 5 : 0)

    doc.setFillColor(...lightBgColor)
    doc.roundedRect(margin, yPosition, pageWidth - margin * 2, infoBoxHeight, 4, 4, 'F')
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.4)
    doc.roundedRect(margin, yPosition, pageWidth - margin * 2, infoBoxHeight, 4, 4, 'S')

    // Sprint metadata
    doc.setTextColor(...darkColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Informações da Sprint', margin + 8, yPosition + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    let infoY = yPosition + 18

    // Dates
    const startDate = new Date(sprint.start_date).toLocaleDateString('pt-BR')
    const endDate = new Date(sprint.end_date).toLocaleDateString('pt-BR')
    doc.setTextColor(...grayColor)
    doc.text('Período:', margin + 8, infoY)
    doc.setTextColor(...darkColor)
    doc.text(`${startDate} - ${endDate}`, margin + 35, infoY)

    // Status
    if (sprintDetails.status) {
      const statusLabels: Record<string, string> = {
        planning: 'Planejamento',
        active: 'Ativo',
        completed: 'Concluído',
        cancelled: 'Cancelado',
      }
      const statusColors: Record<string, [number, number, number]> = {
        planning: warningColor,
        active: primaryColor,
        completed: successColor,
        cancelled: dangerColor,
      }
      doc.setTextColor(...grayColor)
      doc.text('Status:', margin + 90, infoY)
      doc.setTextColor(...(statusColors[sprintDetails.status] || primaryColor))
      doc.setFont('helvetica', 'bold')
      doc.text(statusLabels[sprintDetails.status] || sprintDetails.status, margin + 112, infoY)
      doc.setFont('helvetica', 'normal')
    }

    // Goal - com quebra de linha correta
    if (sprintDetails.goal && goalLines.length > 0) {
      infoY += 8
      doc.setTextColor(...grayColor)
      doc.text('Objetivo:', margin + 8, infoY)
      doc.setTextColor(...darkColor)
      doc.setFontSize(11)
      const displayLines = goalLines.slice(0, 3)
      displayLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 35, infoY + idx * 5)
      })
    }

    yPosition += infoBoxHeight + 10

    // ========== STATISTICS ==========
    addSectionHeader('Estatísticas', primaryColor)

    const totalStories = stories.length
    const completedStories = stories.filter((s) => s.status === 'done').length
    const inProgressStories = stories.filter((s) => s.status === 'in-progress').length
    const totalPoints = stories.reduce((sum, s) => sum + (s.story_points || 0), 0)
    const completedPoints = stories.filter((s) => s.status === 'done').reduce((sum, s) => sum + (s.story_points || 0), 0)
    const blockedStories = stories.filter((s) => s.status === 'blocked').length
    const progressPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0

    // Stats grid - 5 columns
    const statsBoxWidth = (pageWidth - margin * 2 - 20) / 5
    const stats = [
      { label: 'Total', value: totalStories.toString(), color: primaryColor },
      { label: 'Concluídas', value: completedStories.toString(), color: successColor },
      { label: 'Em Progresso', value: inProgressStories.toString(), color: warningColor },
      { label: 'Bloqueadas', value: blockedStories.toString(), color: blockedStories > 0 ? dangerColor : grayColor },
      { label: 'Progresso', value: `${progressPercent}%`, color: progressPercent >= 70 ? successColor : progressPercent >= 40 ? warningColor : dangerColor },
    ]

    stats.forEach((stat, index) => {
      const x = margin + index * (statsBoxWidth + 5)
      doc.setFillColor(...lightBgColor)
      doc.roundedRect(x, yPosition, statsBoxWidth, 26, 3, 3, 'F')

      doc.setTextColor(...stat.color)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(stat.value, x + statsBoxWidth / 2, yPosition + 12, { align: 'center' })

      doc.setTextColor(...grayColor)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(stat.label, x + statsBoxWidth / 2, yPosition + 21, { align: 'center' })
    })

    yPosition += 32

    // Story Points summary
    doc.setFillColor(250, 245, 255)
    doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 16, 3, 3, 'F')
    doc.setTextColor(...secondaryColor)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Story Points: ${completedPoints} de ${totalPoints} concluídos`, margin + 10, yPosition + 11)

    // Progress bar
    const barWidth = 70
    const barX = pageWidth - margin - barWidth - 10
    doc.setFillColor(220, 220, 220)
    doc.roundedRect(barX, yPosition + 5, barWidth, 6, 2, 2, 'F')
    if (progressPercent > 0) {
      doc.setFillColor(...(progressPercent >= 70 ? successColor : progressPercent >= 40 ? warningColor : dangerColor))
      doc.roundedRect(barX, yPosition + 5, (barWidth * progressPercent) / 100, 6, 2, 2, 'F')
    }

    yPosition += 22

    // ========== USER STORIES TABLE ==========
    if (stories.length > 0) {
      addSectionHeader(`Histórias de Usuário (${stories.length})`, secondaryColor)

      const statusLabels: Record<string, string> = {
        todo: 'A Fazer',
        'in-progress': 'Em Progresso',
        review: 'Em Revisão',
        done: 'Concluído',
        blocked: 'Bloqueado',
      }
      const priorityLabels: Record<string, string> = {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta',
        urgent: 'Urgente',
      }

      const tableData = stories.map((story) => [
        story.title,
        statusLabels[story.status] || story.status,
        priorityLabels[story.priority] || story.priority,
        story.story_points?.toString() || '-',
        story.assigned_to_profile?.full_name || '-',
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Título', 'Status', 'Prioridade', 'Pts', 'Responsável']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 11,
          textColor: darkColor,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: lightBgColor,
        },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { cellWidth: 28 },
          2: { cellWidth: 24 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 38 },
        },
        didParseCell: (data) => {
          // Color code status column
          if (data.column.index === 1 && data.section === 'body') {
            const status = data.cell.text[0]
            if (status === 'Concluído') data.cell.styles.textColor = successColor
            else if (status === 'Em Progresso') data.cell.styles.textColor = warningColor
            else if (status === 'Bloqueado') data.cell.styles.textColor = dangerColor
            else if (status === 'Em Revisão') data.cell.styles.textColor = secondaryColor
          }
          // Color code priority column
          if (data.column.index === 2 && data.section === 'body') {
            const priority = data.cell.text[0]
            if (priority === 'Urgente' || priority === 'Alta') data.cell.styles.textColor = dangerColor
            else if (priority === 'Média') data.cell.styles.textColor = warningColor
          }
        },
        didDrawPage: () => {
          // Reset yPosition after page break
          yPosition = margin
        },
      })

      // @ts-ignore - autoTable adds finalY property
      yPosition = doc.lastAutoTable.finalY + 12
    }

    // ========== KANBAN SUMMARY ==========
    const todoStories = stories.filter((s) => s.status === 'todo')
    const inProgress = stories.filter((s) => s.status === 'in-progress')
    const inReview = stories.filter((s) => s.status === 'review')
    const done = stories.filter((s) => s.status === 'done')
    const blocked = stories.filter((s) => s.status === 'blocked')

    if (stories.length > 0) {
      checkNewPage(60)
      addSectionHeader('Visão Kanban', primaryColor)

      // Usar autoTable para o Kanban - garante que o texto não será cortado
      const kanbanColumns = [
        { title: 'A Fazer', items: todoStories, color: grayColor },
        { title: 'Em Progresso', items: inProgress, color: warningColor },
        { title: 'Em Revisão', items: inReview, color: secondaryColor },
        { title: 'Concluído', items: done, color: successColor },
        { title: 'Bloqueado', items: blocked, color: dangerColor },
      ]

      // Encontrar o máximo de itens em qualquer coluna
      const maxItems = Math.max(...kanbanColumns.map((col) => col.items.length))

      // Criar dados da tabela - cada linha é uma "row" do kanban
      const kanbanTableData: string[][] = []
      for (let i = 0; i < maxItems; i++) {
        const row = kanbanColumns.map((col) => col.items[i]?.title || '')
        kanbanTableData.push(row)
      }

      // Se não houver itens, mostrar uma linha vazia
      if (kanbanTableData.length === 0) {
        kanbanTableData.push(['', '', '', '', ''])
      }

      autoTable(doc, {
        startY: yPosition,
        head: [[
          `A Fazer (${todoStories.length})`,
          `Em Progresso (${inProgress.length})`,
          `Em Revisão (${inReview.length})`,
          `Concluído (${done.length})`,
          `Bloqueado (${blocked.length})`,
        ]],
        body: kanbanTableData,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 3,
          halign: 'center',
          valign: 'middle',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: darkColor,
          cellPadding: 5,
          valign: 'top',
        },
        columnStyles: {
          0: { cellWidth: 'auto', fillColor: [248, 250, 252] },
          1: { cellWidth: 'auto', fillColor: [255, 251, 235] },
          2: { cellWidth: 'auto', fillColor: [245, 243, 255] },
          3: { cellWidth: 'auto', fillColor: [236, 253, 245] },
          4: { cellWidth: 'auto', fillColor: [254, 242, 242] },
        },
        didParseCell: (data) => {
          // Colorir cabeçalhos individualmente
          if (data.section === 'head') {
            const colors = [grayColor, warningColor, secondaryColor, successColor, dangerColor]
            data.cell.styles.fillColor = colors[data.column.index]
          }
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
      })

      // @ts-ignore - autoTable adds finalY property
      yPosition = doc.lastAutoTable.finalY + 12
    }

    // ========== RETROSPECTIVE ==========
    if (retroItems.length > 0 || retroMoodRating > 0) {
      checkNewPage(50)
      addSectionHeader('Retrospectiva', secondaryColor)

      // Team mood
      if (retroMoodRating > 0) {
        const moodLabels: Record<number, string> = {
          1: 'Muito ruim',
          2: 'Ruim',
          3: 'Neutro',
          4: 'Bom',
          5: 'Excelente',
        }
        const moodColors: Record<number, [number, number, number]> = {
          1: dangerColor,
          2: warningColor,
          3: grayColor,
          4: successColor,
          5: primaryColor,
        }
        doc.setFillColor(250, 245, 255)
        doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 14, 3, 3, 'F')
        doc.setTextColor(...grayColor)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text('Humor do Time:', margin + 10, yPosition + 9)
        doc.setTextColor(...(moodColors[retroMoodRating] || grayColor))
        doc.setFont('helvetica', 'bold')
        doc.text(moodLabels[retroMoodRating] || 'Não avaliado', margin + 55, yPosition + 9)
        yPosition += 18
      }

      // Retrospective categories
      const retroCategories = [
        { id: 'went_well', title: 'O que foi bem', color: successColor },
        { id: 'to_improve', title: 'O que melhorar', color: warningColor },
        { id: 'action_item', title: 'Ações para o próximo sprint', color: primaryColor },
      ]

      retroCategories.forEach((category) => {
        const items = retroItems.filter((item) => item.category === category.id)
        if (items.length === 0) return

        checkNewPage(20 + items.length * 12)

        // Category header
        doc.setFillColor(...category.color)
        doc.roundedRect(margin, yPosition, 5, 12, 1, 1, 'F')
        doc.setTextColor(...darkColor)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${category.title} (${items.length})`, margin + 10, yPosition + 8)
        yPosition += 16

        // Items
        items.forEach((item) => {
          checkNewPage(14)
          doc.setFillColor(...lightBgColor)
          doc.roundedRect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 10, 2, 2, 'F')
          doc.setTextColor(...darkColor)
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
          const itemText = item.content.length > 70 ? item.content.substring(0, 67) + '...' : item.content
          doc.text(`• ${itemText}`, margin + 10, yPosition + 7)

          // Votes badge
          if (item.votes > 0) {
            doc.setTextColor(...grayColor)
            doc.setFontSize(9)
            doc.text(`${item.votes} votos`, pageWidth - margin - 15, yPosition + 7)
          }
          yPosition += 12
        })

        yPosition += 6
      })
    }

    // ========== AI TIP ==========
    if (aiTip) {
      checkNewPage(45)

      // Header
      doc.setFillColor(250, 245, 255)
      doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 12, 2, 2, 'F')
      doc.setTextColor(...secondaryColor)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Dica da Ada', margin + 10, yPosition + 8)
      yPosition += 16

      // Content box - texto justificado
      const contentWidth = pageWidth - margin * 2 - 20
      doc.setFontSize(11)
      const tipLines = doc.splitTextToSize(aiTip, contentWidth)
      const lineHeight = 6
      const maxLines = 10
      const displayLines = tipLines.slice(0, maxLines)
      const tipBoxHeight = Math.max(displayLines.length * lineHeight + 14, 30)

      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin, yPosition, pageWidth - margin * 2, tipBoxHeight, 3, 3, 'F')
      doc.setDrawColor(220, 210, 240)
      doc.setLineWidth(0.5)
      doc.roundedRect(margin, yPosition, pageWidth - margin * 2, tipBoxHeight, 3, 3, 'S')

      doc.setTextColor(...darkColor)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      // Texto justificado
      const textX = margin + 10
      const textMaxWidth = contentWidth
      displayLines.forEach((line: string, idx: number) => {
        const isLastLine = idx === displayLines.length - 1 || idx === maxLines - 1
        const lineY = yPosition + 12 + idx * lineHeight

        if (isLastLine) {
          // Última linha: alinhamento à esquerda
          doc.text(line, textX, lineY)
        } else {
          // Outras linhas: justificado
          doc.text(line, textX, lineY, {
            maxWidth: textMaxWidth,
            align: 'justify',
          })
        }
      })
      yPosition += tipBoxHeight + 10
    }

    // ========== ADD FOOTERS TO ALL PAGES ==========
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooter(i, totalPages)
    }

    // Save PDF
    const safeSprintName = sprint.name.replace(/[^a-zA-Z0-9]/g, '_')
    const safeProjectName = projectName ? projectName.replace(/[^a-zA-Z0-9]/g, '_') + '_' : ''
    const fileName = `${safeProjectName}Sprint_${safeSprintName}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success('PDF exportado com sucesso!')
  }

  const fetchUserStories = async () => {
    setLoading(true)
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('tasks')
        .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
        .eq('sprint_id', sprint.id)
        .order('created_at', { ascending: true })

      if (storiesError) throw storiesError

      // Transform stories to handle assigned_to_profile array
      const transformedStories = (storiesData || []).map((story: any) => ({
        ...story,
        assigned_to_profile: Array.isArray(story.assigned_to_profile)
          ? story.assigned_to_profile[0]
          : story.assigned_to_profile,
      }))

      // Fetch subtasks for each story
      const storiesWithSubtasks = await Promise.all(
        transformedStories.map(async (story) => {
          // Try to fetch subtasks, but don't fail if table doesn't exist
          try {
            const { data: subtasksData } = await supabase
              .from('subtasks')
              .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
              .eq('task_id', story.id)
              .order('created_at', { ascending: true })

            // Transform subtasks to handle assigned_to_profile array
            const transformedSubtasks = (subtasksData || []).map((subtask: any) => ({
              ...subtask,
              assigned_to_profile: Array.isArray(subtask.assigned_to_profile)
                ? subtask.assigned_to_profile[0]
                : subtask.assigned_to_profile,
            }))

            return {
              ...story,
              subtasks: transformedSubtasks,
            }
          } catch (subtaskError) {
            console.warn('Subtasks table may not exist:', subtaskError)
            return {
              ...story,
              subtasks: [],
            }
          }
        })
      )

      setStories(storiesWithSubtasks)
    } catch (error) {
      console.error('Error fetching user stories:', error)
      toast.error('Erro ao carregar histórias de usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStory = async (storyId: string, storyTitle: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a história "${storyTitle}"?\n\nTodas as subtarefas também serão excluídas. Esta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', storyId)

      if (error) throw error

      toast.success('História excluída com sucesso!')
      await fetchUserStories()
    } catch (error) {
      console.error('Error deleting story:', error)
      toast.error('Erro ao excluir história')
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)

      if (error) throw error

      toast.success('Subtarefa excluída com sucesso!')
      await fetchUserStories()
    } catch (error) {
      console.error('Error deleting subtask:', error)
      toast.error('Erro ao excluir subtarefa')
    }
  }

  const handleToggleSubtaskStatus = async (subtask: Subtask) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done'

    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ status: newStatus })
        .eq('id', subtask.id)

      if (error) throw error

      await fetchUserStories()
    } catch (error) {
      console.error('Error updating subtask:', error)
      toast.error('Erro ao atualizar subtarefa')
    }
  }

  const handleOpenSubtaskModal = (storyId: string) => {
    setSelectedStoryId(storyId)
    setCreateSubtaskOpen(true)
  }

  const calculateStoryProgress = (story: UserStory) => {
    if (!story.subtasks || story.subtasks.length === 0) return 0
    const completed = story.subtasks.filter((st) => st.status === 'done').length
    return Math.round((completed / story.subtasks.length) * 100)
  }

  const getTotalPoints = () => {
    return stories.reduce((sum, story) => sum + (story.story_points || 0), 0)
  }

  const getCompletedPoints = () => {
    return stories
      .filter((story) => story.status === 'done')
      .reduce((sum, story) => sum + (story.story_points || 0), 0)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Sprint: ${sprint.name}`} maxWidth="lg">
        <Box>
          {/* Tabs Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                },
              }}
            >
              <Tab icon={<Assignment />} iconPosition="start" label="Histórias" />
              <Tab icon={<EmojiEvents />} iconPosition="start" label="Retrospectiva" />
              <Tab icon={<Visibility />} iconPosition="start" label="Review" />
            </Tabs>
          </Box>

          {/* Tab Panel 0: Stories */}
          {activeTab === 0 && (
            <>
              {/* Statistics */}
              <Box
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                }}
              >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Resumo do Sprint
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => {
                    if (newMode !== null) setViewMode(newMode)
                  }}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      border: '2px solid rgba(99, 102, 241, 0.2)',
                      '&.Mui-selected': {
                        bgcolor: '#6366f1',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#4f46e5',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="kanban">
                    <ViewKanban sx={{ fontSize: 18, mr: 0.5 }} />
                    Kanban
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ViewList sx={{ fontSize: 18, mr: 0.5 }} />
                    Lista
                  </ToggleButton>
                </ToggleButtonGroup>

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateStoryOpen(true)}
                  sx={{
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  Nova História
                </Button>

                <Tooltip title="Exportar PDF">
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdf />}
                    onClick={generatePDF}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      borderColor: alpha('#ef4444', 0.5),
                      color: '#ef4444',
                      '&:hover': {
                        borderColor: '#ef4444',
                        bgcolor: alpha('#ef4444', 0.08),
                      },
                    }}
                  >
                    Exportar
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Total de Histórias
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
                  {stories.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Concluídas
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981' }}>
                  {stories.filter((s) => s.status === 'done').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Story Points
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
                  {getCompletedPoints()} / {getTotalPoints()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Progresso
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#8b5cf6' }}>
                  {getTotalPoints() > 0 ? Math.round((getCompletedPoints() / getTotalPoints()) * 100) : 0}%
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Analytics Charts */}
          {!loading && stories.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Analytics
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                  gap: 3,
                }}
              >
                <BurndownChart
                  sprint={{
                    start_date: sprint.start_date,
                    end_date: sprint.end_date,
                  }}
                  stories={stories}
                />
                <VelocityChart teamId={sprint.team_id} currentSprintId={sprint.id} />
              </Box>
            </Box>
          )}

          {/* User Stories List */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : stories.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                borderRadius: 3,
                bgcolor: 'rgba(99, 102, 241, 0.05)',
                border: '2px dashed rgba(99, 102, 241, 0.2)',
              }}
            >
              <Assignment sx={{ fontSize: 80, color: '#6366f1', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Nenhuma história criada ainda
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Crie sua primeira história de usuário para este sprint
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateStoryOpen(true)}
                sx={{ px: 4, py: 1.5 }}
              >
                Criar Primeira História
              </Button>
            </Box>
          ) : viewMode === 'kanban' ? (
            <>
              <KanbanBoard
                stories={stories}
                onRefresh={fetchUserStories}
                onDeleteStory={handleDeleteStory}
                currentSprintId={sprint.id}
              />

              {/* AI Tips Section */}
              {sprintDetails.status !== 'completed' && (
                <Box
                  sx={{
                    mt: 3,
                    p: 0,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(236, 72, 153, 0.08) 100%)',
                    border: '2px solid',
                    borderColor: alpha('#8b5cf6', 0.2),
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Decorative gradient bar */}
                  <Box
                    sx={{
                      height: 4,
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #ec4899 100%)',
                    }}
                  />

                  <Box sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Tooltip title="Conheça a Ada">
                          <Box
                            onClick={() => setAdaModalOpen(true)}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                              border: '2px solid',
                              borderColor: 'rgba(139, 92, 246, 0.3)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.1)',
                                boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)',
                                borderColor: 'rgba(139, 92, 246, 0.5)',
                              },
                            }}
                          >
                            <img
                              src="/ADA.png"
                              alt="Ada"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </Box>
                        </Tooltip>
                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            Dicas da Ada
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Insights personalizados para o seu sprint
                          </Typography>
                        </Box>
                      </Box>

                      <Tooltip title="Gerar nova dica">
                        <IconButton
                          onClick={generateAiTip}
                          disabled={aiTipLoading}
                          sx={{
                            bgcolor: alpha('#8b5cf6', 0.1),
                            '&:hover': {
                              bgcolor: alpha('#8b5cf6', 0.2),
                            },
                            '&.Mui-disabled': {
                              bgcolor: alpha('#8b5cf6', 0.05),
                            },
                          }}
                        >
                          <Refresh
                            sx={{
                              color: '#8b5cf6',
                              animation: aiTipLoading ? 'spin 1s linear infinite' : 'none',
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                              },
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Tip Content */}
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: isDarkMode ? '#1e293b' : 'white',
                        border: '1px solid',
                        borderColor: alpha('#8b5cf6', 0.15),
                        position: 'relative',
                        minHeight: 80,
                      }}
                    >
                      {aiTipLoading ? (
                        <Box>
                          <Skeleton variant="text" width="100%" height={24} />
                          <Skeleton variant="text" width="90%" height={24} />
                          <Skeleton variant="text" width="75%" height={24} />
                        </Box>
                      ) : aiTipError ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LightbulbOutlined sx={{ color: '#f59e0b', fontSize: 28 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Não foi possível gerar a dica no momento.
                            </Typography>
                            <Button
                              size="small"
                              onClick={generateAiTip}
                              sx={{ mt: 1, textTransform: 'none' }}
                            >
                              Tentar novamente
                            </Button>
                          </Box>
                        </Box>
                      ) : aiTip ? (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <LightbulbOutlined
                            sx={{
                              color: '#f59e0b',
                              fontSize: 28,
                              flexShrink: 0,
                              mt: 0.25,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              lineHeight: 1.7,
                              color: 'text.primary',
                              fontWeight: 500,
                            }}
                          >
                            {aiTip}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LightbulbOutlined sx={{ color: '#9ca3af', fontSize: 28 }} />
                          <Typography variant="body2" color="text.secondary">
                            Clique no botão de atualizar para gerar uma dica personalizada para o seu sprint.
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Footer info */}
                    {aiTip && !aiTipLoading && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${getTotalPoints() > 0 ? Math.round((getCompletedPoints() / getTotalPoints()) * 100) : 0}% concluído`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#10b981', 0.1),
                            color: '#10b981',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Chip
                          label={`${stories.filter((s) => s.status === 'blocked').length} bloqueadas`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#ef4444', 0.1),
                            color: '#ef4444',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Chip
                          label={`${(() => {
                            const endDate = new Date(sprint.end_date)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            return Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
                          })()} dias restantes`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#6366f1', 0.1),
                            color: '#6366f1',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Show locked message when sprint is completed */}
              {sprintDetails.status === 'completed' && aiTip && (
                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.05) 0%, rgba(107, 114, 128, 0.1) 100%)',
                    border: '2px solid',
                    borderColor: alpha('#6b7280', 0.2),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Tooltip title="Conheça a Ada">
                      <Box
                        onClick={() => setAdaModalOpen(true)}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: 'rgba(107, 114, 128, 0.3)',
                          filter: 'grayscale(50%)',
                          opacity: 0.8,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            filter: 'grayscale(0%)',
                            opacity: 1,
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <img
                          src="/ADA.png"
                          alt="Ada"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    </Tooltip>
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                      Dica da Ada (Sprint Concluída)
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {aiTip}
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <Stack spacing={2}>
              {stories.map((story) => (
                <Accordion
                  key={story.id}
                  elevation={0}
                  sx={{
                    border: '2px solid rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px !important',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      border: '2px solid rgba(99, 102, 241, 0.3)',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      borderRadius: 3,
                      '&.Mui-expanded': {
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, mr: 2 }}>
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
                        <Assignment sx={{ color: 'white', fontSize: 20 }} />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={700}>
                          {story.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={statusConfig[story.status]?.label || story.status}
                            size="small"
                            sx={{
                              bgcolor: `${statusConfig[story.status]?.color}20`,
                              color: statusConfig[story.status]?.color,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                          <Chip
                            label={priorityConfig[story.priority]?.label || story.priority}
                            size="small"
                            icon={<Flag sx={{ fontSize: 14 }} />}
                            sx={{
                              bgcolor: `${priorityConfig[story.priority]?.color}20`,
                              color: priorityConfig[story.priority]?.color,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                          {story.story_points > 0 && (
                            <Chip
                              label={`${story.story_points} pts`}
                              size="small"
                              icon={<Functions sx={{ fontSize: 14 }} />}
                              sx={{
                                bgcolor: 'rgba(99, 102, 241, 0.1)',
                                color: '#6366f1',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                          {story.assigned_to_profile?.full_name && (
                            <Chip
                              label={story.assigned_to_profile.full_name}
                              size="small"
                              icon={<Person sx={{ fontSize: 14 }} />}
                              sx={{
                                bgcolor: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      <Tooltip title="Excluir História">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteStory(story.id, story.title)
                          }}
                          sx={{
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            '&:hover': {
                              bgcolor: 'rgba(239, 68, 68, 0.2)',
                            },
                          }}
                        >
                          <Delete sx={{ color: '#ef4444' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails>
                    {story.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                        {story.description}
                      </Typography>
                    )}

                    {/* Subtasks Progress */}
                    {story.subtasks && story.subtasks.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Progresso das Subtarefas
                          </Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#6366f1' }}>
                            {calculateStoryProgress(story)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={calculateStoryProgress(story)}
                          sx={{
                            height: 6,
                            borderRadius: 10,
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                              borderRadius: 10,
                            },
                          }}
                        />
                      </Box>
                    )}

                    {/* Subtasks List */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          Subtarefas ({story.subtasks?.length || 0})
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => handleOpenSubtaskModal(story.id)}
                          sx={{
                            px: 2,
                            py: 0.5,
                            fontSize: '0.875rem',
                          }}
                        >
                          Adicionar
                        </Button>
                      </Box>

                      {story.subtasks && story.subtasks.length > 0 ? (
                        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0 }}>
                          {story.subtasks.map((subtask, index) => (
                            <Box key={subtask.id}>
                              <ListItem
                                sx={{
                                  py: 1.5,
                                  '&:hover': {
                                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                                  },
                                }}
                              >
                                <Tooltip title={subtask.status === 'done' ? 'Marcar como pendente' : 'Marcar como concluído'}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleSubtaskStatus(subtask)}
                                    sx={{ mr: 1 }}
                                  >
                                    <CheckCircle
                                      sx={{
                                        color: subtask.status === 'done' ? '#10b981' : '#d1d5db',
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                                <ListItemText
                                  primary={
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        textDecoration: subtask.status === 'done' ? 'line-through' : 'none',
                                        color: subtask.status === 'done' ? 'text.secondary' : 'text.primary',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {subtask.title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                      {subtask.estimated_hours && (
                                        <Chip
                                          label={`${subtask.estimated_hours}h`}
                                          size="small"
                                          icon={<Timer sx={{ fontSize: 12 }} />}
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                                            color: '#6366f1',
                                          }}
                                        />
                                      )}
                                      {subtask.assigned_to_profile?.full_name && (
                                        <Chip
                                          label={subtask.assigned_to_profile.full_name}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            bgcolor: 'rgba(16, 185, 129, 0.1)',
                                            color: '#10b981',
                                          }}
                                        />
                                      )}
                                    </Box>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => handleDeleteSubtask(subtask.id)}
                                    sx={{
                                      color: 'error.main',
                                      '&:hover': {
                                        bgcolor: 'error.lighter',
                                      },
                                    }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                              {index < story.subtasks!.length - 1 && <Divider />}
                            </Box>
                          ))}
                        </List>
                      ) : (
                        <Box
                          sx={{
                            textAlign: 'center',
                            py: 3,
                            px: 2,
                            borderRadius: 2,
                            bgcolor: 'rgba(99, 102, 241, 0.05)',
                            border: '1px dashed rgba(99, 102, 241, 0.2)',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma subtarefa adicionada
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
            </>
          )}

          {/* Tab Panel 1: Retrospective */}
          {activeTab === 1 && (
            <RetrospectiveBoard sprintId={sprint.id} sprintName={sprint.name} />
          )}

          {/* Tab Panel 2: Review */}
          {activeTab === 2 && (
            <ReviewMeetingForm sprintId={sprint.id} sprintName={sprint.name} stories={stories} />
          )}
        </Box>
      </Modal>

      <CreateUserStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onSuccess={fetchUserStories}
        sprintId={sprint.id}
        projectId={sprint.project_id}
      />

      <CreateSubtaskModal
        open={createSubtaskOpen}
        onClose={() => {
          setCreateSubtaskOpen(false)
          setSelectedStoryId('')
        }}
        onSuccess={fetchUserStories}
        taskId={selectedStoryId}
      />

      <AdaModal
        open={adaModalOpen}
        onClose={() => setAdaModalOpen(false)}
      />
    </>
  )
}
