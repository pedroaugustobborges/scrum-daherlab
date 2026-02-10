import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { GanttChart } from '@/components/gantt'

export default function GanttView() {
  const { projectId } = useParams<{ projectId: string }>()

  if (!projectId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Projeto não encontrado</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
      <GanttChart projectId={projectId} />
    </Box>
  )
}
