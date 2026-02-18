/**
 * CORS Proxy utility for fetching external ICS calendar URLs
 *
 * External calendar URLs (Google, Outlook) typically block cross-origin requests.
 * This utility uses public CORS proxies with a fallback chain for reliability.
 */

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
]

/**
 * Fetch content through CORS proxy with fallback chain
 */
export async function fetchWithCorsProxy(url: string): Promise<string> {
  // First, try direct fetch (some calendars support CORS)
  try {
    const directResponse = await fetch(url, {
      headers: {
        'Accept': 'text/calendar, text/plain, */*',
      },
    })
    if (directResponse.ok) {
      return await directResponse.text()
    }
  } catch {
    // Direct fetch failed, try proxies
  }

  // Try each proxy in sequence
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url)
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/calendar, text/plain, */*',
        },
      })

      if (response.ok) {
        const content = await response.text()
        // Validate that it looks like ICS content
        if (content.includes('BEGIN:VCALENDAR') || content.includes('BEGIN:VEVENT')) {
          return content
        }
      }
    } catch {
      // This proxy failed, try next
      continue
    }
  }

  throw new Error('Falha ao buscar calendário. Verifique se a URL é pública e acessível.')
}

/**
 * Validate ICS URL format
 */
export function isValidICSUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }
    // Should end with .ics or be a known calendar URL pattern
    const isIcsFile = parsed.pathname.endsWith('.ics')
    const isGoogleCalendar = parsed.hostname.includes('google.com') && parsed.pathname.includes('calendar')
    const isOutlookCalendar = parsed.hostname.includes('outlook') || parsed.hostname.includes('office365')
    const isAppleCalendar = parsed.hostname.includes('icloud.com')

    return isIcsFile || isGoogleCalendar || isOutlookCalendar || isAppleCalendar
  } catch {
    return false
  }
}

/**
 * Detect calendar type from URL
 */
export function detectCalendarType(url: string): 'google' | 'outlook' | 'apple' | 'other' {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('google.com')) return 'google'
    if (parsed.hostname.includes('outlook') || parsed.hostname.includes('office365') || parsed.hostname.includes('live.com')) return 'outlook'
    if (parsed.hostname.includes('icloud.com')) return 'apple'
    return 'other'
  } catch {
    return 'other'
  }
}
