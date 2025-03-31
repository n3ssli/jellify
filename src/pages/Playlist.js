import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Avatar,
  Skeleton,
  CircularProgress,
  Alert,
  alpha,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Shuffle as ShuffleIcon,
  Add as AddIcon,
  MoreHoriz as MoreIcon,
  Search as SearchIcon,
  List as ListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  PhotoCamera as PhotoCameraIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Close as CloseIcon,
  QueueMusic as PlaylistIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import { useApp } from '../services/AppContext'
import TrackList from '../components/TrackList'
import SearchMusicDialog from '../components/SearchMusicDialog'
import EditPlaylistDialog from '../components/EditPlaylistDialog'
import { formatTime, formatDuration } from '../utils/formatTime'
import { extractColors } from '../utils/colorExtractor'

// Helper function to generate random color
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 35%)`;
};

const Playlist = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    getPlaylists, 
    getPlaylistItems, 
    getImageUrl, 
    removeFromPlaylist,
    connectionStatus, 
    isInitialized,
    deletePlaylist
  } = useJellyfin()
  const { currentTrack, isPlaying, playTrack, pause, toggleShuffle } = usePlayer()
  const { onAddToPlaylist, setSidebarBackground } = useApp()
  
  const [playlist, setPlaylist] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [dominantColor, setDominantColor] = useState(getRandomColor())
  const [searchMusicOpen, setSearchMusicOpen] = useState(false)
  
  // Edit playlist states
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  
  // Reference to the TrackList component to control search visibility
  const trackListRef = useRef(null)
  
  // Fetch playlist and tracks
  useEffect(() => {
    const fetchData = async () => {
      if (!isInitialized || connectionStatus !== 'connected') {
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // Get all playlists to find the current one
        const playlists = await getPlaylists()
        const currentPlaylist = playlists.find(p => p.Id === id)
        setPlaylist(currentPlaylist)
        
        if (currentPlaylist) {
          // Get playlist tracks
          const tracksData = await getPlaylistItems(id)
          setTracks(tracksData)
        }
      } catch (error) {
        console.error('Error fetching playlist:', error)
        setError('Failed to load playlist. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
      fetchData()
    }
  }, [id, getPlaylists, getPlaylistItems, connectionStatus, isInitialized])
  
  // Extract dominant color from playlist cover with improved error handling
  useEffect(() => {
    if (!playlist || loading) return;
    
    // Generate a default color first - will be used if image fails to load
    const defaultColor = getRandomColor();
    setDominantColor(defaultColor);
    
    // Only attempt to extract color if we have a playlist with an Id
    if (!playlist.Id) return;

    // Instead of using getImageUrl which might return a 404, check if the playlist has an image
    if (playlist.HasPrimaryImage) {
      const imageUrl = getImageUrl(playlist.Id);
      
      // Quietly check if the image exists before trying to extract colors
      fetch(imageUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // Only extract colors if image exists
            return extractColors(imageUrl);
          }
          throw new Error('Image not found');
        })
        .then(colors => {
          // Set color if extraction succeeds
          setDominantColor(colors.darkVibrant || colors.darkMuted || defaultColor);
        })
        .catch(error => {
          // Silently fail - keep using default color
          console.log('Using default color for playlist: ', error.message);
        });
    } else {
      // Playlist doesn't have an image according to API
      console.log('Playlist has no primary image, using default color');
    }
  }, [playlist, getImageUrl, loading]);
  
  // Add scroll event listener to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 100)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const handleRetry = () => {
    setLoading(true)
    setError(null)
    // This will trigger the useEffect to re-fetch data
  }
  
  // Check if any track from this playlist is currently playing
  const isPlaylistPlaying = currentTrack && tracks.some(track => track.Id === currentTrack.Id) && isPlaying
  
  // Calculate total duration
  const totalDuration = tracks.reduce((acc, track) => acc + (track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0), 0)
  
  // Handle play button click
  const handlePlayPlaylist = () => {
    if (isPlaylistPlaying) {
      pause()
    } else if (tracks.length > 0) {
      // Get the first track and verify it's valid
      const firstTrack = tracks[0];
      if (!firstTrack || !firstTrack.Id) {
        console.error('First track in playlist is invalid:', firstTrack);
        return;
      }
      console.log('Playing playlist:', playlist?.Name);
      playTrack(firstTrack, tracks)
    }
  }

  // Handle shuffle button click
  const handleShufflePlaylist = () => {
    if (tracks.length > 0) {
      // Enable shuffle mode first
      toggleShuffle(true);
      
      // Select a random track to start with instead of always the first one
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const randomTrack = tracks[randomIndex];
      
      // Verify the random track is valid
      if (!randomTrack || !randomTrack.Id) {
        console.error('Random track in playlist is invalid:', randomTrack);
        return;
      }
      
      console.log(`Starting shuffle from random track: ${randomTrack?.Name} (index ${randomIndex})`);
      
      // Play the random track with the full tracks array
      playTrack(randomTrack, tracks, true);
    }
  }

  // Handle add music to playlist
  const handleAddMusic = () => {
    console.log('Opening search music dialog for playlist:', playlist?.Name)
    setSearchMusicOpen(true)
  }

  // Handle when new tracks are added to the playlist
  const handleTracksAdded = async () => {
    // Refresh the playlist tracks
    try {
      console.log('Refreshing playlist tracks after adding new music')
      if (playlist) {
        const tracksData = await getPlaylistItems(id)
        setTracks(tracksData)
      }
    } catch (error) {
      console.error('Error refreshing playlist tracks:', error)
    }
  }
  
  // Handle search button click by triggering TrackList search
  const handleSearchClick = () => {
    if (trackListRef.current) {
      trackListRef.current.toggleSearch();
    }
  }
  
  // Menu handlers for playlist options
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle edit playlist
  const handleEditPlaylist = () => {
    handleMenuClose();
    setEditDialogOpen(true);
  };

  // Handle playlist update
  const handlePlaylistUpdated = async (result) => {
    // If playlist was deleted, navigate back to playlists
    if (result && result.deleted) {
      setSnackbar({
        open: true,
        message: 'Playlist deleted successfully'
      });
      // Navigate back to playlists page after a short delay
      setTimeout(() => {
        navigate('/playlists');
      }, 1500);
      return;
    }

    try {
      // Get updated playlist data
      const playlists = await getPlaylists();
      const updatedPlaylist = playlists.find(p => p.Id === id);
      
      if (updatedPlaylist) {
        setPlaylist(updatedPlaylist);
        
        // Show a custom message if one was provided
        if (result && result.message) {
          setSnackbar({
            open: true,
            message: result.message
          });
        } else {
          // Default success message
          setSnackbar({
            open: true,
            message: 'Playlist updated successfully'
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing playlist:', error);
      setSnackbar({
        open: true,
        message: 'Playlist updated but there was an error refreshing the view'
      });
    }
  };

  // Toggle selection mode
  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      // Exiting selection mode
      setSelectionMode(false);
      setSelectedTracks([]);
    } else {
      // Entering selection mode
      setSelectionMode(true);
    }
    handleMenuClose();
  };

  // Handle track selection
  const handleTrackSelection = (trackId) => {
    setSelectedTracks(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  // Delete selected tracks
  const handleConfirmDeleteTracks = async () => {
    if (selectedTracks.length === 0) return;
    
    setActionInProgress(true);
    try {
      // Remove tracks from the playlist
      await removeFromPlaylist(id, selectedTracks);
      
      // Update the playlist
      const updatedTracks = await getPlaylistItems(id);
      setTracks(updatedTracks);
      
      setSnackbar({
        open: true,
        message: `${selectedTracks.length} track${selectedTracks.length > 1 ? 's' : ''} removed from playlist`
      });
      
      // Exit selection mode
      setSelectionMode(false);
      setSelectedTracks([]);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error removing tracks from playlist:', error);
      setSnackbar({
        open: true,
        message: 'Failed to remove tracks: ' + (error.message || 'Unknown error')
      });
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle delete selected tracks
  const handleDeleteTracks = () => {
    if (selectedTracks.length > 0) {
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };
  
  // Render API connection status
  if (!isInitialized || connectionStatus !== 'connected') {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">
          {connectionStatus === 'connecting' ? 'Connecting to Jellyfin server...' : 'Waiting for Jellyfin connection...'}
        </Typography>
      </Box>
    )
  }
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ p: 0 }}>
        <Box sx={{ 
          height: 300, 
          background: 'linear-gradient(transparent 0, rgba(0,0,0,.5) 100%), linear-gradient(to right bottom, #4285f4, #34a853)',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          p: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Skeleton variant="rectangular" sx={{ 
              width: 200, 
              height: 200, 
              mr: 3, 
              borderRadius: 1,
              boxShadow: '0 4px 60px rgba(0,0,0,.5)'
            }} />
            <Box sx={{ pb: 2 }}>
              <Skeleton variant="text" width={80} sx={{ mb: 1 }} />
              <Skeleton variant="text" width={250} height={50} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={180} sx={{ mb: 2 }} />
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" width={200} height={48} sx={{ mb: 3, borderRadius: 50 }} />
          <TrackList tracks={[]} loading={true} showDateAdded={true} />
        </Box>
      </Box>
    )
  }
  
  // If error occurred
  if (error) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 500 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleRetry}
          sx={{ borderRadius: 28, textTransform: 'none' }}
        >
          Retry
        </Button>
      </Box>
    )
  }
  
  // If playlist doesn't exist
  if (!playlist) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Playlist not found</Typography>
      </Box>
    )
  }
  
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      pb: '120px'
    }}>
      {/* Playlist header */}
      <Box sx={{ 
        position: 'relative',
        background: `linear-gradient(transparent 0, rgba(0,0,0,.5) 100%), linear-gradient(to bottom, ${dominantColor} 0%, ${alpha(dominantColor, 0.6)} 100%)`,
        pt: 12,
        pb: 3,
        px: 3,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'center', sm: 'flex-end' },
        transition: 'all 0.3s ease',
        minHeight: scrolled ? 'auto' : 250
      }}>
        <Avatar
          variant="square"
          src={getImageUrl(playlist.Id, 'Primary', 300, 'playlist')}
          alt={playlist.Name}
          sx={{
            width: scrolled ? 100 : { xs: 150, sm: 200 },
            height: scrolled ? 100 : { xs: 150, sm: 200 },
            borderRadius: 1,
            mb: { xs: 2, sm: 0 },
            mr: { xs: 0, sm: 3 },
            boxShadow: '0 4px 60px rgba(0,0,0,.5)',
            bgcolor: alpha(dominantColor, 0.3),
            transition: 'all 0.3s ease',
            flexShrink: 0
          }}
        />
        
        <Box sx={{ 
          textAlign: { xs: 'center', sm: 'left' },
          width: '100%',
          color: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              mb: 1,
              fontWeight: 500,
              color: '#fff',
              display: scrolled ? 'none' : 'block'
            }}
          >
            Playlist
          </Typography>
          
          <Typography 
            variant="h3" 
            component="h1" 
            fontWeight={700} 
            sx={{ 
              mb: 1,
              fontSize: scrolled ? '1.5rem' : { xs: '2rem', sm: '3rem' },
              lineHeight: 1.2,
              transition: 'all 0.3s ease'
            }}
          >
            {playlist.Name}
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 2,
              opacity: 0.7,
              fontWeight: 500,
              display: scrolled ? 'none' : 'block'
            }}
          >
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} • {formatDuration(totalDuration)}
          </Typography>
        </Box>
      </Box>
      
      {/* Actions and tracks */}
      <Box sx={{ p: 3, pt: scrolled ? 3 : 0, bgcolor: alpha('#121212', 0.9), flexGrow: 1 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 4,
          mt: 2
        }}>
          {selectionMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteTracks}
                disabled={selectedTracks.length === 0}
                sx={{
                  borderRadius: 28,
                  textTransform: 'none',
                  bgcolor: '#1DB954',
                  '&:hover': {
                    bgcolor: '#1ed760'
                  }
                }}
              >
                Delete Selected
              </Button>
              
              <IconButton
                onClick={handleToggleSelectionMode}
                sx={{
                  color: '#fff',
                }}
              >
                <ClearIcon />
              </IconButton>
              
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {selectedTracks.length} selected
              </Typography>
            </>
          ) : (
            <>
              <IconButton
                onClick={handlePlayPlaylist}
                sx={{ 
                  bgcolor: '#1DB954',
                  color: '#000',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: '#1ed760'
                  },
                  boxShadow: '0 8px 16px rgba(0,0,0,.3)'
                }}
              >
                {isPlaylistPlaying ? <PauseIcon sx={{ fontSize: 28 }} /> : <PlayIcon sx={{ fontSize: 28 }} />}
              </IconButton>

              <IconButton
                onClick={handleShufflePlaylist}
                sx={{ 
                  color: '#b3b3b3',
                  '&:hover': { color: '#fff' }
                }}
              >
                <ShuffleIcon fontSize="large" />
              </IconButton>

              <IconButton
                onClick={handleAddMusic}
                sx={{ 
                  color: '#b3b3b3',
                  '&:hover': { color: '#fff' }
                }}
              >
                <AddIcon fontSize="large" />
              </IconButton>
            </>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {!selectionMode && (
            <>
              <IconButton
                className="tracklist-search-button"
                onClick={handleSearchClick}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: 'white'
                  }
                }}
              >
                <SearchIcon />
              </IconButton>
              
              <IconButton
                aria-label="more options"
                aria-controls="playlist-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: 'white'
                  }
                }}
              >
                <MoreIcon />
              </IconButton>
              
              <Menu
                id="playlist-menu"
                anchorEl={menuAnchorEl}
                keepMounted
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleEditPlaylist}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Edit Details</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleToggleSelectionMode}>
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Delete Tracks</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
        
        <TrackList 
          ref={trackListRef}
          tracks={tracks} 
          showAlbum={true}
          showNumber={true}
          selectionMode={selectionMode}
          selectedTracks={selectedTracks}
          onTrackSelect={handleTrackSelection}
        />
      </Box>

      {/* Search Music Dialog */}
      <SearchMusicDialog
        open={searchMusicOpen}
        onClose={() => setSearchMusicOpen(false)}
        playlistId={id}
        playlistName={playlist?.Name || 'Playlist'}
        onAddTracks={handleTracksAdded}
      />
      
      {/* Edit Playlist Dialog */}
      <EditPlaylistDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        playlist={playlist}
        onPlaylistUpdated={handlePlaylistUpdated}
      />
      
      {/* Confirm Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !actionInProgress && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete from Playlist</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {selectedTracks.length} {selectedTracks.length === 1 ? 'track' : 'tracks'} from this playlist?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={actionInProgress}
            sx={{ borderRadius: 28, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteTracks} 
            color="primary" 
            variant="contained"
            disabled={actionInProgress}
            sx={{ 
              borderRadius: 28, 
              textTransform: 'none',
              bgcolor: '#1DB954',
              '&:hover': {
                bgcolor: '#1ed760'
              }
            }}
            startIcon={actionInProgress ? <CircularProgress size={20} /> : null}
          >
            {actionInProgress ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        ContentProps={{
          sx: {
            backgroundColor: '#1DB954',
            color: '#fff'
          }
        }}
      />
    </Box>
  )
}

export default Playlist 