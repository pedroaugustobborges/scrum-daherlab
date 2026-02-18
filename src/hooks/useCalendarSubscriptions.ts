import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import {
  CalendarSubscription,
  CalendarSubscriptionCreate,
  CalendarSubscriptionUpdate,
  ExternalCalendarEvent,
} from '@/types/calendar'
import { fetchWithCorsProxy } from '@/utils/calendar/corsProxy'
import { parseICSContent, filterEventsByDateRange } from '@/utils/calendar/icsParser'
import toast from 'react-hot-toast'

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
 * Get all external events from enabled subscriptions within a date range
 */
export function useExternalCalendarEvents(
  userId: string | undefined,
  dateRange: { start: Date; end: Date }
) {
  const { data: subscriptions = [] } = useCalendarSubscriptions(userId)

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
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}
