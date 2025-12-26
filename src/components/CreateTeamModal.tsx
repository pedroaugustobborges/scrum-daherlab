import { useState } from 'react'
import {
  TextField,
  Button,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import { People, Description } from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface CreateTeamModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateTeamModal({
  open,
  onClose,
  onSuccess,
}: CreateTeamModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome do time')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from('teams').insert([
        {
          name: formData.name,
          description: formData.description,
          created_by: user?.id,
        },
      ])

      if (error) throw error

      toast.success('Time criado com sucesso!')
      setFormData({
        name: '',
        description: '',
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error('Erro ao criar time')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar Novo Time" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Nome do Time"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Ex: Time de Desenvolvimento Backend"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <People sx={{ color: '#6366f1' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                fontWeight: 500,
              },
            }}
          />

          <TextField
            fullWidth
            label="Descrição"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={4}
            placeholder="Descreva as responsabilidades e foco do time..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  <Description sx={{ color: '#6366f1' }} />
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
              border: '2px solid rgba(99, 102, 241, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <People sx={{ color: '#6366f1', fontSize: 20 }} />
              <Box sx={{ fontWeight: 600, color: '#6366f1' }}>Dica</Box>
            </Box>
            <Box sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.6 }}>
              Após criar o time, você poderá adicionar membros e definir suas funções (Scrum
              Master, Product Owner, Developer, etc.)
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'flex-end',
              pt: 2,
              borderTop: '2px solid',
              borderColor: 'rgba(99, 102, 241, 0.1)',
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={loading}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                borderWidth: 2,
                borderColor: 'rgba(99, 102, 241, 0.3)',
                color: '#6366f1',
                fontWeight: 600,
                '&:hover': {
                  borderWidth: 2,
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                },
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <People />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
              }}
            >
              {loading ? 'Criando...' : 'Criar Time'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Modal>
  )
}
