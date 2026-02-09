import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
  Typography,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Collapse,
  Fade,
  Tabs,
  Tab,
} from '@mui/material'
import {
  People,
  Description,
  PersonAdd,
  Delete,
  Badge,
  Save,
  AutoAwesome,
  Check,
  Edit,
  Group,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface EditTeamModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  teamId: string
  teamName: string
}

interface Profile {
  id: string
  full_name: string
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  user_profile: Profile
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const roleOptions = [
  { value: 'product_owner', label: 'Product Owner', color: '#6366f1' },
  { value: 'scrum_master', label: 'Scrum Master', color: '#8b5cf6' },
  { value: 'developer', label: 'Developer', color: '#10b981' },
  { value: 'member', label: 'Membro', color: '#6b7280' },
]

export default function EditTeamModal({
  open,
  onClose,
  onSuccess,
  teamId,
  teamName,
}: EditTeamModalProps) {
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentMembers, setCurrentMembers] = useState<TeamMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('developer')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  // AI Suggestion State
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [suggestionSelected, setSuggestionSelected] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Helper for seasonal title
  const getSeasonalTitle = () => {
    const month = new Date().getMonth()
    if (month === 0 || month === 1) {
      return 'Que tal um nome de time pronto para o Carnaval?'
    }
    if (month === 4 || month === 5) {
      return 'Que tal um nome de time pronto para as festas juninas?'
    }
    if (month === 6) {
      return 'Que tal um nome de time pronto para as férias escolares?'
    }
    if (month === 9) {
      return 'Que tal um nome de time pronto para o Halloween?'
    }
    if (month === 11) {
      return 'Que tal um nome de time pronto para as festas de fim de ano?'
    }
    return 'Que tal o nome?'
  }

  // Function to call Supabase Edge Function for AI suggestion
  const fetchAISuggestion = useCallback(async (teamNameInput: string) => {
    if (!teamNameInput.trim() || teamNameInput.length < 3) {
      setAiSuggestion('')
      return
    }

    setLoadingSuggestion(true)
    setSuggestionSelected(false)

    try {
      const { data, error } = await supabase.functions.invoke('generate-team-name', {
        body: { teamName: teamNameInput },
      })

      if (error) {
        throw error
      }

      setAiSuggestion(data?.suggestion || '')
    } catch (error) {
      console.error('Error fetching AI suggestion:', error)
      setAiSuggestion('')
    } finally {
      setLoadingSuggestion(false)
    }
  }, [])

