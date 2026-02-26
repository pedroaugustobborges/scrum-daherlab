/**
 * CORS Proxy utility for fetching external ICS calendar URLs
 *
 * Uses Supabase Edge Function as primary proxy (most reliable),
 * with public CORS proxies as fallback.
 */

// Get Supabase URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

interface ProxyConfig {
  buildUrl: (targetUrl: string) => string
  name: string
}

const FALLBACK_PROXIES: ProxyConfig[] = [
  {
    name: 'allorigins',
    buildUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'corsproxy.io',
    buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  },
  {
    name: 'thingproxy',
    buildUrl: (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  },
]

/**
 * Fetch ICS content using Supabase Edge Function (primary method)
 */
async function fetchWithEdgeFunction(url: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[Calendar Sync] Supabase not configured, skipping edge function')
    return null
  }

  try {
    console.log('[Calendar Sync] Trying Supabase Edge Function...')

    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-ics-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ url }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.content) {
        console.log('[Calendar Sync] Success with Edge Function')
        return data.content
      }
    } else {
      const error = await response.json().catch(() => ({}))
      console.log('[Calendar Sync] Edge Function failed:', error.error || response.status)
    }
  } catch (e) {
    console.log('[Calendar Sync] Edge Function error:', e instanceof Error ? e.message : 'Unknown')
  }

  return null
}

/**
 * Fetch content through CORS proxy with fallback chain
 */
export async function fetchWithCorsProxy(url: string): Promise<string> {
  const errors: string[] = []

  // 1. Try Supabase Edge Function first (most reliable)
  const edgeFunctionResult = await fetchWithEdgeFunction(url)
  if (edgeFunctionResult) {
    return edgeFunctionResult
  }
  errors.push('Edge Function: Failed or not available')

  // 2. Add cache-buster for fallback proxies
  const separator = url.includes('?') ? '&' : '?'
  const urlWithCacheBuster = `${url}${separator}_cb=${Date.now()}`

  // 3. Try fallback public proxies
  for (const proxy of FALLBACK_PROXIES) {
    try {
      const proxyUrl = proxy.buildUrl(urlWithCacheBuster)
      console.log(`[Calendar Sync] Trying fallback proxy: ${proxy.name}`)

      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/calendar, text/plain, */*',
        },
        cache: 'no-store',
      })

      if (response.ok) {
        const content = await response.text()
        // Validate that it looks like ICS content
        if (content.includes('BEGIN:VCALENDAR') || content.includes('BEGIN:VEVENT')) {
          console.log(`[Calendar Sync] Success with fallback proxy: ${proxy.name}`)
          return content
        } else {
          errors.push(`${proxy.name}: Invalid ICS content`)
        }
      } else {
        errors.push(`${proxy.name}: HTTP ${response.status}`)
      }
    } catch (e) {
      errors.push(`${proxy.name}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      continue
    }
  }

  console.error('[Calendar Sync] All methods failed:', errors)
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
