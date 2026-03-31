import { useMemo } from 'react'
import type { HierarchicalTask, WBSNode, TaskStatus, ProjectConfiguration } from '@/types/hybrid'

/** Sprint info for WBS grouping */
export interface SprintInfo {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
}

/**
 * Transform hierarchical tasks into WBS tree structure
 * For hybrid/agile projects with sprints, groups by: Project > Sprints > Stories > Subtasks
 */
export function buildWBSTree(
  tasks: HierarchicalTask[],
  sprints?: SprintInfo[],
  projectConfig?: ProjectConfiguration | null,
  projectName?: string
): WBSNode | null {
  if (tasks.length === 0) return null

  // Check if we should group by sprints (hybrid/agile with sprints enabled)
  const shouldGroupBySprints =
    projectConfig?.module_sprints &&
    sprints &&
    sprints.length > 0 &&
    (projectConfig.methodology === 'agile' || projectConfig.methodology === 'hybrid')

  if (shouldGroupBySprints) {
    return buildSprintGroupedTree(tasks, sprints!, projectName)
  }

  return buildStandardTree(tasks, projectName)
}

/**
 * Build WBS tree grouped by sprints for agile/hybrid projects
 * Structure: Project > Sprints > Stories > Subtasks
 */
function buildSprintGroupedTree(
  tasks: HierarchicalTask[],
  sprints: SprintInfo[],
  projectName?: string
): WBSNode {
  // Sort sprints by start_date
  const sortedSprints = [...sprints].sort((a, b) => {
    if (!a.start_date && !b.start_date) return 0
    if (!a.start_date) return 1
    if (!b.start_date) return -1
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  })

  // Group tasks by sprint_id, respecting order_index
  const tasksBySprint = new Map<string | null, HierarchicalTask[]>()

  // Initialize with null for backlog (tasks without sprint)
  tasksBySprint.set(null, [])
  sortedSprints.forEach(sprint => tasksBySprint.set(sprint.id, []))

  // Sort tasks by order_index first (grid ordering takes priority)
  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index)

  // Distribute tasks to their sprints
  sortedTasks.forEach(task => {
    const sprintId = task.sprint_id
    if (tasksBySprint.has(sprintId)) {
      tasksBySprint.get(sprintId)!.push(task)
    } else {
      // Task has a sprint_id that doesn't exist in our sprint list - add to backlog
      tasksBySprint.get(null)!.push(task)
    }
  })

  // Build sprint nodes
  const sprintNodes: WBSNode[] = []
  let sprintIndex = 1

  sortedSprints.forEach(sprint => {
    const sprintTasks = tasksBySprint.get(sprint.id) || []
    if (sprintTasks.length === 0) return // Skip empty sprints

    const childNodes = buildSprintTaskNodes(sprintTasks, tasks, `${sprintIndex}`)

    sprintNodes.push({
      id: `sprint-${sprint.id}`,
      name: sprint.name,
      wbsCode: `${sprintIndex}`,
      taskType: 'phase',
      children: childNodes,
      attributes: {
        status: getSprintStatus(sprint.status),
        progress: calculateAverageProgress(sprintTasks),
        startDate: sprint.start_date || undefined,
        endDate: sprint.end_date || undefined,
      },
    })
    sprintIndex++
  })

  // Add backlog as last node if there are tasks without sprint
  const backlogTasks = tasksBySprint.get(null) || []
  if (backlogTasks.length > 0) {
    const backlogChildren = buildSprintTaskNodes(backlogTasks, tasks, `${sprintIndex}`)
    sprintNodes.push({
      id: 'sprint-backlog',
      name: 'Backlog',
      wbsCode: `${sprintIndex}`,
      taskType: 'phase',
      children: backlogChildren,
      attributes: {
        status: 'todo',
        progress: calculateAverageProgress(backlogTasks),
      },
    })
  }

  // Root node represents the project
  return {
    id: 'wbs-root',
    name: projectName || 'Projeto',
    wbsCode: '0',
    taskType: 'summary',
    children: sprintNodes,
    attributes: {
      status: 'in-progress',
      progress: calculateAverageProgress(tasks),
    },
  }
}

/**
 * Build task nodes within a sprint, handling parent-child relationships
 */
function buildSprintTaskNodes(
  sprintTasks: HierarchicalTask[],
  allTasks: HierarchicalTask[],
  parentWbsCode: string
): WBSNode[] {
  // Find root level tasks for this sprint (no parent or parent not in same sprint)
  const rootTasks = sprintTasks.filter(task => {
    if (!task.parent_task_id) return true
    // Check if parent is in the same sprint
    const parent = sprintTasks.find(t => t.id === task.parent_task_id)
    return !parent
  })

  // Sort by order_index (grid ordering takes priority)
  rootTasks.sort((a, b) => a.order_index - b.order_index)

  return rootTasks.map((task, index) => {
    const wbsCode = `${parentWbsCode}.${index + 1}`
    return buildNodeWithChildren(task, sprintTasks, allTasks, wbsCode)
  })
}

