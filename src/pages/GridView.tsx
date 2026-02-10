import { Box, Typography } from '@mui/material'
import { useProjectContext } from './ProjectDetail'
import ProjectGridView from '@/components/grid/ProjectGridView'

export default function GridView() {
  const { project } = useProjectContext()

  return (
    <Box sx={{ height: 'calc(100vh - 250px)' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Visão em Grade
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gerencie tarefas em uma lista hierárquica estilo MS Project
        </Typography>
      </Box>

      <ProjectGridView projectId={project.id} />
    </Box>
  )
}
