import type { GanttZoomLevel } from '@/types/hybrid'

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((end.getTime() - start.getTime()) / msPerDay)
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get start of week (Monday)
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1)
  result.setDate(diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  const result = new Date(date)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get start of quarter
 */
export function startOfQuarter(date: Date): Date {
  const result = new Date(date)
  const month = result.getMonth()
  const quarterStart = month - (month % 3)
  result.setMonth(quarterStart)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get start of year
 */
export function startOfYear(date: Date): Date {
  const result = new Date(date)
  result.setMonth(0)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Format date for display based on zoom level
 */
export function formatDateForZoom(date: Date, zoom: GanttZoomLevel): string {
  switch (zoom) {
    case 'day':
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    case 'week':
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    case 'month':
      return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `T${quarter} ${date.getFullYear()}`
    case 'year':
      return date.getFullYear().toString()
    default:
      return date.toLocaleDateString('pt-BR')
  }
}

/**
 * Get unit width in pixels based on zoom level
 */
export function getUnitWidth(zoom: GanttZoomLevel): number {
  switch (zoom) {
    case 'day':
      return 40
    case 'week':
      return 120
    case 'month':
      return 150
    case 'quarter':
      return 200
    case 'year':
      return 250
    default:
      return 40
  }
}

/**
 * Get the number of units to display based on zoom level
 */
export function getUnitsInRange(start: Date, end: Date, zoom: GanttZoomLevel): number {
  const days = daysBetween(start, end)

  switch (zoom) {
    case 'day':
      return days
    case 'week':
      return Math.ceil(days / 7)
    case 'month':
      const startMonth = start.getMonth() + start.getFullYear() * 12
      const endMonth = end.getMonth() + end.getFullYear() * 12
      return endMonth - startMonth + 1
    case 'quarter':
      const startQuarter = Math.floor(start.getMonth() / 3) + start.getFullYear() * 4
      const endQuarter = Math.floor(end.getMonth() / 3) + end.getFullYear() * 4
      return endQuarter - startQuarter + 1
    case 'year':
      return end.getFullYear() - start.getFullYear() + 1
    default:
      return days
  }
}

/**
 * Generate timeline units for the header
 */
export function generateTimelineUnits(
  start: Date,
  end: Date,
  zoom: GanttZoomLevel
): Array<{ date: Date; label: string; width: number; isWeekend: boolean; isToday: boolean }> {
  const units: Array<{ date: Date; label: string; width: number; isWeekend: boolean; isToday: boolean }> = []
  const unitWidth = getUnitWidth(zoom)

  let current = new Date(start)

  while (current <= end) {
    units.push({
      date: new Date(current),
      label: formatDateForZoom(current, zoom),
      width: unitWidth,
      isWeekend: isWeekend(current),
      isToday: isToday(current),
    })

    // Increment based on zoom level
    switch (zoom) {
      case 'day':
        current = addDays(current, 1)
        break
      case 'week':
        current = addDays(current, 7)
        break
      case 'month':
        current.setMonth(current.getMonth() + 1)
        break
      case 'quarter':
        current.setMonth(current.getMonth() + 3)
        break
      case 'year':
        current.setFullYear(current.getFullYear() + 1)
        break
    }
  }

  return units
}

/**
 * Calculate X position for a date within the timeline
 */
export function dateToX(date: Date, timelineStart: Date, zoom: GanttZoomLevel): number {
  const unitWidth = getUnitWidth(zoom)
  const days = daysBetween(timelineStart, date)

  switch (zoom) {
    case 'day':
      return days * unitWidth
    case 'week':
      return (days / 7) * unitWidth
    case 'month':
      // Approximate: assume 30 days per month
      return (days / 30) * unitWidth
    case 'quarter':
      return (days / 91) * unitWidth
    case 'year':
      return (days / 365) * unitWidth
    default:
      return days * unitWidth
  }
}

/**
 * Calculate bar width for a date range
 */
export function dateRangeToWidth(start: Date, end: Date, zoom: GanttZoomLevel): number {
  const days = daysBetween(start, end) + 1 // Include end day
  const unitWidth = getUnitWidth(zoom)

  switch (zoom) {
    case 'day':
      return days * unitWidth
    case 'week':
      return (days / 7) * unitWidth
    case 'month':
      return (days / 30) * unitWidth
    case 'quarter':
      return (days / 91) * unitWidth
    case 'year':
      return (days / 365) * unitWidth
    default:
      return days * unitWidth
  }
}

/**
 * Get date range for project tasks
 */
export function getProjectDateRange(
  tasks: Array<{ start_date?: string | null; end_date?: string | null }>
): { start: Date; end: Date } {
  const now = new Date()
  let minDate = now
  let maxDate = addDays(now, 30) // Default 30 days

  tasks.forEach((task) => {
    if (task.start_date) {
      const startDate = new Date(task.start_date)
      if (startDate < minDate) minDate = startDate
    }
    if (task.end_date) {
      const endDate = new Date(task.end_date)
      if (endDate > maxDate) maxDate = endDate
    }
  })

  // Add padding
  const paddedStart = addDays(minDate, -7)
  const paddedEnd = addDays(maxDate, 14)

  return { start: paddedStart, end: paddedEnd }
}
