import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TaskDependency, DependencyType } from '@/types/hybrid'
import toast from 'react-hot-toast'

interface CreateDependencyParams {
  predecessor_id: string
  successor_id: string
  dependency_type: DependencyType
  lag_days?: number
}

interface UpdateDependencyParams {
  id: string
  dependency_type?: DependencyType
  lag_days?: number
}

export function useDependencies(projectId: string) {
  return useQuery({
    queryKey: ['dependencies', projectId],
    queryFn: async (): Promise<TaskDependency[]> => {
      // Get all task IDs for this project first
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)

      if (tasksError) throw tasksError
      if (!tasks || tasks.length === 0) return []

      const taskIds = tasks.map((t) => t.id)

      // Get dependencies where either predecessor or successor is in this project
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('*')
        .or(`predecessor_id.in.(${taskIds.join(',')}),successor_id.in.(${taskIds.join(',')})`)

      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })
}

export function useCreateDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateDependencyParams): Promise<TaskDependency> => {
      // Check for circular dependency
      const { data: existingPath, error: checkError } = await supabase.rpc(
        'check_circular_dependency',
        {
          p_predecessor_id: params.predecessor_id,
          p_successor_id: params.successor_id,
        }
      )

      if (checkError) {
        console.error('Error checking circular dependency:', checkError)
      }

      if (existingPath === true) {
        throw new Error('Esta dependência criaria um ciclo')
      }

      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({
          predecessor_id: params.predecessor_id,
          successor_id: params.successor_id,
          dependency_type: params.dependency_type,
          lag_days: params.lag_days || 0,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta dependência já existe')
        }
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Dependência criada')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar dependência')
    },
  })
}

export function useUpdateDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateDependencyParams): Promise<TaskDependency> => {
      const { id, ...updates } = params
      const { data, error } = await supabase
        .from('task_dependencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Dependência atualizada')
    },
    onError: () => {
      toast.error('Erro ao atualizar dependência')
    },
  })
}

export function useDeleteDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Dependência removida')
    },
    onError: () => {
      toast.error('Erro ao remover dependência')
    },
  })
}

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: async () => {
      const { data: predecessors, error: predError } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          predecessor:tasks!predecessor_id(id, title, wbs_code)
        `)
        .eq('successor_id', taskId)

      if (predError) throw predError

      const { data: successors, error: succError } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          successor:tasks!successor_id(id, title, wbs_code)
        `)
        .eq('predecessor_id', taskId)

      if (succError) throw succError

      return {
        predecessors: predecessors || [],
        successors: successors || [],
      }
    },
    enabled: !!taskId,
  })
}
