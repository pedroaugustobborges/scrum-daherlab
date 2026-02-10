import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys, invalidateQueries } from '@/lib/queryClient'
import type {
  ProjectConfiguration,
  ProjectConfigurationUpdate,
  Methodology,
} from '@/types/hybrid'
import toast from 'react-hot-toast'

/**
 * Hook to fetch project configuration
 */
export function useProjectConfig(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectConfig.detail(projectId || ''),
    queryFn: async (): Promise<ProjectConfiguration | null> => {
      if (!projectId) return null

      const { data, error } = await supabase
        .from('project_configuration')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error) {
        // If no config exists, return null (not an error)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes - config rarely changes
  })
}

/**
 * Hook to create project configuration
 */
export function useCreateProjectConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      methodology,
      modules,
    }: {
      projectId: string
      methodology: Methodology
      modules?: Partial<ProjectConfiguration>
    }) => {
      // Get methodology defaults
      const methodologyDefaults = getMethodologyDefaults(methodology)

      const config = {
        project_id: projectId,
        methodology,
        // Agile modules
        module_kanban: modules?.module_kanban ?? methodologyDefaults.module_kanban ?? false,
        module_backlog: modules?.module_backlog ?? methodologyDefaults.module_backlog ?? false,
        module_sprints: modules?.module_sprints ?? methodologyDefaults.module_sprints ?? false,
        // Predictive modules
        module_gantt: modules?.module_gantt ?? methodologyDefaults.module_gantt ?? false,
        module_wbs: modules?.module_wbs ?? methodologyDefaults.module_wbs ?? false,
        module_grid_view: modules?.module_grid_view ?? methodologyDefaults.module_grid_view ?? false,
        // Shared modules
        module_calendar: modules?.module_calendar ?? methodologyDefaults.module_calendar ?? false,
        module_timeline: modules?.module_timeline ?? methodologyDefaults.module_timeline ?? false,
        // Gantt settings
        gantt_zoom_level: modules?.gantt_zoom_level || 'week',
        working_days_per_week: modules?.working_days_per_week || 5,
        hours_per_day: modules?.hours_per_day || 8,
        week_start_day: modules?.week_start_day || 1,
        default_view: modules?.default_view || getDefaultView(methodology),
      }

      const { data, error } = await supabase
        .from('project_configuration')
        .insert([config])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectConfig.detail(data.project_id) })
      toast.success('Configuração do projeto criada')
    },
    onError: (error) => {
      console.error('Error creating project config:', error)
      toast.error('Erro ao criar configuração do projeto')
    },
  })
}

/**
 * Hook to update project configuration
 */
export function useUpdateProjectConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string
      updates: ProjectConfigurationUpdate
    }) => {
      const { data, error } = await supabase
        .from('project_configuration')
        .update(updates)
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ projectId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projectConfig.detail(projectId) })

      // Snapshot the previous value
      const previousConfig = queryClient.getQueryData<ProjectConfiguration>(
        queryKeys.projectConfig.detail(projectId)
      )

      // Optimistically update to the new value
      if (previousConfig) {
        queryClient.setQueryData(queryKeys.projectConfig.detail(projectId), {
          ...previousConfig,
          ...updates,
        })
      }

      return { previousConfig }
    },
    onError: (err, { projectId }, context) => {
      // Rollback on error
      if (context?.previousConfig) {
        queryClient.setQueryData(
          queryKeys.projectConfig.detail(projectId),
          context.previousConfig
        )
      }
      console.error('Error updating project config:', err)
      toast.error('Erro ao atualizar configuração')
    },
    onSuccess: (data) => {
      toast.success('Configuração atualizada')
      invalidateQueries.project(data.project_id)
    },
  })
}

/**
 * Hook to toggle a specific module
 */
export function useToggleModule() {
  const updateConfig = useUpdateProjectConfig()

  return {
    toggleModule: (
      projectId: string,
      module: keyof Pick<ProjectConfiguration,
        'module_kanban' | 'module_backlog' | 'module_sprints' |
        'module_gantt' | 'module_wbs' | 'module_grid_view' |
        'module_calendar' | 'module_timeline'
      >,
      enabled: boolean
    ) => {
      updateConfig.mutate({
        projectId,
        updates: { [module]: enabled },
      })
    },
    ...updateConfig,
  }
}

/**
 * Hook to get or create project configuration
 * Creates default config if none exists
 */
export function useEnsureProjectConfig(projectId: string | undefined, methodology?: Methodology) {
  const configQuery = useProjectConfig(projectId)
  const createConfig = useCreateProjectConfig()

  // Auto-create config if it doesn't exist
  const ensureConfig = async () => {
    if (!projectId || configQuery.isLoading || configQuery.data) return

    if (configQuery.data === null && !createConfig.isPending) {
      await createConfig.mutateAsync({
        projectId,
        methodology: methodology || 'agile',
      })
    }
  }

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading || createConfig.isPending,
    error: configQuery.error || createConfig.error,
    ensureConfig,
  }
}

// Helper functions

function getMethodologyDefaults(methodology: Methodology): Partial<ProjectConfiguration> {
  const defaults: Record<Methodology, Partial<ProjectConfiguration>> = {
    agile: {
      module_kanban: true,
      module_backlog: true,
      module_sprints: true,
      module_gantt: false,
      module_wbs: false,
      module_grid_view: false,
      module_calendar: true,
      module_timeline: false,
    },
    predictive: {
      module_kanban: false,
      module_backlog: false,
      module_sprints: false,
      module_gantt: true,
      module_wbs: true,
      module_grid_view: true,
      module_calendar: true,
      module_timeline: true,
    },
    hybrid: {
      module_kanban: true,
      module_backlog: true,
      module_sprints: true,
      module_gantt: true,
      module_wbs: true,
      module_grid_view: true,
      module_calendar: true,
      module_timeline: true,
    },
  }

  return defaults[methodology]
}

function getDefaultView(methodology: Methodology): string {
  switch (methodology) {
    case 'agile':
      return 'kanban'
    case 'predictive':
      return 'gantt'
    case 'hybrid':
    default:
      return 'overview'
  }
}

/**
 * Get enabled modules from config
 */
export function getEnabledModules(config: ProjectConfiguration | null | undefined) {
  if (!config) return []

  const modules: { key: string; route: string; label: string; icon: string }[] = []

  if (config.module_kanban) {
    modules.push({ key: 'kanban', route: 'kanban', label: 'Kanban', icon: 'ViewKanban' })
  }
  if (config.module_backlog) {
    modules.push({ key: 'backlog', route: 'backlog', label: 'Backlog', icon: 'List' })
  }
  if (config.module_sprints) {
    modules.push({ key: 'sprints', route: 'sprints', label: 'Sprints', icon: 'Speed' })
  }
  if (config.module_gantt) {
    modules.push({ key: 'gantt', route: 'gantt', label: 'Gantt', icon: 'Timeline' })
  }
  if (config.module_wbs) {
    modules.push({ key: 'wbs', route: 'wbs', label: 'WBS', icon: 'AccountTree' })
  }
  if (config.module_grid_view) {
    modules.push({ key: 'grid', route: 'grid', label: 'Grade', icon: 'TableChart' })
  }
  if (config.module_calendar) {
    modules.push({ key: 'calendar', route: 'calendar', label: 'Calendário', icon: 'CalendarMonth' })
  }
  if (config.module_timeline) {
    modules.push({ key: 'timeline', route: 'timeline', label: 'Linha do Tempo', icon: 'LinearScale' })
  }

  return modules
}
