import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '@/lib/supabase'

interface ProjectData {
  id: string
  name: string
  description: string
  status: string
  start_date: string
  end_date: string
}

interface TaskData {
  id: string
  title: string
  description: string
  status: string
  assigned_to_profile?: { full_name: string }
  sprint_id?: string
  project_id?: string
}

interface SprintData {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

const statusLabels: Record<string, string> = {
  todo: 'A Fazer',
  'in-progress': 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
  blocked: 'Bloqueado',
  planning: 'Planejamento',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export async function exportProjectsToPDF() {
  try {
    // Fetch active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (projectsError) throw projectsError
    if (!projects || projects.length === 0) {
      throw new Error('Nenhum projeto ativo encontrado')
    }

    // Fetch all tasks for these projects
    const projectIds = projects.map((p: ProjectData) => p.id)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
      .in('project_id', projectIds)
      .order('created_at')

    if (tasksError) throw tasksError

    // Fetch all sprints
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('*')
      .order('start_date')

    if (sprintsError) throw sprintsError

    // Create PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    // Set up colors matching the app's theme
    const primaryColor = [99, 102, 241] // #6366f1
    const secondaryColor = [139, 92, 246] // #8b5cf6
    const textColor = [31, 41, 55] // #1f2937

    // Add logo with proper aspect ratio
    try {
      const logoImg = new Image()
      logoImg.src = '/logo-daherlab.png'
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve
        logoImg.onerror = reject
      })
      // Calculate proper dimensions maintaining aspect ratio
      const logoWidth = 40
      const aspectRatio = logoImg.height / logoImg.width
      const logoHeight = logoWidth * aspectRatio
      doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight)
    } catch (error) {
      console.warn('Could not load logo:', error)
    }

    // Add title and slogan
    doc.setFontSize(22)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Plano de Ação - Projetos Ativos', 148, 15, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont('helvetica', 'italic')
    doc.text('inovar é cuidar do futuro', 148, 22, { align: 'center' })

    // Add date
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    const today = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    doc.text(`Data de emissão: ${today}`, 277, 15, { align: 'right' })

    // Prepare table data with merged cells
    const tableData: any[] = []

    projects.forEach((project: ProjectData) => {
      // Only include tasks that have sprint assignments
      const projectTasks = (tasks || []).filter(
        (task: TaskData) => task.project_id === project.id && task.sprint_id
      )

      if (projectTasks.length === 0) {
        // Skip projects with no tasks assigned to sprints
        return
      }

      // Find last sprint end date among project tasks
      let lastSprintEndDate: Date | null = null
      projectTasks.forEach((task: TaskData) => {
        const sprint = sprints?.find((s: SprintData) => s.id === task.sprint_id)
        if (sprint && sprint.end_date) {
          const sprintEnd = new Date(sprint.end_date)
          if (lastSprintEndDate === null) {
            lastSprintEndDate = sprintEnd
          } else {
            const currentEndTime = (lastSprintEndDate as Date).getTime()
            if (sprintEnd.getTime() > currentEndTime) {
              lastSprintEndDate = sprintEnd
            }
          }
        }
      })

      // Check if we need to add "Prazo para as ações remanescentes"
      const projectEndDate = project.end_date ? new Date(project.end_date) : null
      let needsRemainingActions = false
      if (projectEndDate !== null && lastSprintEndDate !== null) {
        const projectEndTime = projectEndDate.getTime()
        const lastSprintEndTime = (lastSprintEndDate as Date).getTime()
        needsRemainingActions = projectEndTime > lastSprintEndTime
      }

      // Calculate actual row count (including remaining actions row if needed)
      const taskCount = projectTasks.length + (needsRemainingActions ? 1 : 0)

      projectTasks.forEach((task: TaskData, index: number) => {
        // Find the sprint for this task (product backlog)
        const sprint = sprints?.find((s: SprintData) => s.id === task.sprint_id)

        // Get dates and status from sprint
        const prazoInicial = sprint ? formatDate(sprint.start_date) : '-'
        const prazoFinal = sprint ? formatDate(sprint.end_date) : '-'
        const status = sprint ? (statusLabels[sprint.status] || sprint.status) : '-'

        if (index === 0) {
          // First row includes merged cells with rowSpan
          tableData.push([
            { content: project.name, rowSpan: taskCount, styles: { fontStyle: 'bold', valign: 'middle' } },
            { content: project.description || '-', rowSpan: taskCount, styles: { valign: 'middle' } },
            task.title,
            task.assigned_to_profile?.full_name || '-',
            prazoInicial,
            prazoFinal,
            status,
          ])
        } else {
          // Subsequent rows - DON'T include the merged columns
          tableData.push([
            task.title,
            task.assigned_to_profile?.full_name || '-',
            prazoInicial,
            prazoFinal,
            status,
          ])
        }
      })

      // Add "Prazo para as ações remanescentes" if needed
      if (needsRemainingActions && lastSprintEndDate && projectEndDate) {
        const nextDay = new Date(lastSprintEndDate)
        nextDay.setDate(nextDay.getDate() + 1)

        tableData.push([
          'Prazo para as ações remanescentes',
          '-',
          formatDate(nextDay.toISOString()),
          formatDate(project.end_date),
          '-',
        ])
      }
    })

    // Check if we have data to export
    if (tableData.length === 0) {
      throw new Error('Nenhuma ação com sprint atribuído foi encontrada nos projetos ativos')
    }

    // Generate table
    autoTable(doc, {
      startY: 45,
      head: [
        [
          'Produto',
          'Descrição',
          'Ação',
          'Responsabilidade',
          'Prazo Inicial',
          'Prazo Final',
          'Status',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        valign: 'middle',
        cellPadding: 4,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 35 }, // Produto (bold set via rowSpan styles)
        1: { cellWidth: 45 }, // Descrição
        2: { cellWidth: 60 }, // Ação
        3: { cellWidth: 35, halign: 'center' }, // Responsabilidade
        4: { cellWidth: 25, halign: 'center' }, // Prazo Inicial
        5: { cellWidth: 25, halign: 'center' }, // Prazo Final
        6: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, // Status
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray for alternate rows
      },
      didParseCell: (data) => {
        // Add gradient effect to status column
        if (data.column.index === 6 && data.section === 'body') {
          const status = data.cell.text[0]
          if (status === 'Concluído' || status === 'Ativo') {
            data.cell.styles.textColor = [16, 185, 129] // Green
          } else if (status === 'Em Progresso' || status === 'Planejamento') {
            data.cell.styles.textColor = [245, 158, 11] // Orange
          } else if (status === 'Bloqueado' || status === 'Cancelado') {
            data.cell.styles.textColor = [239, 68, 68] // Red
          } else if (status === 'Em Revisão') {
            data.cell.styles.textColor = [139, 92, 246] // Purple
          }
        }
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
    })

    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'italic')

      // Footer text
      doc.text(
        'DaherLab - Sistema de Gestão de Projetos',
        148,
        200,
        { align: 'center' }
      )

      // Page number
      doc.text(
        `Página ${i} de ${pageCount}`,
        277,
        200,
        { align: 'right' }
      )
    }

    // Save the PDF
    const fileName = `Plano_de_Acao_${today.replace(/\//g, '-')}.pdf`
    doc.save(fileName)

    return true
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}
