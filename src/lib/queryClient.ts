import { QueryClient } from '@tanstack/react-query'

/**
 * React Query client configuration
 * Optimized for Supabase real-time data with sensible defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 1000 * 60 * 2, // 2 minutes

      // Cache time - how long to keep inactive data in cache
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)

      // Retry configuration
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Network mode - online only for most cases
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,

      // Network mode
      networkMode: 'online',
    },
  },
})

/**
 * Query key factory for consistent key generation
 * Follows the pattern: [entity, scope, identifier, params]
 */
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  // Project Configuration
  projectConfig: {
    all: ['projectConfig'] as const,
    detail: (projectId: string) => [...queryKeys.projectConfig.all, projectId] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (projectId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.tasks.lists(), { projectId, ...filters }] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    hierarchy: (projectId: string) => [...queryKeys.tasks.all, 'hierarchy', projectId] as const,
  },

  // Gantt-specific
  gantt: {
    all: ['gantt'] as const,
    tasks: (projectId: string) => [...queryKeys.gantt.all, 'tasks', projectId] as const,
    dependencies: (projectId: string) => [...queryKeys.gantt.all, 'dependencies', projectId] as const,
    criticalPath: (projectId: string) => [...queryKeys.gantt.all, 'criticalPath', projectId] as const,
  },

  // WBS
  wbs: {
    all: ['wbs'] as const,
    tree: (projectId: string) => [...queryKeys.wbs.all, 'tree', projectId] as const,
  },

  // Dependencies
  dependencies: {
    all: ['dependencies'] as const,
    list: (projectId: string) => [...queryKeys.dependencies.all, 'list', projectId] as const,
    task: (taskId: string) => [...queryKeys.dependencies.all, 'task', taskId] as const,
  },

  // Baselines
  baselines: {
    all: ['baselines'] as const,
    list: (projectId: string) => [...queryKeys.baselines.all, 'list', projectId] as const,
    detail: (baselineId: string) => [...queryKeys.baselines.all, 'detail', baselineId] as const,
    comparison: (projectId: string, baselineId: string) =>
      [...queryKeys.baselines.all, 'comparison', projectId, baselineId] as const,
  },

  // Grid View
  gridConfig: {
    all: ['gridConfig'] as const,
    user: (projectId: string, userId: string) =>
      [...queryKeys.gridConfig.all, projectId, userId] as const,
  },

  // Teams
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.teams.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.teams.all, 'detail', id] as const,
    members: (teamId: string) => [...queryKeys.teams.all, 'members', teamId] as const,
  },

  // Sprints
  sprints: {
    all: ['sprints'] as const,
    lists: () => [...queryKeys.sprints.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.sprints.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.sprints.all, 'detail', id] as const,
    tasks: (sprintId: string) => [...queryKeys.sprints.all, 'tasks', sprintId] as const,
  },

  // Profiles / Users
  profiles: {
    all: ['profiles'] as const,
    list: () => [...queryKeys.profiles.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.profiles.all, 'detail', id] as const,
  },

  // Resource Allocations
  resources: {
    all: ['resources'] as const,
    task: (taskId: string) => [...queryKeys.resources.all, 'task', taskId] as const,
    user: (userId: string) => [...queryKeys.resources.all, 'user', userId] as const,
    project: (projectId: string) => [...queryKeys.resources.all, 'project', projectId] as const,
  },
}

/**
 * Invalidation helpers for common operations
 */
export const invalidateQueries = {
  // Invalidate all project-related queries
  project: (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.projectConfig.detail(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.gantt.tasks(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.wbs.tree(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.dependencies.list(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.baselines.list(projectId) })
  },

  // Invalidate task-related queries
  task: (projectId: string, taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.gantt.tasks(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.wbs.tree(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.gantt.criticalPath(projectId) })
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dependencies.task(taskId) })
    }
  },

  // Invalidate dependency-related queries
  dependencies: (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dependencies.list(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.gantt.dependencies(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.gantt.criticalPath(projectId) })
  },

  // Invalidate all queries (use sparingly)
  all: () => {
    queryClient.invalidateQueries()
  },
}

export default queryClient
