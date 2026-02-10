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
} from '@mui/material'
import {
  Assignment,
  Description,
  CalendarToday,
  Groups,
  TrendingUp,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setTeamsLoading(true)
    try {
      const { data: userTeamMembers, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)

      if (memberError) throw memberError

      const userTeamIds = userTeamMembers?.map((tm) => tm.team_id) || []

      if (userTeamIds.length === 0) {
        const { data: allTeams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .order('name')

        if (teamsError) throw teamsError
        setTeams(allTeams || [])
      } else {
        const { data: userTeams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', userTeamIds)
          .order('name')

        if (teamsError) throw teamsError
        setTeams(userTeams || [])
      }
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
      <TextField
        fullWidth
        label="Descrição"
        value={data.description}
        onChange={(e) => onChange({ description: e.target.value })}
        multiline
        rows={3}
        placeholder="Descreva os objetivos e escopo do projeto..."
        InputProps={{
          startAdornment: (
            <InputAdornment
              position="start"
              sx={{ alignSelf: 'flex-start', mt: 2 }}
            >
              <Description sx={{ color: '#6366f1' }} />
            </InputAdornment>
          ),
        }}
      />

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
            label="Opcional"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: 'rgba(107, 114, 128, 0.1)',
              color: '#6b7280',
            }}
          />
        </Box>
        <FormControl fullWidth>
          <InputLabel id="teams-select-label">Selecione os times</InputLabel>
          <Select
            labelId="teams-select-label"
            multiple
            value={data.selectedTeams}
            onChange={(e) =>
              onChange({ selectedTeams: e.target.value as string[] })
            }
            input={<OutlinedInput label="Selecione os times" />}
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
