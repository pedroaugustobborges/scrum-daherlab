import { User } from '@supabase/supabase-js'

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
