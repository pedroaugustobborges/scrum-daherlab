import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Chip,
  Checkbox,
  ListItemText,
  CircularProgress,
  alpha,
} from '@mui/material'
import {
  Assignment,
  Description,
  CalendarToday,
  Groups,
  Insights,
  TrendingUp,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { WizardData } from '@/types/hybrid'

interface WizardStepBasicInfoProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
}

interface Team {
  id: string
  name: string
}

const statusOptions = [
  { value: 'active', label: 'Ativo', color: '#10b981' },
  { value: 'on-hold', label: 'Em Espera', color: '#f59e0b' },
  { value: 'completed', label: 'Concluído', color: '#6366f1' },
  { value: 'archived', label: 'Arquivado', color: '#6b7280' },
]

export default function WizardStepBasicInfo({
  data,
  onChange,
}: WizardStepBasicInfoProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setTeamsLoading(true)
    try {
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (teamsError) throw teamsError
      setTeams(allTeams || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Erro ao carregar times')
    } finally {
      setTeamsLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Informações Básicas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Defina o nome, descrição e datas do seu projeto
        </Typography>
      </Box>

      {/* Project Name */}
      <TextField
        fullWidth
        label="Nome do Projeto"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
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

      {/* Description */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Description sx={{ color: '#6366f1', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Descrição
          </Typography>
          <Chip
            label="Obrigatório"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          />
        </Box>
        <TextField
          fullWidth
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          multiline
          rows={3}
          placeholder="Descreva os objetivos e escopo do projeto..."
          error={!data.description.trim()}
          helperText={
            !data.description.trim()
              ? 'Uma boa descrição ajuda o time a entender o propósito do projeto.'
              : ''
          }
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-error fieldset': { borderColor: 'rgba(239,68,68,0.5)' },
            },
          }}
        />
      </Box>

      {/* Strategic Planning */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Insights sx={{ color: '#8b5cf6', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Planejamento Estratégico
          </Typography>
          <Chip
            label="Obrigatório"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {[
            {
              value: true,
              label: 'Sim',
              description: 'Faz parte do planejamento estratégico da organização',
              color: '#10b981',
            },
            {
              value: false,
              label: 'Não',
              description: 'Projeto operacional ou tático',
              color: '#6b7280',
            },
          ].map(({ value, label, description, color }) => {
            const selected = data.strategic_planning === value
            return (
              <Box
                key={String(value)}
                onClick={() => onChange({ strategic_planning: value })}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: selected ? color : 'rgba(0,0,0,0.12)',
                  bgcolor: selected ? alpha(color, 0.06) : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: color,
                    bgcolor: alpha(color, 0.04),
                  },
                }}
              >
                <Typography
                  variant="body1"
                  fontWeight={700}
                  sx={{ color: selected ? color : 'text.primary', mb: 0.5 }}
                >
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
              </Box>
            )
          })}
        </Box>
        {data.strategic_planning === null && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            Selecione uma opção para continuar.
          </Typography>
        )}
      </Box>

      {/* Status */}
      <TextField
        fullWidth
        select
        label="Status Inicial"
        value={data.status}
        onChange={(e) => onChange({ status: e.target.value })}
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

      {/* Teams */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Groups sx={{ color: '#6366f1', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Times Responsáveis
          </Typography>
          <Chip
            label="Obrigatório"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          />
        </Box>
        <FormControl fullWidth error={data.selectedTeams.length === 0}>
          <InputLabel id="teams-select-label">Selecione os times *</InputLabel>
          <Select
            labelId="teams-select-label"
            multiple
            value={data.selectedTeams}
            onChange={(e) =>
              onChange({ selectedTeams: e.target.value as string[] })
            }
            input={<OutlinedInput label="Selecione os times *" />}
            disabled={teamsLoading}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => {
                  const team = teams.find((t) => t.id === value)
                  return (
                    <Chip
                      key={value}
                      label={team?.name || value}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        fontWeight: 600,
                      }}
                    />
                  )
                })}
              </Box>
            )}
          >
            {teamsLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Carregando times...
              </MenuItem>
            ) : teams.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Nenhum time disponível
                </Typography>
              </MenuItem>
            ) : (
              teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  <Checkbox
                    checked={data.selectedTeams.indexOf(team.id) > -1}
                    sx={{
                      color: '#6366f1',
                      '&.Mui-checked': { color: '#6366f1' },
                    }}
                  />
                  <ListItemText primary={team.name} />
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <Typography
          variant="caption"
          color={data.selectedTeams.length === 0 ? 'error' : 'text.secondary'}
          sx={{ display: 'block', mt: 1 }}
        >
          {data.selectedTeams.length === 0
            ? 'É necessário selecionar pelo menos um time para criar o projeto.'
            : 'Somente membros destes times terão acesso ao projeto.'}
        </Typography>
      </Box>

      {/* Dates */}
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
          value={data.start_date}
          onChange={(e) => onChange({ start_date: e.target.value })}
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
          value={data.end_date}
          onChange={(e) => onChange({ end_date: e.target.value })}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarToday sx={{ color: '#6366f1', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          inputProps={{
            min: data.start_date,
          }}
        />
      </Box>
    </Box>
  )
}
