import XLSX from 'xlsx-js-style'
import type { HierarchicalTask, TaskDependency } from '@/types/hybrid'

interface ExportOptions {
  projectName: string
  projectManager?: string
  tasks: HierarchicalTask[]
  dependencies: TaskDependency[]
  teamMembers: Map<string, string>
}

// Colors
const COLORS = {
  // Brand colors
  primary: '1E3A5F',      // Dark blue (Daherlab brand)
  primaryLight: '2E5A8F', // Lighter blue
  accent: '6366F1',       // Indigo accent

  // Status colors
  done: '10B981',         // Green
  inProgress: 'F59E0B',   // Amber/Yellow
  blocked: 'EF4444',      // Red
  review: '8B5CF6',       // Purple
  todo: '6B7280',         // Gray

  // Timeline bar colors
  taskBar: '6366F1',      // Indigo for normal tasks
  summaryBar: '8B5CF6',   // Purple for summary/phase tasks
  criticalBar: 'EF4444',  // Red for critical path
  milestoneBar: 'F59E0B', // Amber for milestones

  // Background colors
  headerBg: '1E3A5F',
  subHeaderBg: '2E5A8F',
  phaseBg: 'E8EEF4',
  altRowBg: 'F8FAFC',
  white: 'FFFFFF',

  // Text colors
  textWhite: 'FFFFFF',
  textDark: '1F2937',
  textGray: '6B7280',
}

// Status labels and colors
const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  'done': { label: 'CONCLUÍDO', bgColor: COLORS.done, textColor: COLORS.textWhite },
  'in-progress': { label: 'EM ANDAMENTO', bgColor: COLORS.inProgress, textColor: COLORS.textDark },
  'blocked': { label: 'BLOQUEADO', bgColor: COLORS.blocked, textColor: COLORS.textWhite },
  'review': { label: 'EM REVISÃO', bgColor: COLORS.review, textColor: COLORS.textWhite },
  'todo': { label: 'NÃO INICIADO', bgColor: COLORS.todo, textColor: COLORS.textWhite },
}