  // Debounced name change handler
  const handleNameChangeWithAI = useCallback(
    (name: string) => {
      setFormData((prev) => ({ ...prev, name }))
      setSuggestionSelected(false)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchAISuggestion(name)
      }, 800)
    },
    [fetchAISuggestion]
  )

  const handleSelectSuggestion = () => {
    if (aiSuggestion) {
      setFormData((prev) => ({ ...prev, name: aiSuggestion }))
      setSuggestionSelected(true)
      setAiSuggestion('')
    }
  }

  const handleKeepOriginal = () => {
    setAiSuggestion('')
    setSuggestionSelected(false)
  }

  useEffect(() => {
    if (open && teamId) {
      fetchData()
      setTabValue(0)
      setAiSuggestion('')
      setSuggestionSelected(false)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [open, teamId])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const [teamResponse, profilesResponse, membersResponse] = await Promise.all([
        supabase.from('teams').select('name, description').eq('id', teamId).single(),
        supabase.from('profiles').select('id, full_name').order('full_name'),
        supabase
          .from('team_members')
          .select('id, user_id, role, user_profile:profiles!user_id(id, full_name)')
          .eq('team_id', teamId),
      ])

      if (teamResponse.data) {
        setFormData({
          name: teamResponse.data.name || '',
          description: teamResponse.data.description || '',
        })
      }

      if (profilesResponse.data) {
        const memberIds = membersResponse.data?.map((m) => m.user_id) || []
        const availableProfiles = profilesResponse.data.filter((p) => !memberIds.includes(p.id))
        setProfiles(availableProfiles)
      }

      if (membersResponse.data) {
        const transformedMembers = membersResponse.data.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          user_profile: Array.isArray(member.user_profile)
            ? member.user_profile[0]
            : member.user_profile,
        })) as TeamMember[]
        setCurrentMembers(transformedMembers)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar dados do time')
    } finally {
      setLoadingData(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveTeamInfo = async () => {
    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome do time')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          description: formData.description,
        })
        .eq('id', teamId)

      if (error) throw error

      toast.success('Time atualizado com sucesso!')
      onSuccess()
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error('Erro ao atualizar time')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Por favor, selecione um usuário')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from('team_members').insert([
        {
          team_id: teamId,
          user_id: selectedUserId,
          role: selectedRole,
        },
      ])

      if (error) throw error

      toast.success('Membro adicionado com sucesso!')
      setSelectedUserId('')
      setSelectedRole('developer')
      await fetchData()
      onSuccess()
    } catch (error: any) {
      console.error('Error adding member:', error)
      if (error.code === '23505') {
        toast.error('Este usuário já é membro do time')
      } else {
        toast.error('Erro ao adicionar membro')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId)

      if (error) throw error

      toast.success('Membro removido com sucesso!')
      await fetchData()
      onSuccess()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Erro ao remover membro')
    }
  }

  const getRoleConfig = (role: string) => {
    return roleOptions.find((r) => r.value === role) || roleOptions[3]
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Modal open={open} onClose={onClose} title={`Editar Time - ${teamName}`} maxWidth="md">
      {loadingData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                },
                '& .Mui-selected': {
                  color: '#6366f1',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#6366f1',
                },
              }}
            >
              <Tab icon={<Edit sx={{ fontSize: 20 }} />} iconPosition="start" label="Informações" />
              <Tab icon={<Group sx={{ fontSize: 20 }} />} iconPosition="start" label="Membros" />
            </Tabs>
          </Box>

          {/* Tab 1: Team Info */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              <Box>
                <TextField
                  fullWidth
                  label="Nome do Time"
                  value={formData.name}
                  onChange={(e) => handleNameChangeWithAI(e.target.value)}
                  required
                  placeholder="Ex: Time de Desenvolvimento Backend"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <People sx={{ color: '#6366f1' }} />
                      </InputAdornment>
                    ),
                    endAdornment: loadingSuggestion ? (
                      <InputAdornment position="end">
                        <CircularProgress size={20} sx={{ color: '#8b5cf6' }} />
                      </InputAdornment>
                    ) : suggestionSelected ? (
                      <InputAdornment position="end">
                        <AutoAwesome sx={{ color: '#8b5cf6', fontSize: 20 }} />
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    },
                  }}
                />

                {/* AI Suggestion Card */}
                <Collapse in={!!aiSuggestion && !suggestionSelected}>
                  <Fade in={!!aiSuggestion}>
                    <Box
                      sx={{
                        mt: 2,
                        p: 2.5,
                        borderRadius: 3,
                        background:
                          'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                        border: '2px solid rgba(139, 92, 246, 0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background:
                            'linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #8b5cf6 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 2s infinite linear',
                        },
                        '@keyframes shimmer': {
                          '0%': { backgroundPosition: '200% 0' },
                          '100%': { backgroundPosition: '-200% 0' },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        <AutoAwesome
                          sx={{
                            color: '#8b5cf6',
                            fontSize: 18,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#8b5cf6',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {getSeasonalTitle()}
                        </Typography>
                      </Box>

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#1f2937',
                          mb: 2,
                          fontSize: '1.25rem',
                        }}
                      >
                        {aiSuggestion}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Check />}
                          onClick={handleSelectSuggestion}
                          sx={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            borderRadius: 2,
                            px: 2.5,
                            py: 1,
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                              boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)',
                            },
                          }}
                        >
                          Usar este nome
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleKeepOriginal}
                          sx={{
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            color: '#8b5cf6',
                            borderRadius: 2,
                            px: 2.5,
                            py: 1,
                            fontWeight: 600,
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#8b5cf6',
                              bgcolor: 'rgba(139, 92, 246, 0.08)',
                            },
                          }}
                        >
                          Manter original
                        </Button>
                      </Box>
                    </Box>
                  </Fade>
                </Collapse>

                {/* Helper text */}
                {formData.name.length >= 3 &&
                  !aiSuggestion &&
                  !loadingSuggestion &&
                  !suggestionSelected && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1,
                        color: 'text.secondary',
                      }}
                    >
                      <AutoAwesome sx={{ fontSize: 14 }} />
                      Digite o nome do time para receber uma sugestão divertida da IA
                    </Typography>
                  )}
              </Box>

              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={3}
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
                  variant="contained"
                  onClick={handleSaveTeamInfo}
                  disabled={loading || !formData.name.trim()}
                  startIcon={
                    loading ? <CircularProgress size={20} color="inherit" /> : <Save />
                  }
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    fontSize: '1rem',
                  }}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* Tab 2: Members */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              {/* Current Members */}
              <Box>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                  Membros Atuais ({currentMembers.length})
                </Typography>

                {currentMembers.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      px: 3,
                      borderRadius: 3,
                      bgcolor: 'rgba(99, 102, 241, 0.05)',
                      border: '2px dashed rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Nenhum membro adicionado ainda
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0 }}>
                    {currentMembers.map((member, index) => {
                      const roleConfig = getRoleConfig(member.role)
                      return (
                        <Box key={member.id}>
                          <ListItem
                            sx={{
                              py: 2,
                              '&:hover': {
                                bgcolor: 'rgba(99, 102, 241, 0.05)',
                              },
                            }}
                          >
                            <Avatar
                              sx={{
                                mr: 2,
                                bgcolor: roleConfig.color,
                                width: 40,
                                height: 40,
                              }}
                            >
                              {member.user_profile?.full_name?.charAt(0) || 'U'}
                            </Avatar>
                            <ListItemText
                              primary={
                                <Typography variant="body1" fontWeight={600}>
                                  {member.user_profile?.full_name || 'Sem nome'}
                                </Typography>
                              }
                              secondary={
                                <Chip
                                  label={roleConfig.label}
                                  size="small"
                                  sx={{
                                    mt: 0.5,
                                    bgcolor: `${roleConfig.color}20`,
                                    color: roleConfig.color,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                  }}
                                  icon={<Badge sx={{ fontSize: 14 }} />}
                                />
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveMember(member.id)}
                                sx={{
                                  color: 'error.main',
                                  '&:hover': {
                                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                                  },
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < currentMembers.length - 1 && <Divider />}
                        </Box>
                      )
                    })}
                  </List>
                )}
              </Box>

              {/* Add New Member */}
              <Box>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                  Adicionar Novo Membro
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    select
                    label="Selecionar Usuário"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={profiles.length === 0}
                  >
                    {profiles.length === 0 ? (
                      <MenuItem disabled>Todos os usuários já são membros</MenuItem>
                    ) : (
                      profiles.map((profile) => (
                        <MenuItem key={profile.id} value={profile.id}>
                          {profile.full_name || 'Sem nome'}
                        </MenuItem>
                      ))
                    )}
                  </TextField>

                  <TextField
                    fullWidth
                    select
                    label="Função no Time"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {roleOptions.map((option) => (
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

                  <Button
                    variant="contained"
                    onClick={handleAddMember}
                    disabled={loading || !selectedUserId}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                    }}
                  >
                    {loading ? 'Adicionando...' : 'Adicionar Membro'}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </TabPanel>
        </>
      )}
    </Modal>
  )
}
