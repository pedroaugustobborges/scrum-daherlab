/**
 * ICS Parser utility using ical.js library
 *
 * Parses ICS calendar content and converts to ExternalCalendarEvent format
 */

import ICAL from 'ical.js'
import { ExternalCalendarEvent } from '@/types/calendar'

/**
 * Parse ICS content and extract events
 */
export function parseICSContent(
  icsContent: string,
  subscriptionId: string,
  subscriptionName: string,
  color: string
): ExternalCalendarEvent[] {
  try {
    const jcalData = ICAL.parse(icsContent)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    const events: ExternalCalendarEvent[] = []

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent)

        // Skip events without start date
        if (!event.startDate) continue

        const externalEvent: ExternalCalendarEvent = {
          uid: event.uid || `${subscriptionId}-${Date.now()}-${Math.random()}`,
          summary: event.summary || 'Evento sem título',
          description: event.description || undefined,
          start: event.startDate.toJSDate().toISOString(),
          end: event.endDate ? event.endDate.toJSDate().toISOString() : undefined,
          allDay: event.startDate.isDate,
          location: event.location || undefined,
          subscriptionId,
          subscriptionName,
          color,
        }

        events.push(externalEvent)
      } catch {
        // Skip invalid events
        continue
      }
    }

    return events
  } catch (error) {
    console.error('Error parsing ICS content:', error)
    throw new Error('Falha ao processar arquivo de calendário. Verifique se o formato é válido.')
  }
}

/**
 * Filter events within a date range
 */
export function filterEventsByDateRange(
  events: ExternalCalendarEvent[],
  startDate: Date,
  endDate: Date
): ExternalCalendarEvent[] {
  const start = startDate.getTime()
  const end = endDate.getTime()

  return events.filter((event) => {
    const eventStart = new Date(event.start).getTime()
    const eventEnd = event.end ? new Date(event.end).getTime() : eventStart

    // Event overlaps with range if:
    // - Event starts before range ends AND event ends after range starts
    return eventStart <= end && eventEnd >= start
  })
}

/**
 * Convert external event to display format with proper date parsing
 */
export function parseExternalEventDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}
