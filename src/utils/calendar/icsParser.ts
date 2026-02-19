/**
 * ICS Parser utility using ical.js library
 *
 * Parses ICS calendar content and converts to ExternalCalendarEvent format
 * Supports recurring events (RRULE) expansion
 */

import ICAL from 'ical.js'
import { ExternalCalendarEvent } from '@/types/calendar'

// Maximum range for recurring event expansion (1 year)
const MAX_EXPANSION_DAYS = 365

/**
 * Parse ICS content and extract events, including recurring event expansion
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

    // Calculate expansion range (from today to 1 year in the future)
    const rangeStart = new Date()
    rangeStart.setMonth(rangeStart.getMonth() - 1) // Include 1 month in the past
    const rangeEnd = new Date()
    rangeEnd.setDate(rangeEnd.getDate() + MAX_EXPANSION_DAYS)

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent)

        // Skip events without start date
        if (!event.startDate) continue

        const baseUid = event.uid || `${subscriptionId}-${Date.now()}-${Math.random()}`
        const summary = event.summary || 'Evento sem título'
        const description = event.description || undefined
        const location = event.location || undefined
        const isAllDay = event.startDate.isDate

        // Check if event is recurring
        if (event.isRecurring()) {
          // Expand recurring events
          const expandedEvents = expandRecurringEvent(
            event,
            vevent,
            rangeStart,
            rangeEnd,
            baseUid,
            summary,
            description,
            location,
            isAllDay,
            subscriptionId,
            subscriptionName,
            color
          )
          events.push(...expandedEvents)
        } else {
          // Single event (non-recurring)
          const externalEvent: ExternalCalendarEvent = {
            uid: baseUid,
            summary,
            description,
            start: event.startDate.toJSDate().toISOString(),
            end: event.endDate ? event.endDate.toJSDate().toISOString() : undefined,
            allDay: isAllDay,
            location,
            subscriptionId,
            subscriptionName,
            color,
          }
          events.push(externalEvent)
        }
      } catch (err) {
        // Skip invalid events but log for debugging
        console.warn('Error parsing event:', err)
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
 * Expand a recurring event into individual occurrences
 */
function expandRecurringEvent(
  event: ICAL.Event,
  _vevent: ICAL.Component,
  rangeStart: Date,
  rangeEnd: Date,
  baseUid: string,
  summary: string,
  description: string | undefined,
  location: string | undefined,
  isAllDay: boolean,
  subscriptionId: string,
  subscriptionName: string,
  color: string
): ExternalCalendarEvent[] {
  const expandedEvents: ExternalCalendarEvent[] = []

  try {
    // Calculate event duration
    const eventDuration = event.endDate && event.startDate
      ? event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime()
      : 0

    // Create iterator for recurring events
    const iterator = event.iterator()

    // Limit iterations to prevent infinite loops
    let count = 0
    const maxIterations = 500

    let next = iterator.next()

    while (next && count < maxIterations) {
      const occurrenceStart = next.toJSDate()

      // Stop if we've gone past our range
      if (occurrenceStart > rangeEnd) {
        break
      }

      // Only include occurrences within our range
      if (occurrenceStart >= rangeStart) {
        const occurrenceEnd = eventDuration > 0
          ? new Date(occurrenceStart.getTime() + eventDuration)
          : undefined

        const externalEvent: ExternalCalendarEvent = {
          uid: `${baseUid}-${occurrenceStart.toISOString()}`,
          summary,
          description,
          start: occurrenceStart.toISOString(),
          end: occurrenceEnd?.toISOString(),
          allDay: isAllDay,
          location,
          subscriptionId,
          subscriptionName,
          color,
        }

        expandedEvents.push(externalEvent)
      }

      count++
      next = iterator.next()
    }
  } catch (err) {
    console.warn('Error expanding recurring event:', err)

    // Fallback: at least return the base event
    const externalEvent: ExternalCalendarEvent = {
      uid: baseUid,
      summary,
      description,
      start: event.startDate.toJSDate().toISOString(),
      end: event.endDate ? event.endDate.toJSDate().toISOString() : undefined,
      allDay: isAllDay,
      location,
      subscriptionId,
      subscriptionName,
      color,
    }
    expandedEvents.push(externalEvent)
  }

  return expandedEvents
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
