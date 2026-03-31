import * as XLSX from 'xlsx'
import type { HierarchicalTask, TaskDependency } from '@/types/hybrid'

interface ExportOptions {
  projectName: string
  tasks: HierarchicalTask[]
  dependencies: TaskDependency[]
  teamMembers: Map<string, string> // id -> name
}

const STATUS_LABELS: Record<string, string> = {
  'todo': 'A Fazer',
  'in-progress': 'Em Progresso',
  'review': 'Em Revisão',
  'done': 'Concluído',
  'blocked': 'Bloqueado',
}

const PRIORITY_LABELS: Record<string, string> = {
  'low': 'Baixa',
  'medium': 'Média',
  'high': 'Alta',
  'urgent': 'Urgente',
}

/**
 * Format date for Excel display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR')
}

/**
 * Calculate duration between dates
 */
function calculateDuration(startDate: string | null, endDate: string | null, plannedDuration: number | null): string {
  if (!startDate || !endDate) {
    return plannedDuration ? `${plannedDuration}d` : ''
  }
  const [startYear, startMonth, startDay] = startDate.split('T')[0].split('-').map(Number)
  const [endYear, endMonth, endDay] = endDate.split('T')[0].split('-').map(Number)
  const start = new Date(startYear, startMonth - 1, startDay)
  const end = new Date(endYear, endMonth - 1, endDay)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays > 0 ? `${diffDays}d` : '1d'
}

/**
 * Build hierarchy map for tasks
 */
function buildHierarchyMap(tasks: HierarchicalTask[]): Map<string, { level: number; parentTitle: string }> {
  const map = new Map<string, { level: number; parentTitle: string }>()
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  function getLevel(taskId: string, visited = new Set<string>()): number {
    if (visited.has(taskId)) return 0
    visited.add(taskId)

    const task = taskMap.get(taskId)
    if (!task || !task.parent_task_id) return 0
    return 1 + getLevel(task.parent_task_id, visited)
  }

  function getParentTitle(taskId: string): string {
    const task = taskMap.get(taskId)
    if (!task || !task.parent_task_id) return ''
    const parent = taskMap.get(task.parent_task_id)
    return parent?.title || ''
  }

  tasks.forEach(task => {
    map.set(task.id, {
      level: getLevel(task.id),
      parentTitle: getParentTitle(task.id),
    })
  })

  return map
}

/**
 * Format predecessors for display (like Microsoft Project)
 * Format: WBS_CODE or Row_Number with dependency type suffix
 */
function formatPredecessors(
  taskId: string,
  dependencies: TaskDependency[],
  taskMap: Map<string, HierarchicalTask>,
  taskIndexMap: Map<string, number>
): string {
  const predecessors = dependencies.filter(d => d.successor_id === taskId)
  if (predecessors.length === 0) return ''

  return predecessors.map(dep => {
    const predecessor = taskMap.get(dep.predecessor_id)
    if (!predecessor) return ''

    // Use WBS code if available, otherwise use row number
    const identifier = predecessor.wbs_code || `${(taskIndexMap.get(dep.predecessor_id) || 0) + 1}`

    // Add dependency type suffix (FS is default, show others)
    const typeSuffix = dep.dependency_type !== 'FS' ? dep.dependency_type : ''

    // Add lag if present
    const lagSuffix = dep.lag_days && dep.lag_days !== 0
      ? (dep.lag_days > 0 ? `+${dep.lag_days}d` : `${dep.lag_days}d`)
      : ''

    return `${identifier}${typeSuffix}${lagSuffix}`
  }).filter(Boolean).join('; ')
}

/**
 * Format successors for display
 */
function formatSuccessors(
  taskId: string,
  dependencies: TaskDependency[],
  taskMap: Map<string, HierarchicalTask>,
  taskIndexMap: Map<string, number>
): string {
  const successors = dependencies.filter(d => d.predecessor_id === taskId)
  if (successors.length === 0) return ''

  return successors.map(dep => {
    const successor = taskMap.get(dep.successor_id)
    if (!successor) return ''

    const identifier = successor.wbs_code || `${(taskIndexMap.get(dep.successor_id) || 0) + 1}`
    const typeSuffix = dep.dependency_type !== 'FS' ? dep.dependency_type : ''
    const lagSuffix = dep.lag_days && dep.lag_days !== 0
      ? (dep.lag_days > 0 ? `+${dep.lag_days}d` : `${dep.lag_days}d`)
      : ''

    return `${identifier}${typeSuffix}${lagSuffix}`
  }).filter(Boolean).join('; ')
}

