import { User } from '@supabase/supabase-js'

// Re-export all hybrid types
export * from './hybrid'

export interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAdminStatus: () => Promise<void>
}

export interface Sprint {
  id: string
  name: string
  goal: string
  start_date: string
  end_date: string
  status: 'planning' | 'active' | 'completed'
  team_id: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'on-hold' | 'completed'
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  sprint_id: string
  assigned_to: string | null
  story_points: number
  created_at: string
  updated_at: string
}

// Dashboard Widget Configuration Types
export type WidgetType =
  | 'activeProjects'
  | 'activeSprints'
  | 'actionItems'
  | 'activityOverview'
  | 'taskDistribution'
  | 'recentActivity'
  | 'productivityTrend'
  | 'teamWorkload'

export interface WidgetConfig {
  id: string
  type: WidgetType
  visible: boolean
  order: number
}

export interface DashboardConfig {
  widgets: WidgetConfig[]
  layout?: 'default' | 'compact'
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  widgets: [
    { id: '1', type: 'activeProjects', visible: true, order: 0 },
    { id: '2', type: 'activeSprints', visible: true, order: 1 },
    { id: '3', type: 'actionItems', visible: true, order: 2 },
    { id: '4', type: 'productivityTrend', visible: true, order: 3 },
    { id: '5', type: 'teamWorkload', visible: true, order: 4 },
    { id: '6', type: 'activityOverview', visible: true, order: 5 },
    { id: '7', type: 'taskDistribution', visible: true, order: 6 },
    { id: '8', type: 'recentActivity', visible: true, order: 7 },
  ],
  layout: 'default'
}

export const WIDGET_LABELS: Record<WidgetType, string> = {
  activeProjects: 'Projetos Ativos',
  activeSprints: 'Sprints Ativos',
  actionItems: 'Ações Pendentes',
  activityOverview: 'Visão Geral',
  taskDistribution: 'Distribuição de Tarefas',
  recentActivity: 'Atividade Recente',
  productivityTrend: 'Produtividade Semanal',
  teamWorkload: 'Carga do Time',
}
