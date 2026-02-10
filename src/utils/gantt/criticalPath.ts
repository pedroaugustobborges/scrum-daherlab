import type { HierarchicalTask, TaskDependency } from '@/types/hybrid'

export interface CPMTask {
  id: string
  duration: number
  predecessors: string[]
  earlyStart: number
  earlyFinish: number
  lateStart: number
  lateFinish: number
  slack: number
  isCritical: boolean
}

interface CPMResult {
  tasks: Map<string, CPMTask>
  criticalPath: string[]
  projectDuration: number
}

/**
 * Calculate Critical Path using the Critical Path Method (CPM)
 *
 * Algorithm:
 * 1. Forward Pass: Calculate Early Start (ES) and Early Finish (EF)
 *    - ES = max(EF of all predecessors) + lag
 *    - EF = ES + duration
 *
 * 2. Backward Pass: Calculate Late Start (LS) and Late Finish (LF)
 *    - LF = min(LS of all successors) - lag
 *    - LS = LF - duration
 *
 * 3. Calculate Slack (Float)
 *    - Slack = LS - ES = LF - EF
 *    - Tasks with Slack = 0 are on the critical path
 */
export function calculateCriticalPath(
  tasks: HierarchicalTask[],
  dependencies: TaskDependency[]
): CPMResult {
  // Build task map with durations
  const cpmTasks = new Map<string, CPMTask>()

  // Initialize tasks
  tasks.forEach((task) => {
    // Skip summary tasks in CPM calculation (they auto-calculate from children)
    if (task.is_summary) return

    cpmTasks.set(task.id, {
      id: task.id,
      duration: task.planned_duration || 1,
      predecessors: [],
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: Infinity,
      lateFinish: Infinity,
      slack: 0,
      isCritical: false,
    })
  })

  // Build predecessor lists from dependencies
  const successorMap = new Map<string, { successorId: string; lag: number }[]>()

  dependencies.forEach((dep) => {
    const cpmTask = cpmTasks.get(dep.successor_id)
    if (cpmTask) {
      cpmTask.predecessors.push(dep.predecessor_id)
    }

    // Build successor map for backward pass
    if (!successorMap.has(dep.predecessor_id)) {
      successorMap.set(dep.predecessor_id, [])
    }
    successorMap.get(dep.predecessor_id)!.push({
      successorId: dep.successor_id,
      lag: dep.lag_days,
    })
  })

  // Topological sort for processing order
  const sortedTasks = topologicalSort(Array.from(cpmTasks.values()))

  // Forward Pass
  sortedTasks.forEach((task) => {
    if (task.predecessors.length === 0) {
      // No predecessors - start at day 0
      task.earlyStart = 0
    } else {
      // ES = max(EF of predecessors)
      let maxEF = 0
      task.predecessors.forEach((predId) => {
        const pred = cpmTasks.get(predId)
        if (pred) {
          // Find lag for this dependency
          const dep = dependencies.find(
            (d) => d.predecessor_id === predId && d.successor_id === task.id
          )
          const lag = dep?.lag_days || 0
          maxEF = Math.max(maxEF, pred.earlyFinish + lag)
        }
      })
      task.earlyStart = maxEF
    }
    task.earlyFinish = task.earlyStart + task.duration
  })

  // Find project duration (max EF)
  let projectDuration = 0
  cpmTasks.forEach((task) => {
    projectDuration = Math.max(projectDuration, task.earlyFinish)
  })

  // Find tasks with no successors (end tasks)
  const endTasks = Array.from(cpmTasks.values()).filter((task) => {
    const successors = successorMap.get(task.id)
    return !successors || successors.length === 0
  })

  // Initialize end tasks with LF = project duration
  endTasks.forEach((task) => {
    task.lateFinish = projectDuration
    task.lateStart = task.lateFinish - task.duration
  })

  // Backward Pass (reverse order)
  const reversedTasks = [...sortedTasks].reverse()

  reversedTasks.forEach((task) => {
    const successors = successorMap.get(task.id)

    if (!successors || successors.length === 0) {
      // End task - already initialized
      return
    }

    // LF = min(LS of successors) - lag
    let minLS = Infinity
    successors.forEach(({ successorId, lag }) => {
      const succ = cpmTasks.get(successorId)
      if (succ) {
        minLS = Math.min(minLS, succ.lateStart - lag)
      }
    })

    task.lateFinish = minLS
    task.lateStart = task.lateFinish - task.duration
  })

  // Calculate slack and identify critical path
  const criticalPath: string[] = []

  cpmTasks.forEach((task) => {
    task.slack = task.lateStart - task.earlyStart
    task.isCritical = task.slack === 0

    if (task.isCritical) {
      criticalPath.push(task.id)
    }
  })

  // Sort critical path by early start
  criticalPath.sort((a, b) => {
    const taskA = cpmTasks.get(a)
    const taskB = cpmTasks.get(b)
    return (taskA?.earlyStart || 0) - (taskB?.earlyStart || 0)
  })

  return {
    tasks: cpmTasks,
    criticalPath,
    projectDuration,
  }
}

/**
 * Topological sort using Kahn's algorithm
 */
function topologicalSort(tasks: CPMTask[]): CPMTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // Initialize
  tasks.forEach((task) => {
    inDegree.set(task.id, task.predecessors.length)
    adjacency.set(task.id, [])
  })

  // Build adjacency list (predecessor -> successors)
  tasks.forEach((task) => {
    task.predecessors.forEach((predId) => {
      if (adjacency.has(predId)) {
        adjacency.get(predId)!.push(task.id)
      }
    })
  })

  // Start with tasks that have no predecessors
  const queue: CPMTask[] = tasks.filter((t) => t.predecessors.length === 0)
  const result: CPMTask[] = []

  while (queue.length > 0) {
    const task = queue.shift()!
    result.push(task)

    // Process successors
    const successors = adjacency.get(task.id) || []
    successors.forEach((succId) => {
      const newDegree = (inDegree.get(succId) || 0) - 1
      inDegree.set(succId, newDegree)

      if (newDegree === 0) {
        const succTask = taskMap.get(succId)
        if (succTask) {
          queue.push(succTask)
        }
      }
    })
  }

  // Check for cycles (if result doesn't contain all tasks)
  if (result.length !== tasks.length) {
    console.warn('Cycle detected in task dependencies')
  }

  return result
}

/**
 * Convert CPM day numbers to actual dates
 */
export function cpmDaysToDate(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Apply CPM results to tasks
 */
export function applyCriticalPathToTasks(
  tasks: HierarchicalTask[],
  cpmResult: CPMResult,
  projectStartDate: Date
): HierarchicalTask[] {
  return tasks.map((task) => {
    const cpmTask = cpmResult.tasks.get(task.id)
    if (!cpmTask) return task

    return {
      ...task,
      early_start: cpmDaysToDate(projectStartDate, cpmTask.earlyStart).toISOString().split('T')[0],
      early_finish: cpmDaysToDate(projectStartDate, cpmTask.earlyFinish).toISOString().split('T')[0],
      late_start: cpmDaysToDate(projectStartDate, cpmTask.lateStart).toISOString().split('T')[0],
      late_finish: cpmDaysToDate(projectStartDate, cpmTask.lateFinish).toISOString().split('T')[0],
      slack: cpmTask.slack,
      is_critical: cpmTask.isCritical,
    }
  })
}