/**
 * Create indented task name for hierarchy visualization
 */
function createIndentedName(title: string, level: number): string {
  const indent = '    '.repeat(level) // 4 spaces per level
  return indent + title
}

/**
 * Export tasks to XLSX file similar to Microsoft Project format
 */
export function exportGridToXLSX(options: ExportOptions): void {
  const { projectName, tasks, dependencies, teamMembers } = options

  // Sort tasks by order_index to maintain grid order
  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index)

  // Build helper maps
  const taskMap = new Map(sortedTasks.map(t => [t.id, t]))
  const taskIndexMap = new Map(sortedTasks.map((t, i) => [t.id, i]))
  const hierarchyMap = buildHierarchyMap(sortedTasks)

  // Create data rows
  const data = sortedTasks.map((task, index) => {
    const hierarchy = hierarchyMap.get(task.id) || { level: 0, parentTitle: '' }
    const assignedName = task.assigned_to
      ? (teamMembers.get(task.assigned_to) || task.assigned_to_profile?.full_name || 'Não atribuído')
      : ''

    return {
      'ID': index + 1,
      'WBS': task.wbs_code || '',
      'Nível': hierarchy.level,
      'Nome da Tarefa': createIndentedName(task.title, hierarchy.level),
      'Tarefa Pai': hierarchy.parentTitle,
      'Tipo': task.task_type === 'milestone' ? 'Marco'
             : task.task_type === 'summary' || task.is_summary ? 'Resumo'
             : 'Tarefa',
      'Responsável': assignedName,
      'Data de Início': formatDate(task.start_date),
      'Data de Término': formatDate(task.end_date),
      'Duração': calculateDuration(task.start_date, task.end_date, task.planned_duration),
      '% Concluído': task.percent_complete || 0,
      'Status': STATUS_LABELS[task.status] || task.status,
      'Prioridade': PRIORITY_LABELS[task.priority] || task.priority,
      'Predecessoras': formatPredecessors(task.id, dependencies, taskMap, taskIndexMap),
      'Sucessoras': formatSuccessors(task.id, dependencies, taskMap, taskIndexMap),
      'Story Points': task.story_points || '',
      'Horas Estimadas': task.estimated_hours || '',
      'Caminho Crítico': task.is_critical ? 'Sim' : '',
    }
  })

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Set column widths for better readability
  const columnWidths = [
    { wch: 5 },   // ID
    { wch: 10 },  // WBS
    { wch: 6 },   // Nível
    { wch: 50 },  // Nome da Tarefa (wide for indentation)
    { wch: 30 },  // Tarefa Pai
    { wch: 10 },  // Tipo
    { wch: 25 },  // Responsável
    { wch: 14 },  // Data de Início
    { wch: 14 },  // Data de Término
    { wch: 10 },  // Duração
    { wch: 12 },  // % Concluído
    { wch: 14 },  // Status
    { wch: 12 },  // Prioridade
    { wch: 20 },  // Predecessoras
    { wch: 20 },  // Sucessoras
    { wch: 12 },  // Story Points
    { wch: 14 },  // Horas Estimadas
    { wch: 14 },  // Caminho Crítico
  ]
  worksheet['!cols'] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma')

  // Create summary sheet
  const summaryData = [
    { 'Informação': 'Projeto', 'Valor': projectName },
    { 'Informação': 'Data de Exportação', 'Valor': new Date().toLocaleString('pt-BR') },
    { 'Informação': 'Total de Tarefas', 'Valor': tasks.length },
    { 'Informação': 'Tarefas Concluídas', 'Valor': tasks.filter(t => t.status === 'done').length },
    { 'Informação': 'Tarefas em Progresso', 'Valor': tasks.filter(t => t.status === 'in-progress').length },
    { 'Informação': 'Tarefas Bloqueadas', 'Valor': tasks.filter(t => t.status === 'blocked').length },
    { 'Informação': 'Total de Dependências', 'Valor': dependencies.length },
    { 'Informação': 'Tarefas no Caminho Crítico', 'Valor': tasks.filter(t => t.is_critical).length },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo')

  // Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Cronograma_${dateStr}.xlsx`

  // Download the file
  XLSX.writeFile(workbook, filename)
}