// Style definitions
const STYLES = {
  title: {
    font: { name: 'Calibri', sz: 24, bold: true, color: { rgb: COLORS.primary } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  subtitle: {
    font: { name: 'Calibri', sz: 11, color: { rgb: COLORS.textGray } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  metaLabel: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.textDark } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  metaValue: {
    font: { name: 'Calibri', sz: 10, color: { rgb: COLORS.textDark } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  header: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.textWhite } },
    fill: { fgColor: { rgb: COLORS.headerBg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.primaryLight } },
      bottom: { style: 'thin', color: { rgb: COLORS.primaryLight } },
      left: { style: 'thin', color: { rgb: COLORS.primaryLight } },
      right: { style: 'thin', color: { rgb: COLORS.primaryLight } },
    },
  },
  dateHeader: {
    font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: COLORS.textWhite } },
    fill: { fgColor: { rgb: COLORS.subHeaderBg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.primaryLight } },
      bottom: { style: 'thin', color: { rgb: COLORS.primaryLight } },
      left: { style: 'thin', color: { rgb: COLORS.primaryLight } },
      right: { style: 'thin', color: { rgb: COLORS.primaryLight } },
    },
  },
  phaseRow: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.textDark } },
    fill: { fgColor: { rgb: COLORS.phaseBg } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } },
    },
  },
  taskRow: {
    font: { name: 'Calibri', sz: 10, color: { rgb: COLORS.textDark } },
    fill: { fgColor: { rgb: COLORS.white } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  taskRowAlt: {
    font: { name: 'Calibri', sz: 10, color: { rgb: COLORS.textDark } },
    fill: { fgColor: { rgb: COLORS.altRowBg } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  centerText: {
    alignment: { horizontal: 'center', vertical: 'center' },
  },
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format date for column header (day/month)
 */
function formatDateHeader(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`
}

/**
 * Calculate duration in days
 */
function calculateDuration(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end) return 0
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diffDays)
}

/**
 * Get date range for timeline
 */
function getDateRange(tasks: HierarchicalTask[]): { start: Date; end: Date; days: Date[] } {
  let minDate: Date | null = null
  let maxDate: Date | null = null

  tasks.forEach(task => {
    const start = parseDate(task.start_date)
    const end = parseDate(task.end_date)

    if (start) {
      if (!minDate || start < minDate) minDate = start
    }
    if (end) {
      if (!maxDate || end > maxDate) maxDate = end
    }
  })

  // Default to current month if no dates
  if (!minDate) minDate = new Date()
  if (!maxDate) maxDate = new Date(minDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Add padding
  minDate = new Date(minDate.getTime() - 2 * 24 * 60 * 60 * 1000)
  maxDate = new Date(maxDate.getTime() + 2 * 24 * 60 * 60 * 1000)

  // Generate all days in range
  const days: Date[] = []
  const current = new Date(minDate)
  while (current <= maxDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return { start: minDate, end: maxDate, days }
}

/**
 * Check if a date falls within task's date range
 */
function isDateInTaskRange(date: Date, task: HierarchicalTask): boolean {
  const start = parseDate(task.start_date)
  const end = parseDate(task.end_date)
  if (!start || !end) return false

  const dateTime = date.getTime()
  return dateTime >= start.getTime() && dateTime <= end.getTime()
}

/**
 * Get bar color based on task properties
 */
function getBarColor(task: HierarchicalTask): string {
  if (task.is_critical) return COLORS.criticalBar
  if (task.task_type === 'milestone') return COLORS.milestoneBar
  if (task.is_summary || task.task_type === 'summary' || task.task_type === 'phase') return COLORS.summaryBar
  return COLORS.taskBar
}

/**
 * Calculate overall project progress
 */
function calculateProjectProgress(tasks: HierarchicalTask[]): number {
  if (tasks.length === 0) return 0
  const total = tasks.reduce((sum, t) => sum + (t.percent_complete || 0), 0)
  return Math.round(total / tasks.length)
}

/**
 * Build hierarchy - organize tasks with phases/summaries containing their children
 */
function organizeTasksByHierarchy(tasks: HierarchicalTask[]): HierarchicalTask[] {
  // Sort by order_index
  const sorted = [...tasks].sort((a, b) => a.order_index - b.order_index)
  return sorted
}

/**
 * Get indentation prefix based on hierarchy level
 */
function getIndentedName(task: HierarchicalTask): string {
  const level = task.hierarchy_level || 0
  const indent = '  '.repeat(level)
  return indent + task.title
}

/**
 * Export Gantt chart to professional XLSX
 */
export function exportGanttToXLSX(options: ExportOptions): void {
  const { projectName, projectManager, tasks, teamMembers } = options

  // Organize tasks and get date range
  const organizedTasks = organizeTasksByHierarchy(tasks)
  const { days } = getDateRange(tasks)

  // Limit timeline to reasonable size (max 60 days for readability)
  const timelineDays = days.slice(0, Math.min(days.length, 60))

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Calculate column count
  const fixedColumns = 6 // Task, Responsible, Start, End, Duration, Status
  const totalColumns = fixedColumns + timelineDays.length

  // Build worksheet data
  const wsData: (string | number | null)[][] = []

  // Row 1: Title
  wsData.push(['DAHER PLAN - CRONOGRAMA DO PROJETO', ...Array(totalColumns - 1).fill(null)])

  // Row 2: Subtitle
  wsData.push(['Sistema de Gerenciamento de Projetos', ...Array(totalColumns - 1).fill(null)])

  // Row 3: Empty
  wsData.push(Array(totalColumns).fill(null))

  // Row 4-7: Project metadata
  const projectStart = tasks.length > 0
    ? tasks.reduce((min, t) => {
        const d = parseDate(t.start_date)
        return d && (!min || d < min) ? d : min
      }, null as Date | null)
    : null
  const projectEnd = tasks.length > 0
    ? tasks.reduce((max, t) => {
        const d = parseDate(t.end_date)
        return d && (!max || d > max) ? d : max
      }, null as Date | null)
    : null

  wsData.push(['NOME DO PROJETO', projectName, null, 'Data de início', projectStart ? formatDate(projectStart.toISOString()) : '-', ...Array(totalColumns - 5).fill(null)])
  wsData.push(['GERENTE DO PROJETO', projectManager || '-', null, 'Data de término', projectEnd ? formatDate(projectEnd.toISOString()) : '-', ...Array(totalColumns - 5).fill(null)])
  wsData.push(['PROGRESSO GERAL', `${calculateProjectProgress(tasks)}%`, null, 'Total de tarefas', tasks.length, ...Array(totalColumns - 5).fill(null)])

  // Row 7: Empty
  wsData.push(Array(totalColumns).fill(null))

  // Row 8: Headers
  const headers = ['TAREFAS', 'RESPONSÁVEL', 'INÍCIO', 'TÉRMINO', 'DIAS', 'STATUS']
  const dateHeaders = timelineDays.map(d => formatDateHeader(d))
  wsData.push([...headers, ...dateHeaders])

  // Task rows
  organizedTasks.forEach(task => {
    const assignedName = task.assigned_to
      ? (teamMembers.get(task.assigned_to) || task.assigned_to_profile?.full_name || '')
      : ''
    const duration = calculateDuration(task.start_date, task.end_date)
    const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG['todo']

    // Base row data
    const row: (string | number | null)[] = [
      getIndentedName(task),
      assignedName,
      formatDate(task.start_date),
      formatDate(task.end_date),
      duration || '',
      statusConfig.label,
    ]

    // Add timeline cells (empty strings for now, will be styled later)
    timelineDays.forEach(day => {
      row.push(isDateInTaskRange(day, task) ? '' : null)
    })

    wsData.push(row)
  })

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  const colWidths = [
    { wch: 40 },  // Task name
    { wch: 20 },  // Responsible
    { wch: 12 },  // Start
    { wch: 12 },  // End
    { wch: 8 },   // Duration
    { wch: 14 },  // Status
    ...timelineDays.map(() => ({ wch: 4 })), // Date columns
  ]
  ws['!cols'] = colWidths

  // Set row heights
  const rowHeights: { [key: number]: { hpt: number } } = {}
  rowHeights[0] = { hpt: 30 }  // Title
  rowHeights[1] = { hpt: 18 }  // Subtitle
  rowHeights[7] = { hpt: 24 }  // Header row
  ws['!rows'] = Object.keys(rowHeights).map((_, i) => rowHeights[i] || { hpt: 20 })

  // Apply styles
  const headerRowIndex = 8 // 0-indexed row 7 is header

  // Style title
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 })
  if (ws[titleCell]) {
    ws[titleCell].s = STYLES.title
  }

  // Style subtitle
  const subtitleCell = XLSX.utils.encode_cell({ r: 1, c: 0 })
  if (ws[subtitleCell]) {
    ws[subtitleCell].s = STYLES.subtitle
  }

  // Style metadata rows (rows 3-5, 0-indexed)
  for (let row = 3; row <= 5; row++) {
    const labelCell = XLSX.utils.encode_cell({ r: row, c: 0 })
    const valueCell = XLSX.utils.encode_cell({ r: row, c: 1 })
    const label2Cell = XLSX.utils.encode_cell({ r: row, c: 3 })
    const value2Cell = XLSX.utils.encode_cell({ r: row, c: 4 })

    if (ws[labelCell]) ws[labelCell].s = STYLES.metaLabel
    if (ws[valueCell]) ws[valueCell].s = STYLES.metaValue
    if (ws[label2Cell]) ws[label2Cell].s = STYLES.metaLabel
    if (ws[value2Cell]) ws[value2Cell].s = STYLES.metaValue
  }

  // Style header row
  for (let col = 0; col < totalColumns; col++) {
    const cell = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: col })
    if (ws[cell]) {
      if (col < fixedColumns) {
        ws[cell].s = STYLES.header
      } else {
        ws[cell].s = STYLES.dateHeader
      }
    }
  }

  // Style task rows
  organizedTasks.forEach((task, index) => {
    const rowIndex = headerRowIndex + index // Data starts after header
    const isPhase = task.is_summary || task.task_type === 'summary' || task.task_type === 'phase'
    const isAltRow = index % 2 === 1
    const baseStyle = isPhase ? STYLES.phaseRow : (isAltRow ? STYLES.taskRowAlt : STYLES.taskRow)
    const barColor = getBarColor(task)
    const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG['todo']

    for (let col = 0; col < totalColumns; col++) {
      const cell = XLSX.utils.encode_cell({ r: rowIndex, c: col })
      if (!ws[cell]) {
        ws[cell] = { v: '', t: 's' }
      }

      // Apply base style
      const cellStyle: any = { ...baseStyle }

      // Center alignment for certain columns
      if (col >= 2 && col <= 5) {
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' }
      }

      // Status column special styling
      if (col === 5) {
        cellStyle.font = { name: 'Calibri', sz: 9, bold: true, color: { rgb: statusConfig.textColor } }
        cellStyle.fill = { fgColor: { rgb: statusConfig.bgColor } }
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' }
      }

      // Timeline bar cells
      if (col >= fixedColumns) {
        const day = timelineDays[col - fixedColumns]
        if (isDateInTaskRange(day, task)) {
          cellStyle.fill = { fgColor: { rgb: barColor } }
          cellStyle.border = {
            top: { style: 'thin', color: { rgb: barColor } },
            bottom: { style: 'thin', color: { rgb: barColor } },
            left: { style: 'thin', color: { rgb: barColor } },
            right: { style: 'thin', color: { rgb: barColor } },
          }
        }
      }

      ws[cell].s = cellStyle
    }
  })

  // Merge cells for title
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Subtitle
  ]

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, ws, 'Cronograma')

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0]
  const safeName = projectName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
  const filename = `DaherPlan_${safeName}_Cronograma_${dateStr}.xlsx`

  // Download
  XLSX.writeFile(workbook, filename)
}
