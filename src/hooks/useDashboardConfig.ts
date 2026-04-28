import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG, WidgetConfig, WidgetType } from '@/types'
import toast from 'react-hot-toast'

/**
 * Renames obsolete widget types from old dashboard configs so users' visibility /
 * order preferences are preserved when a widget is renamed between releases.
 */
const WIDGET_TYPE_MIGRATIONS: Record<string, WidgetType> = {
  actionItems: 'actionLatency',
}

function migrateStoredConfig(raw: DashboardConfig): DashboardConfig {
  const migratedWidgets = (raw.widgets ?? []).map((w) => {
    const newType = WIDGET_TYPE_MIGRATIONS[w.type as string]
    return newType ? { ...w, type: newType } : w
  })
  return { ...raw, widgets: migratedWidgets }
}

/**
 * Hook for fetching and updating dashboard configuration
 * Stores widget preferences in the profiles table (dashboard_config JSONB column)
 */
export function useDashboardConfig() {
  const { user } = useAuth()

  const {
    data: dashboardConfig,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.dashboardConfig.user(user?.id ?? ''),
    queryFn: async (): Promise<DashboardConfig> => {
      if (!user?.id) {
        return DEFAULT_DASHBOARD_CONFIG
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('dashboard_config')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching dashboard config:', error)
        return DEFAULT_DASHBOARD_CONFIG
      }

      // Return stored config or default if null/empty
      if (data?.dashboard_config && typeof data.dashboard_config === 'object') {
        // Validate and merge with defaults to ensure all widget types exist
        const storedConfig = migrateStoredConfig(data.dashboard_config as DashboardConfig)
        const mergedWidgets = DEFAULT_DASHBOARD_CONFIG.widgets.map((defaultWidget) => {
          const storedWidget = storedConfig.widgets?.find((w) => w.type === defaultWidget.type)
          return storedWidget || defaultWidget
        })

        return {
          ...DEFAULT_DASHBOARD_CONFIG,
          ...storedConfig,
          widgets: mergedWidgets,
        }
      }

      return DEFAULT_DASHBOARD_CONFIG
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - config changes infrequently
  })

  return {
    dashboardConfig: dashboardConfig ?? DEFAULT_DASHBOARD_CONFIG,
    isLoading,
    error,
  }
}

/**
 * Mutation hook for updating dashboard configuration
 */
export function useUpdateDashboardConfig() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newConfig: DashboardConfig) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('profiles')
        .update({ dashboard_config: newConfig })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      return newConfig
    },
    onMutate: async (newConfig) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.dashboardConfig.user(user?.id ?? ''),
      })

      // Snapshot the previous value
      const previousConfig = queryClient.getQueryData<DashboardConfig>(
        queryKeys.dashboardConfig.user(user?.id ?? '')
      )

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.dashboardConfig.user(user?.id ?? ''),
        newConfig
      )

      // Return a context object with the snapshotted value
      return { previousConfig }
    },
    onError: (error, _newConfig, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConfig) {
        queryClient.setQueryData(
          queryKeys.dashboardConfig.user(user?.id ?? ''),
          context.previousConfig
        )
      }
      console.error('Error updating dashboard config:', error)
      toast.error('Erro ao salvar configurações do dashboard')
    },
    onSuccess: () => {
      toast.success('Configurações salvas com sucesso!')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardConfig.user(user?.id ?? ''),
      })
    },
  })
}

/**
 * Helper hook for toggling widget visibility
 */
export function useToggleWidgetVisibility() {
  const { dashboardConfig } = useDashboardConfig()
  const updateConfig = useUpdateDashboardConfig()

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = dashboardConfig.widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    )

    updateConfig.mutate({
      ...dashboardConfig,
      widgets: updatedWidgets,
    })
  }

  return { toggleWidget, isUpdating: updateConfig.isPending }
}

/**
 * Helper hook for reordering widgets
 */
export function useReorderWidgets() {
  const { dashboardConfig } = useDashboardConfig()
  const updateConfig = useUpdateDashboardConfig()

  const reorderWidgets = (reorderedWidgets: WidgetConfig[]) => {
    // Update the order property based on new positions
    const updatedWidgets = reorderedWidgets.map((widget, index) => ({
      ...widget,
      order: index,
    }))

    updateConfig.mutate({
      ...dashboardConfig,
      widgets: updatedWidgets,
    })
  }

  return { reorderWidgets, isUpdating: updateConfig.isPending }
}

/**
 * Get visible widgets sorted by order
 */
export function useVisibleWidgets() {
  const { dashboardConfig, isLoading } = useDashboardConfig()

  const visibleWidgets = dashboardConfig.widgets
    .filter((widget) => widget.visible)
    .sort((a, b) => a.order - b.order)

  return { visibleWidgets, isLoading }
}
