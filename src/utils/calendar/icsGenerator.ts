/**
 * ICS Generator utility
 *
 * Generates ICS calendar files from app events (tasks, sprints, deadlines)
 * for export to Google Calendar, Outlook, etc.
 */

interface ExportableEvent {
  id: string
  title: string
  date: Date
  endDate?: Date
  description?: string
  projectName?: string
  assignee?: string
  status?: string
  type: string
}

/**
 * Generate ICS content from events
 */
export function generateICSContent(
  events: ExportableEvent[],
  calendarName: string = 'Scrum Dashboard'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Scrum Dashboard//Calendar Export//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
  ]

  for (const event of events) {
    const eventLines = generateEventLines(event)
    lines.push(...eventLines)
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Generate VEVENT lines for a single event
 */
function generateEventLines(event: ExportableEvent): string[] {
  const now = new Date()
  const uid = `${event.id}@scrumdashboard.app`
  const dtstamp = formatICSDate(now)
  const dtstart = formatICSDate(event.date)
  const dtend = event.endDate ? formatICSDate(event.endDate) : formatICSDate(addDays(event.date, 1))

  // Build description with metadata
  const descriptionParts: string[] = []
  if (event.projectName) descriptionParts.push(`Projeto: ${event.projectName}`)
  if (event.assignee) descriptionParts.push(`Responsável: ${event.assignee}`)
  if (event.status) descriptionParts.push(`Status: ${event.status}`)
  if (event.description) descriptionParts.push(`\\n${event.description}`)

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ]

  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICSText(descriptionParts.join('\\n'))}`)
  }

  // Add category based on event type
  const categoryMap: Record<string, string> = {
    task: 'Tarefa',
    sprint: 'Sprint',
    deadline: 'Prazo',
    project: 'Projeto',
  }
  if (categoryMap[event.type]) {
    lines.push(`CATEGORIES:${categoryMap[event.type]}`)
  }

  lines.push('END:VEVENT')

  return lines
}

/**
 * Format date for ICS (YYYYMMDD for all-day events)
 */
function formatICSDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Escape text for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Download ICS file
 */
export function downloadICS(content: string, filename: string = 'calendario'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate and download ICS file
 */
export function exportCalendarToICS(
  events: ExportableEvent[],
  filename: string = 'scrum-dashboard',
  calendarName: string = 'Scrum Dashboard'
): void {
  const content = generateICSContent(events, calendarName)
  downloadICS(content, filename)
}
