import { useState, useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Chip, LinearProgress, IconButton } from '@mui/material'
import { Assignment, CalendarToday, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import ProjectDetailsModal from './ProjectDetailsModal'

interface ActiveProject {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: string
  completed_tasks: number
  total_tasks: number
}

const ITEMS_PER_PAGE = 2

export default function ActiveProjectsWidget() {
  const [loading, setLoading] = useState(true)
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [onTimeCount, setOnTimeCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ActiveProject | null>(null)

  const totalPages = Math.ceil(activeProjects.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProjects = activeProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    fetchActiveProjects()
  }, [])

  const fetchActiveProjects = async () => {
    try {
      setLoading(true)

      // Fetch active projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, start_date, end_date, status')
        .eq('status', 'active')
        .order('end_date', { ascending: true })

      if (projectsError) throw projectsError

      if (!projects || projects.length === 0) {
        setTotalCount(0)
        setActiveProjects([])
        setOnTimeCount(0)
        return
      }

      setTotalCount(projects.length)

      // Count on-time projects (end_date >= today)
      const now = new Date()
      const onTime = projects.filter((p) => new Date(p.end_date) >= now).length
      setOnTimeCount(onTime)

      // Fetch task counts for each project
      const projectData = await Promise.all(
        projects.map(async (project) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('status')
            .eq('project_id', project.id)

          if (tasksError) throw tasksError

          const completed = tasks?.filter((task) => task.status === 'done').length || 0
          const total = tasks?.length || 0

          return {
            id: project.id,
            name: project.name,
            description: project.description || '',
            start_date: project.start_date,
            end_date: project.end_date,
            status: project.status,
            completed_tasks: completed,
            total_tasks: total,
          }
        })
      )

      setActiveProjects(projectData)
    } catch (error) {
      console.error('Error fetching active projects:', error)
      setTotalCount(0)
      setActiveProjects([])
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (project: ActiveProject) => {
    if (project.total_tasks === 0) return 0
    return Math.round((project.completed_tasks / project.total_tasks) * 100)
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const diff = end - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const getStatusColor = (endDate: string) => {
    const days = getDaysRemaining(endDate)
    if (days < 0) return '#dc2626' // Overdue - red
    if (days <= 7) return '#f59e0b' // Soon - amber
    return '#1e40af' // On track - blue
  }

  const handleOpenDetails = (project: ActiveProject) => {
    setSelectedProject(project)
    setDetailsModalOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailsModalOpen(false)
    setSelectedProject(null)
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '2px solid rgba(30, 64, 175, 0.2)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} sx={{ color: '#1e40af' }} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
        border: '2px solid rgba(30, 64, 175, 0.2)',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(30, 64, 175, 0.15)',
          border: '2px solid rgba(30, 64, 175, 0.4)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(30, 64, 175, 0.3)',
          }}
        >
          <Assignment sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#1e40af', mb: 0.5 }}>
            {totalCount}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Projetos Ativos
          </Typography>
        </Box>
      </Box>

      {totalCount > 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(30, 64, 175, 0.08)',
            }}
          >
            <CalendarToday sx={{ fontSize: 18, color: '#1e40af' }} />
            <Typography variant="body2" fontWeight={600} sx={{ color: '#1e40af' }}>
              {onTimeCount} {onTimeCount === 1 ? 'projeto no prazo' : 'projetos no prazo'}
            </Typography>
          </Box>

          <Box
            sx={{
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              pr: 0.5,
              '&::-webkit-scrollbar': {
                width: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(30, 64, 175, 0.05)',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(30, 64, 175, 0.3)',
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: 'rgba(30, 64, 175, 0.5)',
                },
              },
            }}
          >
            {paginatedProjects.map((project) => {
              const daysRemaining = getDaysRemaining(project.end_date)
              const statusColor = getStatusColor(project.end_date)

              return (
                <Box
                  key={project.id}
                  onClick={() => handleOpenDetails(project)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'white',
                    border: '1px solid rgba(30, 64, 175, 0.15)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'rgba(30, 64, 175, 0.3)',
                      boxShadow: '0 4px 12px rgba(30, 64, 175, 0.15)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '60%',
                      }}
                    >
                      {project.name}
                    </Typography>
                    <Chip
                      label={
                        daysRemaining < 0
                          ? 'Atrasado'
                          : daysRemaining === 0
                            ? 'Hoje'
                            : `${daysRemaining}d`
                      }
                      size="small"
                      sx={{
                        bgcolor: `${statusColor}15`,
                        color: statusColor,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress(project)}
                    sx={{
                      height: 6,
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 64, 175, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)`,
                        borderRadius: 10,
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {project.completed_tasks}/{project.total_tasks} tarefas
                    </Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#1e40af' }}>
                      {calculateProgress(project)}%
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>

          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 2,
                pt: 1.5,
                borderTop: '1px solid rgba(30, 64, 175, 0.1)',
              }}
            >
              <IconButton
                size="small"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                sx={{
                  color: '#1e40af',
                  '&:disabled': { color: 'rgba(30, 64, 175, 0.3)' },
                  '&:hover': { bgcolor: 'rgba(30, 64, 175, 0.1)' },
                }}
              >
                <KeyboardArrowUp fontSize="small" />
              </IconButton>
              <Typography variant="caption" fontWeight={600} sx={{ color: '#1e40af' }}>
                {currentPage} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                sx={{
                  color: '#1e40af',
                  '&:disabled': { color: 'rgba(30, 64, 175, 0.3)' },
                  '&:hover': { bgcolor: 'rgba(30, 64, 175, 0.1)' },
                }}
              >
                <KeyboardArrowDown fontSize="small" />
              </IconButton>
            </Box>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nenhum projeto ativo no momento
        </Typography>
      )}

      {selectedProject && (
        <ProjectDetailsModal
          open={detailsModalOpen}
          onClose={handleCloseDetails}
          project={{
            id: selectedProject.id,
            name: selectedProject.name,
            description: selectedProject.description,
            status: selectedProject.status,
            start_date: selectedProject.start_date,
            end_date: selectedProject.end_date,
          }}
        />
      )}
    </Paper>
  )
}
