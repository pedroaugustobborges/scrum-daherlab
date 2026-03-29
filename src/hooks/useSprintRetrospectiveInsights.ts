import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'

interface RetrospectiveItem {
  id: string
  category: 'went_well' | 'to_improve' | 'action_item'
  content: string
  votes: number
  status: string
  assigned_to_profile?: { full_name: string }
}

interface RetrospectiveInsights {
  sprintName: string
  moodRating: number
  actionItems: RetrospectiveItem[]
  improvementPoints: RetrospectiveItem[]
  pendingActions: RetrospectiveItem[]
  hasData: boolean
}

interface UseSprintRetrospectiveInsightsOptions {
  teamId?: string
  projectId?: string
  enabled?: boolean
}

/**
 * Fetches retrospective insights from the most recent completed sprint
 * for the given team or project. Used by Ada to provide contextual guidance
 * during sprint creation.
 */
export function useSprintRetrospectiveInsights({
  teamId,
  projectId,
  enabled = true,
}: UseSprintRetrospectiveInsightsOptions) {
  return useQuery({
    queryKey: queryKeys.retrospectives.insights(teamId, projectId),
    queryFn: async (): Promise<RetrospectiveInsights> => {
      // Find the most recent completed sprint for the team/project
      let sprintQuery = supabase
        .from('sprints')
        .select('id, name')
        .eq('status', 'completed')
        .order('end_date', { ascending: false })
        .limit(1)

      if (projectId) {
        sprintQuery = sprintQuery.eq('project_id', projectId)
      } else if (teamId) {
        sprintQuery = sprintQuery.eq('team_id', teamId)
      }

      const { data: sprints, error: sprintError } = await sprintQuery

      if (sprintError) throw sprintError

      if (!sprints || sprints.length === 0) {
        return {
          sprintName: '',
          moodRating: 0,
          actionItems: [],
          improvementPoints: [],
          pendingActions: [],
          hasData: false,
        }
      }

      const lastSprint = sprints[0]

      // Fetch the retrospective for this sprint
      const { data: retrospective, error: retroError } = await supabase
        .from('sprint_retrospectives')
        .select('id, mood_rating')
        .eq('sprint_id', lastSprint.id)
        .single()

      if (retroError && retroError.code !== 'PGRST116') throw retroError

      if (!retrospective) {
        return {
          sprintName: lastSprint.name,
          moodRating: 0,
          actionItems: [],
          improvementPoints: [],
          pendingActions: [],
          hasData: false,
        }
      }

      // Fetch retrospective items
      const { data: items, error: itemsError } = await supabase
        .from('retrospective_items')
        .select('*, assigned_to_profile:profiles!assigned_to(full_name)')
        .eq('retrospective_id', retrospective.id)
        .order('votes', { ascending: false })

      if (itemsError) throw itemsError

      // Transform items to handle profile arrays
      const transformedItems = (items || []).map((item: any) => ({
        ...item,
        assigned_to_profile: Array.isArray(item.assigned_to_profile)
          ? item.assigned_to_profile[0]
          : item.assigned_to_profile,
      }))

      const actionItems = transformedItems.filter(
        (item: RetrospectiveItem) => item.category === 'action_item'
      )
      const improvementPoints = transformedItems.filter(
        (item: RetrospectiveItem) => item.category === 'to_improve'
      )
      const pendingActions = actionItems.filter(
        (item: RetrospectiveItem) =>
          item.status === 'pending' || item.status === 'in_progress'
      )

      return {
        sprintName: lastSprint.name,
        moodRating: retrospective.mood_rating || 0,
        actionItems,
        improvementPoints,
        pendingActions,
        hasData: true,
      }
    },
    enabled: enabled && !!(teamId || projectId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetches the sprint count for a project or team to determine the sprint number
 */
export function useSprintCount({
  teamId,
  projectId,
  enabled = true,
}: UseSprintRetrospectiveInsightsOptions) {
  return useQuery({
    queryKey: queryKeys.sprints.count(teamId, projectId),
    queryFn: async (): Promise<number> => {
      let query = supabase
        .from('sprints')
        .select('id', { count: 'exact', head: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else if (teamId) {
        query = query.eq('team_id', teamId)
      }

      const { count, error } = await query

      if (error) throw error

      return count || 0
    },
    enabled: enabled && !!(teamId || projectId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Generates the automatic sprint name prefix based on sprint count
 */
export function generateSprintNamePrefix(sprintCount: number): string {
  if (sprintCount === 0) {
    return 'Sprint de Kick Off'
  }
  return `Sprint ${sprintCount + 1}`
}

/**
 * Generates the full sprint name with prefix
 */
export function generateFullSprintName(
  sprintCount: number,
  userTitle: string
): string {
  const prefix = generateSprintNamePrefix(sprintCount)
  if (!userTitle.trim()) {
    return prefix
  }
  return `${prefix} - ${userTitle.trim()}`
}
