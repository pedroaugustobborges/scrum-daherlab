import { useMemo } from 'react'
import type { HierarchicalTask, WBSNode, TaskStatus } from '@/types/hybrid'

/**
 * Transform hierarchical tasks into WBS tree structure
 */
export function buildWBSTree(tasks: HierarchicalTask[]): WBSNode | null {
  if (tasks.length === 0) return null

  // Find root tasks (no parent)
  const rootTasks = tasks.filter((t) => !t.parent_task_id)

  // If only one root, use it as the tree root
  // If multiple roots, create a virtual root
  if (rootTasks.length === 0) {
    return null
  }

  // Build tree recursively
  function buildNode(task: HierarchicalTask): WBSNode {
    const children = tasks
      .filter((t) => t.parent_task_id === task.id)
      .sort((a, b) => {
        // Sort by WBS code if available
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
    name: 'Projeto',
    wbsCode: '0',
    taskType: 'summary',
    children: rootTasks.map(buildNode),
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
export function useWBSData(tasks: HierarchicalTask[]) {
  const wbsTree = useMemo(() => buildWBSTree(tasks), [tasks])

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
