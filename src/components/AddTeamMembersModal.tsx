import { useState, useEffect } from 'react'
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Typography,
  Divider,
} from '@mui/material'
import { PersonAdd, Delete, Badge } from '@mui/icons-material'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'

interface AddTeamMembersModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  teamId: string
  teamName: string
}

interface Profile {
  id: string
  full_name: string
  email?: string
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  user_profile: Profile
}

const roleOptions = [
  { value: 'product_owner', label: 'Product Owner', color: '#6366f1' },
  { value: 'scrum_master', label: 'Scrum Master', color: '#8b5cf6' },
  { value: 'developer', label: 'Developer', color: '#10b981' },
  { value: 'member', label: 'Membro', color: '#6b7280' },
]

export default function AddTeamMembersModal({
  open,
  onClose,
  onSuccess,
  teamId,
  teamName,
}: AddTeamMembersModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentMembers, setCurrentMembers] = useState<TeamMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('developer')

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, teamId])

  const fetchData = async () => {
    setLoadingMembers(true)
    try {
      const [profilesResponse, membersResponse] = await Promise.all([
        supabase.from('profiles').select('id, full_name').order('full_name'),
        supabase
          .from('team_members')
          .select('id, user_id, role, user_profile:profiles!user_id(id, full_name)')
          .eq('team_id', teamId),
      ])

      if (profilesResponse.data) {
        const memberIds = membersResponse.data?.map((m) => m.user_id) || []
        const availableProfiles = profilesResponse.data.filter((p) => !memberIds.includes(p.id))
        setProfiles(availableProfiles)
      }

      if (membersResponse.data) {
        setCurrentMembers(membersResponse.data as TeamMember[])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoadingMembers(false)
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

  return (
    <Modal open={open} onClose={onClose} title={`Gerenciar Membros - ${teamName}`} maxWidth="md">
      <Stack spacing={3}>
        {/* Current Members */}
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
            Membros Atuais ({currentMembers.length})
          </Typography>

          {loadingMembers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : currentMembers.length === 0 ? (
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
                        {member.user_profile.full_name?.charAt(0) || 'U'}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight={600}>
                            {member.user_profile.full_name || 'Sem nome'}
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
                              bgcolor: 'error.lighter',
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
    </Modal>
  )
}
