import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import {
  CalendarSubscription,
  CalendarSubscriptionCreate,
  CalendarSubscriptionUpdate,
  ExternalCalendarEvent,
  CalendarFeedToken,
} from '@/types/calendar'
import { fetchWithCorsProxy } from '@/utils/calendar/corsProxy'
import { parseICSContent, filterEventsByDateRange } from '@/utils/calendar/icsParser'
import toast from 'react-hot-toast'

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Fetch all calendar subscriptions for a user
 */
export function useCalendarSubscriptions(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.calendarSubscriptions.list(userId || ''),
    queryFn: async (): Promise<CalendarSubscription[]> => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Create a new calendar subscription
 */
export function useCreateCalendarSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      subscription,
    }: {
      userId: string
      subscription: CalendarSubscriptionCreate
    }) => {
      // First, try to fetch and parse the ICS to validate it
      const icsContent = await fetchWithCorsProxy(subscription.ics_url)
      const events = parseICSContent(
        icsContent,
        'temp',
        subscription.name,
        subscription.color
      )

      // Insert into database with cached events
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .insert({
          user_id: userId,
          name: subscription.name,
          ics_url: subscription.ics_url,
          color: subscription.color,
          calendar_type: subscription.calendar_type,
          cached_events: events,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.list(userId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.externalEvents.all,
      })
      toast.success('Calendário adicionado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Falha ao adicionar calendário')
    },
  })
}

/**
 * Update a calendar subscription
 */
export function useUpdateCalendarSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      userId: string
      updates: CalendarSubscriptionUpdate
    }) => {
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.list(userId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.externalEvents.all,
      })
    },
  })
}

/**
 * Delete a calendar subscription
 */
export function useDeleteCalendarSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('calendar_subscriptions')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.list(userId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.externalEvents.all,
      })
      toast.success('Calendário removido com sucesso!')
    },
    onError: () => {
      toast.error('Falha ao remover calendário')
    },
  })
}

/**
 * Refresh (re-sync) a calendar subscription
 */
export function useRefreshCalendarSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      subscription,
    }: {
      subscription: CalendarSubscription
    }) => {
      // Fetch fresh ICS content
      const icsContent = await fetchWithCorsProxy(subscription.ics_url)
      const events = parseICSContent(
        icsContent,
        subscription.id,
        subscription.name,
        subscription.color
      )

      // Update cached events in database
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .update({
          cached_events: events,
          last_synced_at: new Date().toISOString(),
          last_sync_error: null,
        })
        .eq('id', subscription.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.list(data.user_id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.externalEvents.all,
      })
      toast.success('Calendário sincronizado!')
    },
    onError: async (error: Error, { subscription }) => {
      // Store error in database
      await supabase
        .from('calendar_subscriptions')
        .update({
          last_sync_error: error.message,
        })
        .eq('id', subscription.id)

      toast.error('Falha ao sincronizar calendário')
    },
  })
}

/**
 * Auto-refresh stale subscriptions (older than 15 minutes)
 */
export function useAutoRefreshSubscriptions(userId: string | undefined) {
  const { data: subscriptions = [] } = useCalendarSubscriptions(userId)
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['auto-refresh-subscriptions', userId],
    queryFn: async () => {
      const enabledSubscriptions = subscriptions.filter((s) => s.is_enabled)
      const staleThreshold = 15 * 60 * 1000 // 15 minutes in ms

      for (const sub of enabledSubscriptions) {
        const lastSynced = sub.last_synced_at ? new Date(sub.last_synced_at).getTime() : 0
        const isStale = Date.now() - lastSynced > staleThreshold

        if (isStale) {
          try {
            // Fetch fresh ICS content
            const icsContent = await fetchWithCorsProxy(sub.ics_url)
            const events = parseICSContent(icsContent, sub.id, sub.name, sub.color)

            // Update cached events in database
            await supabase
              .from('calendar_subscriptions')
              .update({
                cached_events: events,
                last_synced_at: new Date().toISOString(),
                last_sync_error: null,
              })
              .eq('id', sub.id)
          } catch (error) {
            console.error(`Failed to refresh subscription ${sub.name}:`, error)
          }
        }
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.list(userId || ''),
      })

      return Date.now()
    },
    enabled: !!userId && subscriptions.length > 0,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    refetchIntervalInBackground: true,
    staleTime: 0,
  })
}

/**
 * Get all external events from enabled subscriptions within a date range
 */
export function useExternalCalendarEvents(
  userId: string | undefined,
  dateRange: { start: Date; end: Date }
) {
  const { data: subscriptions = [] } = useCalendarSubscriptions(userId)

  // Enable auto-refresh of stale subscriptions
  useAutoRefreshSubscriptions(userId)

  return useQuery({
    queryKey: queryKeys.externalEvents.week(
      userId || '',
      dateRange.start.toISOString().split('T')[0]
    ),
    queryFn: async (): Promise<ExternalCalendarEvent[]> => {
      const enabledSubscriptions = subscriptions.filter((s) => s.is_enabled)

      const allEvents: ExternalCalendarEvent[] = []

      for (const sub of enabledSubscriptions) {
        // Use cached events
        const cachedEvents = (sub.cached_events || []).map((event) => ({
          ...event,
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          color: sub.color,
        }))

        // Filter by date range
        const filteredEvents = filterEventsByDateRange(
          cachedEvents,
          dateRange.start,
          dateRange.end
        )

        allEvents.push(...filteredEvents)
      }

      return allEvents
    },
    enabled: !!userId && subscriptions.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes to pick up cache updates
  })
}

// ============================================
// Calendar Feed Token Hooks (for live ICS URL)
// ============================================

/**
 * Fetch user's calendar feed tokens
 */
export function useCalendarFeedTokens(userId: string | undefined) {
  return useQuery({
    queryKey: ['calendar-feed-tokens', userId],
    queryFn: async (): Promise<CalendarFeedToken[]> => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('calendar_feed_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

/**
 * Create a new calendar feed token
 */
export function useCreateCalendarFeedToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name?: string }) => {
      const token = generateToken()

      const { data, error } = await supabase
        .from('calendar_feed_tokens')
        .insert({
          user_id: userId,
          token,
          name: name || 'Default',
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['calendar-feed-tokens', userId],
      })
      toast.success('Link do calendário gerado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Falha ao gerar link do calendário')
    },
  })
}

/**
 * Delete a calendar feed token
 */
export function useDeleteCalendarFeedToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('calendar_feed_tokens')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['calendar-feed-tokens', userId],
      })
      toast.success('Link do calendário removido!')
    },
    onError: () => {
      toast.error('Falha ao remover link do calendário')
    },
  })
}

/**
 * Get the calendar feed URL for a token
 */
export function getCalendarFeedUrl(token: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  return `${supabaseUrl}/functions/v1/calendar-feed?token=${token}`
}
