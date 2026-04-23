import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Projects from '@/pages/Projects'
import ProjectDetail from '@/pages/ProjectDetail'
import ProjectOverview from '@/pages/ProjectOverview'
import ProjectSettings from '@/pages/ProjectSettings'
import GridView from '@/pages/GridView'
import GanttView from '@/pages/GanttView'
import WBSView from '@/pages/WBSView'
import KanbanView from '@/pages/KanbanView'
import SprintsView from '@/pages/SprintsView'
import BacklogView from '@/pages/BacklogView'
import Sprints from '@/pages/Sprints'
import ProductBacklog from '@/pages/ProductBacklog'
import Teams from '@/pages/Teams'
import Settings from '@/pages/Settings'
import ScrumGuide from '@/pages/ScrumGuide'
import AdminPanel from '@/pages/AdminPanel'
import Planner from '@/pages/Planner'
import Calendar from '@/pages/Calendar'
import ProjectCalendarView from '@/pages/ProjectCalendarView'
import TimelineView from '@/pages/TimelineView'


function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1f2937',
            borderRadius: '16px',
            border: '2px solid rgba(99, 102, 241, 0.2)',
            padding: '16px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              border: '2px solid rgba(16, 185, 129, 0.3)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              border: '2px solid rgba(239, 68, 68, 0.3)',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        {/* Project Detail with nested routes */}
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<ProjectOverview />} />
          <Route path="kanban" element={<KanbanView />} />
          <Route path="backlog" element={<BacklogView />} />
          <Route path="sprints" element={<SprintsView />} />
          <Route path="gantt" element={<GanttView />} />
          <Route path="wbs" element={<WBSView />} />
          <Route path="grid" element={<GridView />} />
          <Route path="calendar" element={<ProjectCalendarView />} />
          <Route path="timeline" element={<TimelineView />} />
          <Route path="settings" element={<ProjectSettings />} />
        </Route>
        <Route
          path="/sprints"
          element={
            <ProtectedRoute>
              <Sprints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/backlog"
          element={
            <ProtectedRoute>
              <ProductBacklog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planner"
          element={
            <ProtectedRoute>
              <Planner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Teams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrum-guide"
          element={
            <ProtectedRoute>
              <ScrumGuide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
