import { useState } from 'react'
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import {
  Assignment,
  CalendarToday,
  Description,
  TrendingUp,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const statusOptions = [
  { value: 'active', label: 'Ativo', color: '#10b981' },
  { value: 'on-hold', label: 'Em Espera', color: '#f59e0b' },
  { value: 'completed', label: 'Concluído', color: '#6366f1' },
  { value: 'archived', label: 'Arquivado', color: '#6b7280' },
]

export default function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome do projeto')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from('projects').insert([
        {
          name: formData.name,
          description: formData.description,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          created_by: user?.id,
        },
      ])

      if (error) throw error

      toast.success('Projeto criado com sucesso!')
      setFormData({
        name: '',
        description: '',
        status: 'active',
        start_date: '',
        end_date: '',
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar Novo Projeto" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Nome do Projeto"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Ex: Sistema de Gestão Financeira"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Assignment sx={{ color: '#6366f1' }} />
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
            placeholder="Descreva os objetivos e escopo do projeto..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  <Description sx={{ color: '#6366f1' }} />
                </InputAdornment>
              ),
            }}
          />

          <Box>
            <TextField
              fullWidth
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TrendingUp sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: option.color,
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              type="date"
              label="Data de Início"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type="date"
              label="Data de Término"
              value={formData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                min: formData.start_date,
              }}
            />
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
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Assignment />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
              }}
            >
              {loading ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Modal>
  )
}
