import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Close, Link, Google, CalendarMonth } from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateCalendarSubscription } from '@/hooks/useCalendarSubscriptions'
import { detectCalendarType, isValidICSUrl } from '@/utils/calendar/corsProxy'
import { CALENDAR_COLORS, CALENDAR_TYPE_OPTIONS } from '@/types/calendar'

interface AddCalendarModalProps {
  open: boolean
  onClose: () => void
}

export default function AddCalendarModal({ open, onClose }: AddCalendarModalProps) {
  const { user } = useAuth()
  const createSubscription = useCreateCalendarSubscription()

  const [name, setName] = useState('')
  const [icsUrl, setIcsUrl] = useState('')
  const [calendarType, setCalendarType] = useState<'google' | 'outlook' | 'apple' | 'other'>('other')
  const [color, setColor] = useState(CALENDAR_COLORS[0])
  const [urlError, setUrlError] = useState('')

  // Auto-detect calendar type when URL changes
  useEffect(() => {
    if (icsUrl) {
      const detectedType = detectCalendarType(icsUrl)
      setCalendarType(detectedType)

      // Validate URL
      if (!isValidICSUrl(icsUrl)) {
        setUrlError('URL inválida. Certifique-se de que é um link de calendário ICS válido.')
      } else {
        setUrlError('')
      }
    }
  }, [icsUrl])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('')
      setIcsUrl('')
      setCalendarType('other')
      setColor(CALENDAR_COLORS[0])
      setUrlError('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!name.trim()) {
      return
    }
    if (!icsUrl.trim() || urlError) {
      return
    }

    createSubscription.mutate(
      {
        userId: user?.id || '',
        subscription: {
          name: name.trim(),
          ics_url: icsUrl.trim(),
          color,
          calendar_type: calendarType,
        },
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  const getCalendarTypeIcon = (type: string) => {
    switch (type) {
      case 'google':
        return <Google />
      case 'outlook':
        return <CalendarMonth />
      default:
        return <CalendarMonth />
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Link sx={{ color: '#6366f1' }} />
          <Typography variant="h6" fontWeight={700}>
            Adicionar Calendário Externo
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {createSubscription.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {(createSubscription.error as Error)?.message || 'Falha ao adicionar calendário'}
          </Alert>
        )}

        <TextField
          label="Nome do Calendário"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Meu Google Calendar"
          sx={{ mb: 2 }}
          InputProps={{
            sx: { borderRadius: 2 },
          }}
        />

        <TextField
          label="URL do Calendário (ICS)"
          fullWidth
          value={icsUrl}
          onChange={(e) => setIcsUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/..."
          error={!!urlError}
          helperText={urlError}
          sx={{ mb: 2 }}
          InputProps={{
            sx: { borderRadius: 2 },
          }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de Calendário</InputLabel>
          <Select
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value as typeof calendarType)}
            label="Tipo de Calendário"
            sx={{ borderRadius: 2 }}
          >
            {CALENDAR_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getCalendarTypeIcon(opt.value)}
                  {opt.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Cor do Calendário
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CALENDAR_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setColor(c)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border: color === c ? '3px solid #1f2937' : '3px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            O calendário precisa ser <strong>público</strong> ou ter um link de acesso compartilhável para
            funcionar corretamente.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || !icsUrl.trim() || !!urlError || createSubscription.isPending}
          sx={{
            borderRadius: 2,
            minWidth: 120,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          }}
        >
          {createSubscription.isPending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Adicionar'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
