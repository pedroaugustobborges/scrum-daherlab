import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { WBSDiagram } from '@/components/wbs'

export default function WBSView() {
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
      <WBSDiagram projectId={projectId} />
    </Box>
  )
}
