import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Rating,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material'
import {
  Visibility,
  Save,
  Star,
  Assignment,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface ReviewMeetingFormProps {
  sprintId: string
  sprintName: string
  stories: Array<{
    id: string
    title: string
    status: string
  }>
}

interface SprintReview {
  id: string
  demo_notes: string
  stakeholder_feedback: string
  accepted_stories: number
  rejected_stories: number
  overall_satisfaction: number
  next_steps: string
}

export default function ReviewMeetingForm({ sprintId, sprintName, stories }: ReviewMeetingFormProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<SprintReview | null>(null)
  const [formData, setFormData] = useState({
    demo_notes: '',
    stakeholder_feedback: '',
    accepted_stories: 0,
    rejected_stories: 0,
    overall_satisfaction: 3,
    next_steps: '',
  })

  useEffect(() => {
    fetchReview()
  }, [sprintId])

  const fetchReview = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sprint_reviews')
        .select('*')
        .eq('sprint_id', sprintId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setReview(data)
        setFormData({
          demo_notes: data.demo_notes || '',
          stakeholder_feedback: data.stakeholder_feedback || '',
          accepted_stories: data.accepted_stories || 0,
          rejected_stories: data.rejected_stories || 0,
          overall_satisfaction: data.overall_satisfaction || 3,
          next_steps: data.next_steps || '',
        })
      }
    } catch (error) {
      console.error('Error fetching review:', error)
      toast.error('Erro ao carregar review')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: user } = await supabase.auth.getUser()

      if (review) {
        // Update existing review
        const { error } = await supabase
          .from('sprint_reviews')
          .update({
            ...formData,
            meeting_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', review.id)

        if (error) throw error
      } else {
        // Create new review
        const { error } = await supabase.from('sprint_reviews').insert([
          {
            sprint_id: sprintId,
            ...formData,
            meeting_date: new Date().toISOString().split('T')[0],
            created_by: user.user?.id,
          },
        ])

        if (error) throw error
      }

      toast.success('Sprint review salvo com sucesso!')
      await fetchReview()
    } catch (error) {
      console.error('Error saving review:', error)
      toast.error('Erro ao salvar review')
    } finally {
      setSaving(false)
    }
  }

  const completedStories = stories.filter((s) => s.status === 'done').length

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '2px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Visibility sx={{ fontSize: 40, color: '#6366f1' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Sprint Review - {sprintName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Demonstração e feedback dos stakeholders
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            icon={<Assignment />}
            label={`${completedStories}/${stories.length} histórias concluídas`}
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontWeight: 600,
            }}
          />
          <Chip
            icon={<ThumbUp />}
            label={`${formData.accepted_stories} aceitas`}
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              fontWeight: 600,
            }}
          />
          {formData.rejected_stories > 0 && (
            <Chip
              icon={<ThumbDown />}
              label={`${formData.rejected_stories} rejeitadas`}
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: 600,
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Form */}
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '2px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Notas da Demonstração
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Descreva as histórias demonstradas, funcionalidades apresentadas e principais destaques..."
            value={formData.demo_notes}
            onChange={(e) => setFormData({ ...formData, demo_notes: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              type="number"
              label="Histórias Aceitas"
              value={formData.accepted_stories}
              onChange={(e) => setFormData({ ...formData, accepted_stories: parseInt(e.target.value) || 0 })}
              inputProps={{ min: 0, max: stories.length }}
              InputProps={{
                startAdornment: <ThumbUp sx={{ mr: 1, color: '#10b981' }} />,
              }}
            />
            <TextField
              type="number"
              label="Histórias Rejeitadas"
              value={formData.rejected_stories}
              onChange={(e) => setFormData({ ...formData, rejected_stories: parseInt(e.target.value) || 0 })}
              inputProps={{ min: 0, max: stories.length }}
              InputProps={{
                startAdornment: <ThumbDown sx={{ mr: 1, color: '#ef4444' }} />,
              }}
            />
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '2px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Feedback dos Stakeholders
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Compile os comentários, sugestões e feedback recebido dos stakeholders..."
            value={formData.stakeholder_feedback}
            onChange={(e) => setFormData({ ...formData, stakeholder_feedback: e.target.value })}
          />
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '2px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Satisfação Geral
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Rating
              value={formData.overall_satisfaction}
              onChange={(_, newValue) => {
                setFormData({ ...formData, overall_satisfaction: newValue || 3 })
              }}
              size="large"
              icon={<Star sx={{ fontSize: 40 }} />}
              emptyIcon={<Star sx={{ fontSize: 40 }} />}
            />
            <Typography variant="body2" color="text.secondary">
              {formData.overall_satisfaction === 1 && 'Muito insatisfeito'}
              {formData.overall_satisfaction === 2 && 'Insatisfeito'}
              {formData.overall_satisfaction === 3 && 'Neutro'}
              {formData.overall_satisfaction === 4 && 'Satisfeito'}
              {formData.overall_satisfaction === 5 && 'Muito satisfeito'}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Como os stakeholders avaliaram a demonstração e o valor entregue?
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '2px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Próximos Passos
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Defina os próximos passos, prioridades para o próximo sprint e ações necessárias..."
            value={formData.next_steps}
            onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
          />
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
            }}
          >
            {saving ? 'Salvando...' : review ? 'Atualizar Review' : 'Salvar Review'}
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
