import { useState, useEffect } from 'react'
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Skeleton,
  IconButton,
  Chip,
  Breadcrumbs,
  Link,
  alpha,
} from '@mui/material'
import {
  ArrowBack,
  Settings,
  Dashboard,
  ViewKanban,
  List,
  Speed,
  Timeline,
  AccountTree,
  TableChart,
  CalendarMonth,
  LinearScale,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useProjectConfig, getEnabledModules } from '@/hooks/useProjectConfig'
import type { ProjectConfiguration } from '@/types/hybrid'

interface Project {
  id: string
  name: string
  description: string
  status: string
  start_date: string
  end_date: string
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: '#10b981' },
  'on-hold': { label: 'Em Espera', color: '#f59e0b' },
  completed: { label: 'Concluído', color: '#6366f1' },
  archived: { label: 'Arquivado', color: '#6b7280' },
}

const iconMap: Record<string, React.ReactNode> = {
  overview: <Dashboard />,
  kanban: <ViewKanban />,
  backlog: <List />,
  sprints: <Speed />,
  gantt: <Timeline />,
  wbs: <AccountTree />,
  grid: <TableChart />,
  calendar: <CalendarMonth />,
  timeline: <LinearScale />,
  settings: <Settings />,
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const { data: config, isLoading: configLoading } = useProjectConfig(projectId)

  // Valid tab values
  const validTabs = ['overview', 'kanban', 'backlog', 'sprints', 'gantt', 'wbs', 'grid', 'calendar', 'timeline', 'settings']

  // Get current tab from URL - check if last segment is a valid tab, otherwise default to overview
  const pathSegments = location.pathname.split('/')
  const lastSegment = pathSegments[pathSegments.length - 1]
  const currentTab = validTabs.includes(lastSegment) ? lastSegment : 'overview'
  const [activeTab, setActiveTab] = useState(currentTab)

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  useEffect(() => {
    setActiveTab(currentTab)
  }, [currentTab])

  const fetchProject = async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
      toast.error('Erro ao carregar projeto')
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue)
    navigate(`/projects/${projectId}/${newValue}`)
  }

  // Build tabs based on enabled modules
  const buildTabs = () => {
    const tabs: { value: string; label: string; icon: React.ReactNode }[] = [
      { value: 'overview', label: 'Visão Geral', icon: iconMap.overview },
    ]

    if (config) {
      const enabledModules = getEnabledModules(config)
      enabledModules.forEach((module) => {
        tabs.push({
          value: module.route,
          label: module.label,
          icon: iconMap[module.key] || <Dashboard />,
        })
      })
    }

    // Always add settings at the end
    tabs.push({ value: 'settings', label: 'Configurações', icon: iconMap.settings })

    return tabs
  }

  const tabs = buildTabs()

  if (loading || configLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={300} height={40} />
              <Skeleton variant="text" width={200} height={24} />
            </Box>
          </Box>
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 2, mb: 3 }} />
          <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 3 }} />
        </Container>
      </Box>
    )
  }

  if (!project) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Projeto não encontrado
          </Typography>
        </Container>
      </Box>
    )
  }

  const status = statusConfig[project.status] || statusConfig.active

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 64, // Below navbar
          zIndex: 100,
        }}
      >
        <Container maxWidth="xl">
          {/* Breadcrumbs */}
          <Box sx={{ pt: 2 }}>
            <Breadcrumbs sx={{ fontSize: '0.875rem' }}>
              <Link
                component="button"
                underline="hover"
                color="text.secondary"
                onClick={() => navigate('/projects')}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                Projetos
              </Link>
              <Typography color="text.primary" fontWeight={600}>
                {project.name}
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Project Info */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/projects')}
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                }}
              >
                <ArrowBack sx={{ color: '#6366f1' }} />
              </IconButton>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {project.name}
                  </Typography>
                  <Chip
                    label={status.label}
                    size="small"
                    sx={{
                      bgcolor: alpha(status.color, 0.1),
                      color: status.color,
                      fontWeight: 600,
                    }}
                  />
                  {config && (
                    <Chip
                      label={
                        config.methodology === 'agile'
                          ? 'Ágil'
                          : config.methodology === 'predictive'
                          ? 'Preditivo'
                          : 'Híbrido'
                      }
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: '#6366f1',
                        color: '#6366f1',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                {project.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      maxWidth: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.description}
                  </Typography>
                )}
              </Box>
            </Box>

            <IconButton
              onClick={() => navigate(`/projects/${projectId}/settings`)}
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              }}
            >
              <Settings sx={{ color: '#6366f1' }} />
            </IconButton>
          </Box>

          {/* Navigation Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#6366f1',
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#6366f1',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon as React.ReactElement}
                iconPosition="start"
                sx={{
                  '& .MuiTab-iconWrapper': {
                    mr: 1,
                  },
                }}
              />
            ))}
          </Tabs>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Outlet context={{ project, config, refreshProject: fetchProject }} />
      </Container>
    </Box>
  )
}

// Hook to use project context in child routes
import { useOutletContext } from 'react-router-dom'

interface ProjectContext {
  project: Project
  config: ProjectConfiguration | null
  refreshProject: () => Promise<void>
}

export function useProjectContext() {
  return useOutletContext<ProjectContext>()
}
