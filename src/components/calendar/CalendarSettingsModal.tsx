import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material'
import {
  Close,
  Add,
  Refresh,
  Delete,
  Google,
  CalendarMonth,
  CloudSync,
  ContentCopy,
  Link as LinkIcon,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCalendarSubscriptions,
  useUpdateCalendarSubscription,
  useDeleteCalendarSubscription,
  useRefreshCalendarSubscription,
  useCalendarFeedTokens,
  useCreateCalendarFeedToken,
  useDeleteCalendarFeedToken,
  getCalendarFeedUrl,
} from '@/hooks/useCalendarSubscriptions'
import { CalendarSubscription } from '@/types/calendar'
import AddCalendarModal from './AddCalendarModal'
import toast from 'react-hot-toast'

interface TabPanelProps {
  children?: React.ReactNode
  value: number
  index: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

interface CalendarSettingsModalProps {
  open: boolean
  onClose: () => void
}

export default function CalendarSettingsModal({
  open,
  onClose,
}: CalendarSettingsModalProps) {
  const { user } = useAuth()
  const [tabValue, setTabValue] = useState(0)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const { data: subscriptions = [], isLoading } = useCalendarSubscriptions(user?.id)
  const updateSubscription = useUpdateCalendarSubscription()
  const deleteSubscription = useDeleteCalendarSubscription()
  const refreshSubscription = useRefreshCalendarSubscription()

  // Calendar feed tokens
  const { data: feedTokens = [], isLoading: isLoadingTokens } = useCalendarFeedTokens(user?.id)
  const createFeedToken = useCreateCalendarFeedToken()
  const deleteFeedToken = useDeleteCalendarFeedToken()

  const handleCreateFeedToken = () => {
    if (user?.id) {
      createFeedToken.mutate({ userId: user.id })
    }
  }

  const handleDeleteFeedToken = (tokenId: string) => {
    if (confirm('Deseja remover este link? Quem estiver usando precisará de um novo link.')) {
      deleteFeedToken.mutate({ id: tokenId, userId: user?.id || '' })
    }
  }

  const handleCopyFeedUrl = (token: string) => {
    const url = getCalendarFeedUrl(token)
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const handleToggleEnabled = (subscription: CalendarSubscription) => {
    updateSubscription.mutate({
      id: subscription.id,
      userId: user?.id || '',
      updates: { is_enabled: !subscription.is_enabled },
    })
  }

  const handleDelete = (subscription: CalendarSubscription) => {
    if (confirm(`Deseja remover o calendário "${subscription.name}"?`)) {
      deleteSubscription.mutate({
        id: subscription.id,
        userId: user?.id || '',
      })
    }
  }

  const handleRefresh = (subscription: CalendarSubscription) => {
    refreshSubscription.mutate({ subscription })
  }

  const getCalendarTypeIcon = (type: string) => {
    switch (type) {
      case 'google':
        return <Google sx={{ fontSize: 16 }} />
      case 'outlook':
        return <CalendarMonth sx={{ fontSize: 16 }} />
      default:
        return <CalendarMonth sx={{ fontSize: 16 }} />
    }
  }

  const formatLastSynced = (date: string | null) => {
    if (!date) return 'Nunca'
    const d = new Date(date)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
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
            <CloudSync sx={{ color: '#6366f1' }} />
            <Typography variant="h6" fontWeight={700}>
              Configurações do Calendário
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              borderBottom: '1px solid rgba(0,0,0,0.1)',
              px: 2,
            }}
          >
            <Tab label="Importar" />
            <Tab label="Compartilhar" />
          </Tabs>

          <Box sx={{ p: 2 }}>
            <TabPanel value={tabValue} index={0}>
              {/* Import Tab */}
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddModalOpen(true)}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  }}
                >
                  Adicionar Calendário
                </Button>
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : subscriptions.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Nenhum calendário externo configurado. Adicione um calendário do Google ou Outlook para
                  visualizar seus eventos aqui.
                </Alert>
              ) : (
                <List sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                  {subscriptions.map((sub) => (
                    <ListItem
                      key={sub.id}
                      sx={{
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: sub.color,
                          mr: 2,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight={600}>{sub.name}</Typography>
                            <Chip
                              size="small"
                              icon={getCalendarTypeIcon(sub.calendar_type)}
                              label={sub.calendar_type === 'google' ? 'Google' : sub.calendar_type === 'outlook' ? 'Outlook' : 'Outro'}
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                '& .MuiChip-icon': { fontSize: 12 },
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Última sincronização: {formatLastSynced(sub.last_synced_at)}
                            </Typography>
                            {sub.last_sync_error && (
                              <Typography variant="caption" color="error" display="block">
                                Erro: {sub.last_sync_error}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title="Sincronizar">
                            <IconButton
                              size="small"
                              onClick={() => handleRefresh(sub)}
                              disabled={refreshSubscription.isPending}
                            >
                              <Refresh
                                sx={{
                                  fontSize: 18,
                                  animation: refreshSubscription.isPending ? 'spin 1s linear infinite' : 'none',
                                  '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                  },
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(sub)}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Switch
                            size="small"
                            checked={sub.is_enabled}
                            onChange={() => handleToggleEnabled(sub)}
                          />
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Help text */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Como obter o link ICS:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Google Calendar:</strong> Configurações {'>'} Selecione o calendário {'>'} "Tornar
                  disponível publicamente" {'>'} Copie o link "Endereço público no formato iCal"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Outlook:</strong> Configurações {'>'} Calendário {'>'} Calendários compartilhados{' '}
                  {'>'} Publicar calendário {'>'} Copie o link ICS
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Share Tab - Live ICS Feed */}
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <LinkIcon sx={{ color: 'white', fontSize: 36 }} />
                </Box>

                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Link de Assinatura
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  Gere um link para seu calendário que se atualiza automaticamente. O Outlook e Google Calendar
                  buscarão novos eventos periodicamente.
                </Typography>

                {isLoadingTokens ? (
                  <CircularProgress size={32} />
                ) : feedTokens.length === 0 ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={handleCreateFeedToken}
                    disabled={createFeedToken.isPending}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                    }}
                  >
                    {createFeedToken.isPending ? 'Gerando...' : 'Gerar Link do Calendário'}
                  </Button>
                ) : (
                  <Box sx={{ textAlign: 'left' }}>
                    {feedTokens.map((token) => (
                      <Box
                        key={token.id}
                        sx={{
                          p: 2,
                          bgcolor: 'rgba(16, 185, 129, 0.05)',
                          borderRadius: 2,
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          mb: 2,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          {token.name}
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          value={getCalendarFeedUrl(token.token)}
                          InputProps={{
                            readOnly: true,
                            sx: { fontSize: '0.75rem', fontFamily: 'monospace' },
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title="Copiar link">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyFeedUrl(token.token)}
                                  >
                                    <ContentCopy sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ),
                          }}
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Criado em: {new Date(token.created_at).toLocaleDateString('pt-BR')}
                          </Typography>
                          <Tooltip title="Remover link">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteFeedToken(token.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Help text */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Como usar:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Outlook:</strong> Arquivo {'>'} Configurações de Conta {'>'} Calendários da Internet{' '}
                    {'>'} Novo {'>'} Cole o link
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Google Calendar:</strong> Outros calendários {'+'} {'>'} De URL {'>'} Cole o link
                  </Typography>
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    O calendário externo buscará atualizações automaticamente (pode levar até 24h no Google Calendar
                    e algumas horas no Outlook).
                  </Alert>
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </DialogContent>
      </Dialog>

      <AddCalendarModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
    </>
  )
}
