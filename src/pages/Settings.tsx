import { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Divider,
  Button,
  TextField,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material'
import {
  Person,
  Dashboard,
  Lock,
  ExpandMore,
  ExpandLess,
  Save,
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import { ProfilePhotoUpload, DashboardPreferences } from '@/components/settings'
import { IOSWidget } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  )

  // Profile section state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Password section state
  const [passwordExpanded, setPasswordExpanded] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleUpdateProfile = async () => {
    if (!user?.id) return

    try {
      setUpdatingProfile(true)

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })

      if (authError) throw authError

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (profileError) throw profileError

      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    setPasswordError(null)

    // Validation
    if (!newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem')
      return
    }

    try {
      setUpdatingPassword(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success('Senha atualizada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordExpanded(false)
    } catch (error: any) {
      console.error('Error updating password:', error)
      setPasswordError(error.message || 'Erro ao atualizar senha')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleAvatarUploadSuccess = (url: string) => {
    setAvatarUrl(url)
  }

  const handleAvatarRemoveSuccess = () => {
    setAvatarUrl(null)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Configurações
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie seu perfil, preferências do dashboard e segurança da conta.
          </Typography>
        </Box>

        {/* Profile Section */}
        <IOSWidget accentColor="#6366f1" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Person sx={{ color: '#6366f1' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Perfil
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Profile Photo */}
          <ProfilePhotoUpload
            currentAvatarUrl={avatarUrl}
            onUploadSuccess={handleAvatarUploadSuccess}
            onRemoveSuccess={handleAvatarRemoveSuccess}
          />

          <Divider sx={{ my: 3 }} />

          {/* Profile Info */}
          <Box sx={{ maxWidth: 400 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Informações Pessoais
            </Typography>

            <TextField
              fullWidth
              label="Nome Completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              value={user?.email || ''}
              disabled
              sx={{ mb: 2 }}
              helperText="O email não pode ser alterado"
            />

            <Button
              variant="contained"
              startIcon={updatingProfile ? null : <Save />}
              onClick={handleUpdateProfile}
              disabled={updatingProfile || fullName === user?.user_metadata?.full_name}
              sx={{
                bgcolor: '#6366f1',
                '&:hover': {
                  bgcolor: '#4f46e5',
                },
              }}
            >
              {updatingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </Box>
        </IOSWidget>

        {/* Dashboard Preferences Section */}
        <IOSWidget accentColor="#8b5cf6" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Dashboard sx={{ color: '#8b5cf6' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Preferências do Dashboard
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <DashboardPreferences />
        </IOSWidget>

        {/* Security Section */}
        <IOSWidget accentColor="#059669" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(5, 150, 105, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock sx={{ color: '#059669' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Segurança
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Change Password */}
          <Box>
            <Box
              onClick={() => setPasswordExpanded(!passwordExpanded)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                p: 2,
                mx: -2,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                },
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Alterar Senha
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Atualize sua senha para manter sua conta segura
                </Typography>
              </Box>
              <IconButton size="small">
                {passwordExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={passwordExpanded}>
              <Box sx={{ pt: 2, maxWidth: 400 }}>
                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {passwordError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  type="password"
                  label="Nova Senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  type="password"
                  label="Confirmar Nova Senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  onClick={handleUpdatePassword}
                  disabled={updatingPassword}
                  sx={{
                    bgcolor: '#059669',
                    '&:hover': {
                      bgcolor: '#047857',
                    },
                  }}
                >
                  {updatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                </Button>
              </Box>
            </Collapse>
          </Box>
        </IOSWidget>
      </Container>
    </Box>
  )
}
