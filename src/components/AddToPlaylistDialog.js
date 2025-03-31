import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  CircularProgress,
  Divider,
  Tooltip,
  Alert,
  alpha
} from '@mui/material'
import {
  Close as CloseIcon,
  QueueMusic as PlaylistIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Check as CheckIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { useApp } from '../services/AppContext'
import useCustomScrollbarStyle from '../hooks/useCustomScrollbarStyle'

const AddToPlaylistDialog = ({ open, onClose, track, tracks }) => {
  const { getPlaylists, addToPlaylist, getImageUrl } = useJellyfin()
  const { onCreatePlaylist } = useApp()
  const scrollbarStyle = useCustomScrollbarStyle()
  
  // State for playlists and UI
  const [playlists, setPlaylists] = useState([])
  const [filteredPlaylists, setFilteredPlaylists] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [addedTo, setAddedTo] = useState({})
  
  // Determine which tracks to add
  const itemsToAdd = tracks || (track ? [track] : [])
  const itemCount = itemsToAdd.length
  
  // Load playlists on open
  useEffect(() => {
    const loadPlaylists = async () => {
      if (!open) return
      
      try {
        setLoading(true)
        setError(null)
        const playlistsData = await getPlaylists()
        setPlaylists(playlistsData)
        setFilteredPlaylists(playlistsData)
      } catch (err) {
        console.error('Error loading playlists:', err)
        setError('Failed to load playlists')
      } finally {
        setLoading(false)
      }
    }
    
    loadPlaylists()
  }, [open, getPlaylists])
  
  // Filter playlists when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlaylists(playlists)
      return
    }
    
    const filtered = playlists.filter(playlist => 
      playlist.Name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredPlaylists(filtered)
  }, [searchTerm, playlists])
  
  // Handle playlist selection
  const handleAddToPlaylist = async (playlist) => {
    try {
      setAdding(true)
      setError(null)
      
      // Get all track IDs
      const trackIds = itemsToAdd.map(item => item.Id)
      
      // Add tracks to the selected playlist
      await addToPlaylist(playlist.Id, trackIds)
      
      // Mark this playlist as added to
      setAddedTo(prev => ({ ...prev, [playlist.Id]: true }))
      
      // Show success message
      const trackText = itemCount === 1 ? 'track' : 'tracks'
      setSuccessMessage(`Added ${itemCount} ${trackText} to "${playlist.Name}"`)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Error adding to playlist:', err)
      setError(`Failed to add to playlist: ${err.message}`)
    } finally {
      setAdding(false)
    }
  }
  
  // Handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }
  
  // Handle create new playlist
  const handleCreatePlaylist = () => {
    onClose()
    onCreatePlaylist()
  }
  
  // Clear state on close
  const handleClose = () => {
    setSearchTerm('')
    setSuccessMessage(null)
    setError(null)
    setAddedTo({})
    onClose()
  }
  
  if (!open) return null
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'background.paper',
          backgroundImage: 'none',
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
      PaperProps={{
        elevation: 24
      }}
      BackdropProps={{
        style: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 2
      }}>
        <Typography variant="h6" fontWeight={700}>
          Add to Playlist
        </Typography>
        <IconButton 
          edge="end" 
          onClick={handleClose} 
          aria-label="close"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {/* Search field */}
        <Box sx={{ p: 2, bgcolor: 'background.dark' }}>
          <TextField
            fullWidth
            placeholder="Find a playlist"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              sx: {
                bgcolor: alpha('#fff', 0.05),
                '&:hover': {
                  bgcolor: alpha('#fff', 0.1)
                }
              }
            }}
            size="small"
          />
        </Box>
        
        {/* Error and success messages */}
        {error && (
          <Alert severity="error" sx={{ mx: 2, my: 1 }}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mx: 2, my: 1 }}>
            {successMessage}
          </Alert>
        )}
        
        {/* Create new playlist option */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreatePlaylist}
            fullWidth
            sx={{
              justifyContent: 'flex-start',
              py: 1.5,
              borderColor: 'divider',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha('#1DB954', 0.1)
              }
            }}
          >
            Create New Playlist
          </Button>
        </Box>
        
        <Divider />
        
        {/* Playlist list - add custom scrollbar */}
        <Box sx={{ 
          maxHeight: 400, 
          ...scrollbarStyle 
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : filteredPlaylists.length > 0 ? (
            <List sx={{ py: 0 }}>
              {filteredPlaylists.map(playlist => (
                <ListItem
                  key={playlist.Id}
                  button
                  onClick={() => handleAddToPlaylist(playlist)}
                  disabled={adding || addedTo[playlist.Id]}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    },
                    '&.Mui-disabled': {
                      opacity: 0.7
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={getImageUrl(playlist.Id)}
                      alt={playlist.Name}
                      variant="rounded"
                      sx={{ 
                        width: 50, 
                        height: 50,
                        bgcolor: 'background.dark',
                        boxShadow: 1
                      }}
                    >
                      <PlaylistIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={playlist.Name}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      noWrap: true
                    }}
                  />
                  {addedTo[playlist.Id] && (
                    <Tooltip title="Added to this playlist">
                      <CheckIcon color="success" sx={{ ml: 1 }} />
                    </Tooltip>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchTerm 
                  ? 'No playlists match your search' 
                  : 'You have no playlists yet'}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {itemCount} {itemCount === 1 ? 'track' : 'tracks'} selected
        </Typography>
        <Button onClick={handleClose} sx={{ fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddToPlaylistDialog 