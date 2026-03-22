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
  Switch,
  styled,
} from '@mui/material'
import {
  Person,
  Dashboard,
  Lock,
  ExpandMore,
  ExpandLess,
  Save,
  Palette,
  LightMode,
  DarkMode,
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'
import { ProfilePhotoUpload, DashboardPreferences } from '@/components/settings'
import { IOSWidget } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Custom styled iOS-like switch for dark mode toggle
const IOSSwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(28px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#6366f1',
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
      '& .MuiSwitch-thumb': {
        backgroundColor: '#fff',
        '&::before': {
          content: '"\\2600"', // Sun emoji
          position: 'absolute',
          width: '100%',
          height: '100%',
          left: 0,
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          opacity: 0,
        },
        '&::after': {
          content: '"\\263D"', // Moon emoji
          position: 'absolute',
          width: '100%',
          height: '100%',
          left: 0,
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#6366f1',
        },
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#6366f1',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.mode === 'light'
        ? theme.palette.grey[100]
        : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 30,
    height: 30,
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    '&::before': {
      content: '"\\2600"', // Sun
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: '#f59e0b',
    },
    '&::after': {
      content: '""',
    },
  },
  '& .MuiSwitch-track': {
    borderRadius: 34 / 2,
    backgroundColor: theme.palette.mode === 'light' ? '#e2e8f0' : '#334155',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      width: 16,
      height: 16,
    },
  },
}))

export default function Settings() {
  const { user } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
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

        {/* Appearance Section */}
        <IOSWidget accentColor="#f59e0b" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Palette sx={{ color: '#f59e0b' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Aparência
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Dark Mode Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              mx: -2,
              borderRadius: 3,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: (theme) =>
                `1px solid ${
                  theme.palette.mode === 'dark'
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'rgba(99, 102, 241, 0.1)'
                }`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #312e81 0%, #4c1d95 100%)'
                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  boxShadow: isDarkMode
                    ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                    : '0 4px 12px rgba(245, 158, 11, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              >
                {isDarkMode ? (
                  <DarkMode sx={{ color: '#a5b4fc', fontSize: 26 }} />
                ) : (
                  <LightMode sx={{ color: '#f59e0b', fontSize: 26 }} />
                )}
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Modo Escuro
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isDarkMode
                    ? 'Tema escuro ativado - descanse seus olhos'
                    : 'Tema claro ativado - visual brilhante'}
                </Typography>
              </Box>
            </Box>
            <IOSSwitch
              checked={isDarkMode}
              onChange={toggleTheme}
              inputProps={{ 'aria-label': 'toggle dark mode' }}
            />
          </Box>

          {/* Theme Preview */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Visualização do tema
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              {/* Light Theme Preview */}
              <Box
                onClick={() => isDarkMode && toggleTheme()}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  border: !isDarkMode ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
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
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: '#1e293b', fontWeight: 600 }}
                  >
                    Tema Claro
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#f1f5f9',
                    }}
                  />
                  <Box
                    sx={{
                      width: 20,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#6366f1',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#e2e8f0',
                    }}
                  />
                  <Box
                    sx={{
                      flex: 0.5,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#e2e8f0',
                    }}
                  />
                </Box>
                {!isDarkMode && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#6366f1',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Ativo
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Dark Theme Preview */}
              <Box
                onClick={() => !isDarkMode && toggleTheme()}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: '#1e293b',
                  border: isDarkMode ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
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
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{ color: '#f1f5f9', fontWeight: 600 }}
                  >
                    Tema Escuro
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#334155',
                    }}
                  />
                  <Box
                    sx={{
                      width: 20,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#818cf8',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#475569',
                    }}
                  />
                  <Box
                    sx={{
                      flex: 0.5,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: '#475569',
                    }}
                  />
                </Box>
                {isDarkMode && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#818cf8',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Ativo
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </IOSWidget>

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
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(0, 0, 0, 0.02)',
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
