// Calendar subscription stored in database
export interface CalendarSubscription {
  id: string
  user_id: string
  name: string
  ics_url: string
  color: string
  calendar_type: 'google' | 'outlook' | 'apple' | 'other'
  is_enabled: boolean
  last_synced_at: string | null
  last_sync_error: string | null
  cached_events: ExternalCalendarEvent[]
  created_at: string
  updated_at: string
}

// External event from ICS
export interface ExternalCalendarEvent {
  uid: string
  summary: string
  description?: string
  start: string // ISO date string
  end?: string // ISO date string
  allDay: boolean
  location?: string
  subscriptionId: string
  subscriptionName: string
  color: string
}

// Form data for creating subscription
export interface CalendarSubscriptionCreate {
  name: string
  ics_url: string
  color: string
  calendar_type: 'google' | 'outlook' | 'apple' | 'other'
}

// Form data for updating subscription
export interface CalendarSubscriptionUpdate {
  name?: string
  ics_url?: string
  color?: string
  calendar_type?: 'google' | 'outlook' | 'apple' | 'other'
  is_enabled?: boolean
  last_synced_at?: string
  last_sync_error?: string | null
  cached_events?: ExternalCalendarEvent[]
}

// Calendar type options for UI
export const CALENDAR_TYPE_OPTIONS = [
  { value: 'google', label: 'Google Calendar', icon: 'google' },
  { value: 'outlook', label: 'Microsoft Outlook', icon: 'outlook' },
  { value: 'apple', label: 'Apple Calendar', icon: 'apple' },
  { value: 'other', label: 'Outro', icon: 'calendar' },
] as const

// Default colors for calendar subscriptions
export const CALENDAR_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
]
