import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface UseUserRoleResult {
  isStakeholder: boolean
  canEdit: boolean
  role: string | null
  loading: boolean
  refetch: () => void
}

/**
 * Hook to check the current user's role in a specific team or project context.
 * A stakeholder can only view data, not edit/create/delete.
 *
 * @param projectId - Optional project ID to check user's role in teams associated with the project
 * @param teamId - Optional team ID to check user's role directly in the team
 */
export function useUserRole(projectId?: string, teamId?: string): UseUserRoleResult {
  const { user } = useAuth()
  const [isStakeholder, setIsStakeholder] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserRole = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      let userRole: string | null = null

      if (teamId) {
        // Direct team membership check
        const { data, error } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error)
        }
        userRole = data?.role || null
        console.log('[useUserRole] Team check - teamId:', teamId, 'role:', userRole)
      } else if (projectId) {
        // Find teams associated with this project through two relationships:
        // 1. project_teams junction table
        // 2. sprints table (sprints have both team_id and project_id)

        const teamIdsSet = new Set<string>()

        // Method 1: Check project_teams junction table
        const { data: projectTeamsData, error: projectTeamsError } = await supabase
          .from('project_teams')
          .select('team_id')
          .eq('project_id', projectId)

        console.log('[useUserRole] project_teams query for projectId:', projectId, 'result:', projectTeamsData, 'error:', projectTeamsError)

        if (!projectTeamsError && projectTeamsData) {
          projectTeamsData.forEach((pt) => {
            if (pt.team_id) teamIdsSet.add(pt.team_id)
          })
        }

        // Method 2: Check sprints table
        const { data: sprintsData, error: sprintsError } = await supabase
          .from('sprints')
          .select('team_id')
          .eq('project_id', projectId)

        console.log('[useUserRole] sprints query for projectId:', projectId, 'result:', sprintsData, 'error:', sprintsError)

        if (!sprintsError && sprintsData) {
          sprintsData.forEach((s) => {
            if (s.team_id) teamIdsSet.add(s.team_id)
          })
        }

        const teamIds = Array.from(teamIdsSet)
        console.log('[useUserRole] Found team IDs:', teamIds)

        if (teamIds.length > 0) {
          // Check user's role in those teams
          const { data: memberData, error: memberError } = await supabase
            .from('team_members')
            .select('role, team_id')
            .eq('user_id', user.id)
            .in('team_id', teamIds)

          console.log('[useUserRole] team_members query for userId:', user.id, 'teamIds:', teamIds, 'result:', memberData, 'error:', memberError)

          if (memberError && memberError.code !== 'PGRST116') {
            console.error('Error fetching user roles:', memberError)
          }

          // If user has multiple roles across teams for this project,
          // they are only stakeholder if ALL their roles are stakeholder
          if (memberData && memberData.length > 0) {
            const roles = memberData.map((d) => d.role)
            console.log('[useUserRole] User roles in project teams:', roles)
            const allStakeholder = roles.every((r) => r === 'stakeholder')
            userRole = allStakeholder ? 'stakeholder' : roles.find((r) => r !== 'stakeholder') || roles[0]
          }
        } else {
          console.log('[useUserRole] No teams found for project, user role will be null')
        }
      }

      console.log('[useUserRole] Final role:', userRole, 'isStakeholder:', userRole === 'stakeholder')
      setRole(userRole)
      setIsStakeholder(userRole === 'stakeholder')
    } catch (error) {
      console.error('Error in useUserRole:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, projectId, teamId])

  useEffect(() => {
    fetchUserRole()
  }, [fetchUserRole])

  return {
    isStakeholder,
    canEdit: !isStakeholder && role !== null,
    role,
    loading,
    refetch: fetchUserRole,
  }
}

/**
 * Hook to check the current user's role across all their team memberships.
 * Returns information about whether the user is a stakeholder in any/all teams.
 */
export function useUserRoles(): {
  roles: Array<{ teamId: string; teamName: string; role: string }>
  isStakeholderInAnyTeam: boolean
  loading: boolean
  refetch: () => void
} {
  const { user } = useAuth()
  const [roles, setRoles] = useState<Array<{ teamId: string; teamName: string; role: string }>>([])
  const [loading, setLoading] = useState(true)

  const fetchRoles = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          role,
          team_id,
          team:teams(name)
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching user roles:', error)
        return
      }

      const userRoles = (data || []).map((d: any) => ({
        teamId: d.team_id,
        teamName: d.team?.name || 'Unknown Team',
        role: d.role,
      }))

      setRoles(userRoles)
    } catch (error) {
      console.error('Error in useUserRoles:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  return {
    roles,
    isStakeholderInAnyTeam: roles.some((r) => r.role === 'stakeholder'),
    loading,
    refetch: fetchRoles,
  }
}
