import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Tooltip
} from '@mui/material'
import {
  PlaylistAdd as PlaylistAddIcon,
  PhotoCamera as PhotoCameraIcon,
  Clear as ClearIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'

const CreatePlaylist = () => {
  const navigate = useNavigate()
  const { createPlaylist, connectionStatus, isInitialized } = useJellyfin()
  
  // Form state
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [coverImage, setCoverImage] = useState(null)
  const [coverImagePreview, setCoverImagePreview] = useState(null)
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Handle cover image selection
  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image is too large. Please select an image under 5MB.')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.')
        return
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      setCoverImage(file)
      setError(null)
    }
  }
  
  // Clear selected image
  const handleClearImage = () => {
    setCoverImage(null)
    setCoverImagePreview(null)
  }
  
  // Form validation
  const isFormValid = () => {
    return playlistName.trim().length > 0
  }
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      setError('Please enter a playlist name.')
      return
    }
    
    if (!isInitialized || connectionStatus !== 'connected') {
      setError('Cannot create playlist: Server connection unavailable')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Create the playlist
      const playlistId = await createPlaylist({
        name: playlistName,
        description: playlistDescription,
        coverImage: coverImage
      })
      
      // Navigate to the newly created playlist
      navigate(`/playlist/${playlistId}`)
    } catch (err) {
      console.error('Error creating playlist:', err)
      setError('Failed to create playlist. Please try again.')
      setLoading(false)
    }
  }
  
  return (
    <Box sx={{ p: 3, pb: '120px' }}>
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Create Playlist
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Cover image preview */}
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    width: '100%',
                    paddingTop: '100%', // 1:1 aspect ratio
                    position: 'relative',
                    bgcolor: 'background.dark',
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  {coverImagePreview ? (
                    <>
                      <Box
                        component="img"
                        src={coverImagePreview}
                        alt="Playlist cover"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <Tooltip title="Remove image">
                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.7)'
                            }
                          }}
                          onClick={handleClearImage}
                          size="small"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <PlaylistAddIcon
                        sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.7 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, px: 2, textAlign: 'center' }}
                      >
                        Optional cover image
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  sx={{ mt: 2, width: '100%' }}
                >
                  {coverImage ? 'Change' : 'Add Cover'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </Button>
              </Grid>
              
              {/* Form fields */}
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Playlist Name"
                  variant="outlined"
                  fullWidth
                  required
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  margin="normal"
                  autoFocus
                />
                
                <TextField
                  label="Description (Optional)"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  value={playlistDescription}
                  onChange={(e) => setPlaylistDescription(e.target.value)}
                  margin="normal"
                />
              </Grid>
              
              {/* Submit button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    type="button"
                    onClick={() => navigate(-1)}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || !isFormValid()}
                    startIcon={loading ? <CircularProgress size={20} /> : <PlaylistAddIcon />}
                  >
                    {loading ? 'Creating...' : 'Create Playlist'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Box>
  )
}

export default CreatePlaylist 