/**
 * Recursively build a node with its children
 */
function buildNodeWithChildren(
  task: HierarchicalTask,
  sprintTasks: HierarchicalTask[],
  allTasks: HierarchicalTask[],
  wbsCode: string
): WBSNode {
  // Find children within the sprint
  const children = sprintTasks
    .filter(t => t.parent_task_id === task.id)
    .sort((a, b) => a.order_index - b.order_index)

  const childNodes = children.map((child, index) =>
    buildNodeWithChildren(child, sprintTasks, allTasks, `${wbsCode}.${index + 1}`)
  )

  return {
    id: task.id,
    name: task.title,
    wbsCode: wbsCode,
    taskType: childNodes.length > 0 ? 'summary' : task.task_type,
    children: childNodes,
    attributes: {
      status: task.status as TaskStatus,
      progress: task.percent_complete || 0,
      assignedTo: task.assigned_to || undefined,
      startDate: task.start_date || undefined,
      endDate: task.end_date || undefined,
      isCritical: task.is_critical,
    },
  }
}

/**
 * Convert sprint status to task status
 */
function getSprintStatus(status: string): TaskStatus {
  switch (status) {
    case 'completed': return 'done'
    case 'active': return 'in-progress'
    case 'planning': return 'todo'
    default: return 'todo'
  }
}

/**
 * Build standard WBS tree (original logic for predictive projects)
 */
function buildStandardTree(tasks: HierarchicalTask[], projectName?: string): WBSNode | null {
  // Find root tasks (no parent)
  const rootTasks = tasks.filter((t) => !t.parent_task_id)

  if (rootTasks.length === 0) {
    return null
  }

  // Build tree recursively
  function buildNode(task: HierarchicalTask): WBSNode {
    const children = tasks
      .filter((t) => t.parent_task_id === task.id)
      .sort((a, b) => {
        // Sort by order_index first (grid ordering takes priority)
        if (a.order_index !== b.order_index) {
          return a.order_index - b.order_index
        }
        // Fall back to WBS code if available
        if (a.wbs_code && b.wbs_code) {
          return a.wbs_code.localeCompare(b.wbs_code)
        }
        return 0
      })

    return {
      id: task.id,
      name: task.title,
      wbsCode: task.wbs_code || '',
      taskType: task.task_type,
      children: children.map(buildNode),
      attributes: {
        status: task.status as TaskStatus,
        progress: task.percent_complete || 0,
        assignedTo: task.assigned_to || undefined,
        startDate: task.start_date || undefined,
        endDate: task.end_date || undefined,
        isCritical: task.is_critical,
      },
    }
  }

  if (rootTasks.length === 1) {
    return buildNode(rootTasks[0])
  }

  // Create virtual root for multiple top-level tasks
  return {
    id: 'wbs-root',
    name: projectName || 'Projeto',
    wbsCode: '0',
    taskType: 'summary',
    children: rootTasks.sort((a, b) => a.order_index - b.order_index).map(buildNode),
    attributes: {
      status: 'in-progress',
      progress: calculateAverageProgress(rootTasks),
    },
  }
}

/**
 * Calculate average progress of tasks
 */
function calculateAverageProgress(tasks: HierarchicalTask[]): number {
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((acc, t) => acc + (t.percent_complete || 0), 0)
  return Math.round(sum / tasks.length)
}

/**
 * Flatten WBS tree to get all nodes
 */
export function flattenWBSTree(node: WBSNode | null): WBSNode[] {
  if (!node) return []

  const result: WBSNode[] = [node]
  if (node.children) {
    node.children.forEach((child) => {
      result.push(...flattenWBSTree(child))
    })
  }
  return result
}

/**
 * Count total nodes in WBS tree
 */
export function countWBSNodes(node: WBSNode | null): number {
  if (!node) return 0
  let count = 1
  if (node.children) {
    node.children.forEach((child) => {
      count += countWBSNodes(child)
    })
  }
  return count
}

/**
 * Get WBS depth (max level)
 */
export function getWBSDepth(node: WBSNode | null, level = 0): number {
  if (!node) return 0
  if (!node.children || node.children.length === 0) return level

  let maxDepth = level
  node.children.forEach((child) => {
    maxDepth = Math.max(maxDepth, getWBSDepth(child, level + 1))
  })
  return maxDepth
}

/**
 * Hook to transform tasks into WBS data
 */
export function useWBSData(
  tasks: HierarchicalTask[],
  sprints?: SprintInfo[],
  projectConfig?: ProjectConfiguration | null,
  projectName?: string
) {
  const wbsTree = useMemo(
    () => buildWBSTree(tasks, sprints, projectConfig, projectName),
    [tasks, sprints, projectConfig, projectName]
  )

  const stats = useMemo(() => {
    return {
      totalNodes: countWBSNodes(wbsTree),
      maxDepth: getWBSDepth(wbsTree),
      allNodes: flattenWBSTree(wbsTree),
    }
  }, [wbsTree])

  return {
    wbsTree,
    ...stats,
  }
}
