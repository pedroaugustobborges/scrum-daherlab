import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import type { HierarchicalTask, HierarchicalTaskUpdate } from '@/types/hybrid'
import toast from 'react-hot-toast'

/**
 * Hook to fetch hierarchical tasks for a project
 */
export function useTaskHierarchy(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.hierarchy(projectId || ''),
    queryFn: async (): Promise<HierarchicalTask[]> => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })

      if (error) throw error

      return (data || []).map((task) => ({
        ...task,
        assigned_to_profile: task.assigned_to_profile || undefined,
      }))
    },
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Build a tree structure from flat task list
 */
export function buildTaskTree(tasks: HierarchicalTask[]): HierarchicalTask[] {
  const taskMap = new Map<string, HierarchicalTask>()
  const rootTasks: HierarchicalTask[] = []

  // First pass: create map of all tasks
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] })
  })

  // Second pass: build tree structure
  tasks.forEach((task) => {
    const taskWithChildren = taskMap.get(task.id)!
    if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
      const parent = taskMap.get(task.parent_task_id)!
      if (!parent.children) parent.children = []
      parent.children.push(taskWithChildren)
    } else {
      rootTasks.push(taskWithChildren)
    }
  })

  return rootTasks
}

/**
 * Flatten tree to list with visibility info
 */
export function flattenTaskTree(
  tasks: HierarchicalTask[],
  expandedIds: Set<string>,
  parentVisible = true,
  depth = 0
): Array<HierarchicalTask & { _depth: number; _visible: boolean; _hasChildren: boolean }> {
  const result: Array<HierarchicalTask & { _depth: number; _visible: boolean; _hasChildren: boolean }> = []

  tasks.forEach((task) => {
    const hasChildren = (task.children?.length || 0) > 0
    const isExpanded = expandedIds.has(task.id)

    result.push({
      ...task,
      _depth: depth,
      _visible: parentVisible,
      _hasChildren: hasChildren,
    })

    if (hasChildren && task.children) {
      const childRows = flattenTaskTree(
        task.children,
        expandedIds,
        parentVisible && isExpanded,
        depth + 1
      )
      result.push(...childRows)
    }
  })

  return result
}

/**
 * Hook to create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: Partial<HierarchicalTask> & { project_id: string; title: string }) => {
      // Get max order_index for this parent
      // Use different query approach based on whether parent_task_id is null or not
      let query = supabase
        .from('tasks')
        .select('order_index')
        .eq('project_id', task.project_id)
        .order('order_index', { ascending: false })
        .limit(1)

      if (task.parent_task_id) {
        query = query.eq('parent_task_id', task.parent_task_id)
      } else {
        query = query.is('parent_task_id', null)
      }

      const { data: maxOrderData } = await query

      const newOrderIndex = (maxOrderData?.[0]?.order_index || 0) + 1

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...task,
          order_index: newOrderIndex,
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          task_type: task.task_type || 'task',
          hierarchy_level: task.hierarchy_level || 0,
          percent_complete: task.percent_complete || 0,
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(data.project_id) })
      toast.success('Tarefa criada')
    },
    onError: (error) => {
      console.error('Error creating task:', error)
      toast.error('Erro ao criar tarefa')
    },
  })
}

/**
 * Hook to update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId, updates }: {
      id: string
      projectId: string
      updates: HierarchicalTaskUpdate
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...data, projectId }
    },
    onMutate: async ({ id, projectId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.hierarchy(projectId) })

      const previousTasks = queryClient.getQueryData<HierarchicalTask[]>(
        queryKeys.tasks.hierarchy(projectId)
      )

      if (previousTasks) {
        queryClient.setQueryData(
          queryKeys.tasks.hierarchy(projectId),
          previousTasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
        )
      }

      return { previousTasks }
    },
    onError: (err, { projectId }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.hierarchy(projectId), context.previousTasks)
      }
      console.error('Error updating task:', err)
      toast.error('Erro ao atualizar tarefa')
    },
    onSettled: (data) => {
      if (data?.projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(data.projectId) })
      }
    },
  })
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { projectId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(projectId) })
      toast.success('Tarefa excluída')
    },
    onError: (error) => {
      console.error('Error deleting task:', error)
      toast.error('Erro ao excluir tarefa')
    },
  })
}

/**
 * Hook to indent a task (make it a child of the previous sibling)
 */
export function useIndentTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ task, tasks }: { task: HierarchicalTask; tasks: HierarchicalTask[] }) => {
      // Find the previous sibling at the same level
      const siblings = tasks.filter(
        (t) => t.parent_task_id === task.parent_task_id && t.id !== task.id
      )
      const sortedSiblings = siblings
        .filter((t) => t.order_index < task.order_index)
        .sort((a, b) => b.order_index - a.order_index)

      const previousSibling = sortedSiblings[0]
      if (!previousSibling) {
        throw new Error('Cannot indent: no previous sibling')
      }

      // Update task to be child of previous sibling
      const { data, error } = await supabase
        .from('tasks')
        .update({
          parent_task_id: previousSibling.id,
          hierarchy_level: (previousSibling.hierarchy_level || 0) + 1,
        })
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error

      // Mark previous sibling as summary if not already
      if (!previousSibling.is_summary) {
        await supabase
          .from('tasks')
          .update({ is_summary: true, task_type: 'summary' })
          .eq('id', previousSibling.id)
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(data.project_id) })
      toast.success('Tarefa recuada')
    },
    onError: (error: Error) => {
      console.error('Error indenting task:', error)
      toast.error(error.message || 'Erro ao recuar tarefa')
    },
  })
}

/**
 * Hook to outdent a task (move it up one level)
 */
export function useOutdentTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ task, tasks }: { task: HierarchicalTask; tasks: HierarchicalTask[] }) => {
      if (!task.parent_task_id) {
        throw new Error('Cannot outdent: task is already at root level')
      }

      // Find parent task
      const parent = tasks.find((t) => t.id === task.parent_task_id)
      if (!parent) {
        throw new Error('Cannot outdent: parent not found')
      }

      // Update task to be sibling of parent
      const { data, error } = await supabase
        .from('tasks')
        .update({
          parent_task_id: parent.parent_task_id,
          hierarchy_level: Math.max(0, (task.hierarchy_level || 0) - 1),
        })
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error

      // Check if parent still has children
      const remainingChildren = tasks.filter(
        (t) => t.parent_task_id === parent.id && t.id !== task.id
      )
      if (remainingChildren.length === 0) {
        await supabase
          .from('tasks')
          .update({ is_summary: false, task_type: 'task' })
          .eq('id', parent.id)
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(data.project_id) })
      toast.success('Tarefa promovida')
    },
    onError: (error: Error) => {
      console.error('Error outdenting task:', error)
      toast.error(error.message || 'Erro ao promover tarefa')
    },
  })
}

/**
 * Hook to reorder tasks
 */
export function useReorderTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, updates }: {
      projectId: string
      updates: Array<{ id: string; order_index: number; parent_task_id?: string | null }>
    }) => {
      // Update all tasks in a batch
      const promises = updates.map(({ id, order_index, parent_task_id }) =>
        supabase
          .from('tasks')
          .update({ order_index, ...(parent_task_id !== undefined && { parent_task_id }) })
          .eq('id', id)
      )

      await Promise.all(promises)
      return { projectId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.hierarchy(projectId) })
    },
    onError: (error) => {
      console.error('Error reordering tasks:', error)
      toast.error('Erro ao reordenar tarefas')
    },
  })
}
