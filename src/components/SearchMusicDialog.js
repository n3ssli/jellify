import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  Checkbox,
  alpha,
  Tooltip
} from '@mui/material'
import {
  Close as CloseIcon,
  Search as SearchIcon,
  MusicNote as TrackIcon,
  Album as AlbumIcon,
  Person as ArtistIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { formatDuration } from '../utils/formatTime'
import useCustomScrollbarStyle from '../hooks/useCustomScrollbarStyle'

const SearchMusicDialog = ({ open, onClose, playlistId, playlistName, onAddTracks }) => {
  // Access Jellyfin context
  const { search, addToPlaylist, getImageUrl, getAlbumItems } = useJellyfin()
  const scrollbarStyle = useCustomScrollbarStyle()
  
  // Component state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({
    albums: [],
    artists: [],
    tracks: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTracks, setSelectedTracks] = useState([])
  const [activeTab, setActiveTab] = useState(0) // 0 = tracks, 1 = albums, 2 = artists
  const [adding, setAdding] = useState(false)
  const [success, setSuccess] = useState(null)
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }
  
  // Clear state on dialog close
  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setSearchQuery('')
      setSearchResults({ albums: [], artists: [], tracks: [] })
      setSelectedTracks([])
      setActiveTab(0)
      setError(null)
      setSuccess(null)
    }, 300)
  }
  
  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ albums: [], artists: [], tracks: [] })
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        const results = await search(searchQuery)
        setSearchResults(results)
      } catch (err) {
        console.error('Error searching:', err)
        setError('An error occurred while searching. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    // Debounce search to avoid too many API calls
    const timer = setTimeout(performSearch, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, search])
  
  // Toggle track selection
  const handleTrackToggle = (track) => {
    setSelectedTracks(prev => {
      const trackExists = prev.find(t => t.Id === track.Id)
      if (trackExists) {
        return prev.filter(t => t.Id !== track.Id)
      } else {
        return [...prev, track]
      }
    })
  }
  
  // Select all tracks from an album
  const handleAddAlbumTracks = async (albumId) => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all tracks from the album
      const albumTracks = await getAlbumItems(albumId)
      
      if (!albumTracks || albumTracks.length === 0) {
        setError('No tracks found in this album')
        setLoading(false)
        return
      }
      
      // Add all album tracks to selection
      setSelectedTracks(prev => {
        // Merge previous tracks with new album tracks, avoiding duplicates
        const existing = new Set(prev.map(t => t.Id))
        const newTracks = albumTracks.filter(t => !existing.has(t.Id))
        return [...prev, ...newTracks]
      })
      
      // Show success toast
      setSuccess(`Added ${albumTracks.length} tracks from album to selection`)
      
      // Clear success after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
      
      setLoading(false)
    } catch (err) {
      console.error('Error adding album tracks:', err)
      setError('Failed to load album tracks')
      setLoading(false)
    }
  }
  
  // Add selected tracks to playlist
  const handleAddToPlaylist = async () => {
    if (selectedTracks.length === 0) return
    
    try {
      setAdding(true)
      setError(null)
      
      // Get all track IDs
      const trackIds = selectedTracks.map(track => track.Id)
      
      // Add to playlist using Jellyfin API
      await addToPlaylist(playlistId, trackIds)
      
      // Show success message
      setSuccess(`Added ${trackIds.length} tracks to "${playlistName}"`)
      
      // Clear selection
      setSelectedTracks([])
      
      // Notify parent component of change
      if (onAddTracks) {
        onAddTracks(trackIds)
      }
      
      // Clear success after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      console.error('Error adding tracks to playlist:', err)
      setError(`Failed to add tracks to playlist: ${err.message}`)
    } finally {
      setAdding(false)
    }
  }
  
  // Render tracks tab content
  const TracksTabContent = () => (
    <List sx={{ width: '100%', p: 0 }}>
      {searchResults.tracks.length > 0 ? (
        searchResults.tracks.map(track => (
          <ListItem
            key={track.Id}
            divider
            sx={{
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                alt={track.Name}
                src={track.AlbumId ? getImageUrl(track.AlbumId) : undefined}
                sx={{ width: 50, height: 50 }}
              >
                <TrackIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={track.Name}
              secondary={
                <>
                  {track.ArtistItems && track.ArtistItems.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {track.ArtistItems[0].Name}
                    </Typography>
                  )}
                  {track.Album && (
                    <Typography variant="body2" color="text.secondary">
                      {track.Album} • {formatDuration(track.RunTimeTicks / 10000000)}
                    </Typography>
                  )}
                </>
              }
            />
            <ListItemSecondaryAction>
              <Checkbox
                edge="end"
                checked={selectedTracks.some(t => t.Id === track.Id)}
                onChange={() => handleTrackToggle(track)}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))
      ) : !loading && searchQuery ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <TrackIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1">No tracks found matching "{searchQuery}"</Typography>
        </Box>
      ) : null}
    </List>
  )
  
  // Render albums tab content
  const AlbumsTabContent = () => (
    <List sx={{ width: '100%', p: 0 }}>
      {searchResults.albums.length > 0 ? (
        searchResults.albums.map(album => (
          <ListItem
            key={album.Id}
            divider
            sx={{
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                alt={album.Name}
                src={getImageUrl(album.Id)}
                sx={{ width: 50, height: 50 }}
              >
                <AlbumIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={album.Name}
              secondary={
                <>
                  {album.AlbumArtist && (
                    <Typography variant="body2" color="text.secondary">
                      {album.AlbumArtist}
                    </Typography>
                  )}
                  {album.ProductionYear && (
                    <Typography variant="body2" color="text.secondary">
                      {album.ProductionYear}
                    </Typography>
                  )}
                </>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title="Add all tracks from this album">
                <IconButton
                  edge="end"
                  onClick={() => handleAddAlbumTracks(album.Id)}
                  disabled={adding}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))
      ) : !loading && searchQuery ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <AlbumIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1">No albums found matching "{searchQuery}"</Typography>
        </Box>
      ) : null}
    </List>
  )
  
  // Render artists tab content
  const ArtistsTabContent = () => (
    <List sx={{ width: '100%', p: 0 }}>
      {searchResults.artists.length > 0 ? (
        searchResults.artists.map(artist => (
          <ListItem
            key={artist.Id}
            divider
            sx={{
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                alt={artist.Name}
                src={getImageUrl(artist.Id)}
                sx={{ width: 50, height: 50 }}
              >
                <ArtistIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={artist.Name}
            />
            <ListItemSecondaryAction>
              {/* This would require a function to get all artist's tracks
              <Tooltip title="Add all popular tracks from this artist">
                <IconButton
                  edge="end"
                  onClick={() => handleAddArtistTracks(artist.Id)}
                  disabled={adding}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              */}
            </ListItemSecondaryAction>
          </ListItem>
        ))
      ) : !loading && searchQuery ? (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <ArtistIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1">No artists found matching "{searchQuery}"</Typography>
        </Box>
      ) : null}
    </List>
  )
  
  // Main render
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
          Add Music to {playlistName}
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
        {/* Search input */}
        <Box sx={{ p: 2, bgcolor: 'background.dark' }}>
          <TextField
            fullWidth
            placeholder="Search for songs, albums or artists"
            variant="outlined"
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
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
        
        {success && (
          <Alert severity="success" sx={{ mx: 2, my: 1 }}>
            {success}
          </Alert>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={40} />
          </Box>
        )}
        
        {/* Tabs for different result types */}
        {!loading && searchQuery && (
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600
                }
              }}
            >
              <Tab 
                icon={<TrackIcon />} 
                label={`Tracks (${searchResults.tracks.length})`} 
                iconPosition="start"
              />
              <Tab 
                icon={<AlbumIcon />} 
                label={`Albums (${searchResults.albums.length})`} 
                iconPosition="start"
              />
              <Tab 
                icon={<ArtistIcon />} 
                label={`Artists (${searchResults.artists.length})`} 
                iconPosition="start"
              />
            </Tabs>
            
            <Box sx={{ 
              maxHeight: 500, 
              ...scrollbarStyle 
            }}>
              {activeTab === 0 && <TracksTabContent />}
              {activeTab === 1 && <AlbumsTabContent />}
              {activeTab === 2 && <ArtistsTabContent />}
            </Box>
          </Box>
        )}
        
        {/* No search query message */}
        {!loading && !searchQuery && (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <SearchIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
            <Typography variant="body1">
              Search for songs, albums, or artists to add to your playlist
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ 
        px: 3, 
        py: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        justifyContent: 'space-between'
      }}>
        <Typography variant="body2" color="text.secondary">
          {selectedTracks.length} {selectedTracks.length === 1 ? 'track' : 'tracks'} selected
        </Typography>
        <Box>
          <Button onClick={handleClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddToPlaylist} 
            variant="contained" 
            color="primary"
            disabled={selectedTracks.length === 0 || adding}
            startIcon={adding ? <CircularProgress size={20} /> : null}
          >
            {adding ? 'Adding...' : 'Add to Playlist'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

export default SearchMusicDialog 