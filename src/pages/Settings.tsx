import { Box, Container, Typography } from '@mui/material'
import Navbar from '@/components/Navbar'

export default function Settings() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Configurações
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie as configurações da sua conta aqui
        </Typography>
      </Container>
    </Box>
  )
}
