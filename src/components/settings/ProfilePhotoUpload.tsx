import { useState, useRef, ChangeEvent } from 'react'
import {
  Box,
  Avatar,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import { PhotoCamera, Delete, Person } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface ProfilePhotoUploadProps {
  currentAvatarUrl?: string | null
  onUploadSuccess?: (url: string) => void
  onRemoveSuccess?: () => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ProfilePhotoUpload({
  currentAvatarUrl,
  onUploadSuccess,
  onRemoveSuccess,
}: ProfilePhotoUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayUrl = previewUrl || currentAvatarUrl

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPEG, PNG, WebP ou GIF.')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo de 2MB.')
      return
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      setUploading(true)

      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${user.id}/avatar.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}` // Add timestamp to bust cache

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Foto de perfil atualizada!')
      onUploadSuccess?.(publicUrl)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Erro ao enviar foto. Tente novamente.')
      // Revert preview on error
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = async () => {
    if (!user?.id || !currentAvatarUrl) return

    try {
      setRemoving(true)

      // Extract file path from URL
      const urlParts = currentAvatarUrl.split('/avatars/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0] // Remove query params

        // Delete from storage
        await supabase.storage.from('avatars').remove([filePath])
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setPreviewUrl(null)
      toast.success('Foto removida!')
      onRemoveSuccess?.()
    } catch (error) {
      console.error('Error removing avatar:', error)
      toast.error('Erro ao remover foto. Tente novamente.')
    } finally {
      setRemoving(false)
    }
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  // Get user initials for fallback
  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || ''
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {/* Avatar */}
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={displayUrl || undefined}
          sx={{
            width: 100,
            height: 100,
            fontSize: '2rem',
            fontWeight: 700,
            bgcolor: '#6366f1',
            border: '4px solid',
            borderColor: 'rgba(99, 102, 241, 0.2)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)',
          }}
        >
          {!displayUrl && (getInitials() || <Person sx={{ fontSize: 48 }} />)}
        </Avatar>

        {/* Upload overlay on hover */}
        <Box
          onClick={handleClickUpload}
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          {uploading ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            <PhotoCamera sx={{ color: 'white', fontSize: 28 }} />
          )}
        </Box>
      </Box>

      {/* Info and actions */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Foto de Perfil
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clique na foto ou use os botões abaixo para alterar.
          <br />
          Formatos: JPEG, PNG, WebP, GIF. Máximo: 2MB.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />}
            onClick={handleClickUpload}
            disabled={uploading || removing}
            sx={{
              bgcolor: '#6366f1',
              '&:hover': {
                bgcolor: '#4f46e5',
              },
            }}
          >
            {uploading ? 'Enviando...' : 'Alterar Foto'}
          </Button>

          {displayUrl && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={removing ? <CircularProgress size={16} color="inherit" /> : <Delete />}
              onClick={handleRemovePhoto}
              disabled={uploading || removing}
            >
              {removing ? 'Removendo...' : 'Remover'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </Box>
  )
}
