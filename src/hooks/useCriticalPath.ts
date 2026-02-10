import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { HierarchicalTask, TaskDependency } from '@/types/hybrid'
import { calculateCriticalPath, applyCriticalPathToTasks, type CPMTask } from '@/utils/gantt/criticalPath'
import toast from 'react-hot-toast'

interface UseCriticalPathOptions {
  tasks: HierarchicalTask[]
  dependencies: TaskDependency[]
  projectStartDate?: Date
}

export function useCriticalPath({
  tasks,
  dependencies,
  projectStartDate = new Date(),
}: UseCriticalPathOptions) {
  const cpmResult = useMemo(() => {
    if (tasks.length === 0) {
      return {
        tasks: new Map<string, CPMTask>(),
        criticalPath: [] as string[],
        projectDuration: 0,
      }
    }

    return calculateCriticalPath(tasks, dependencies)
  }, [tasks, dependencies])

  const tasksWithCPM = useMemo(() => {
    return applyCriticalPathToTasks(tasks, cpmResult, projectStartDate)
  }, [tasks, cpmResult, projectStartDate])

  return {
    cpmResult,
    tasksWithCPM,
    criticalPath: cpmResult.criticalPath,
    projectDuration: cpmResult.projectDuration,
    isCritical: (taskId: string) => cpmResult.criticalPath.includes(taskId),
    getTaskCPM: (taskId: string) => cpmResult.tasks.get(taskId),
  }
}

export function useRecalculateCriticalPath(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tasks,
      dependencies,
      projectStartDate,
    }: {
      tasks: HierarchicalTask[]
      dependencies: TaskDependency[]
      projectStartDate: Date
    }) => {
      const cpmResult = calculateCriticalPath(tasks, dependencies)
      const tasksWithCPM = applyCriticalPathToTasks(tasks, cpmResult, projectStartDate)

      // Update each task with CPM data
      const updates = tasksWithCPM
        .filter((task) => {
          const cpmTask = cpmResult.tasks.get(task.id)
          return cpmTask !== undefined
        })
        .map((task) => ({
          id: task.id,
          early_start: task.early_start,
          early_finish: task.early_finish,
          late_start: task.late_start,
          late_finish: task.late_finish,
          slack: task.slack,
          is_critical: task.is_critical,
        }))

      // Batch update tasks
      for (const update of updates) {
        const { error } = await supabase
          .from('tasks')
          .update({
            early_start: update.early_start,
            early_finish: update.early_finish,
            late_start: update.late_start,
            late_finish: update.late_finish,
            slack: update.slack,
            is_critical: update.is_critical,
          })
          .eq('id', update.id)

        if (error) throw error
      }

      return {
        cpmResult,
        updatedCount: updates.length,
      }
    },
    onSuccess: ({ updatedCount }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      toast.success(`Caminho crítico recalculado (${updatedCount} tarefas)`)
    },
    onError: () => {
      toast.error('Erro ao recalcular caminho crítico')
    },
  })
}
