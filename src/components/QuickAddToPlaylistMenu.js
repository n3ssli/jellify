import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  CircularProgress,
  Divider,
  Box,
  InputBase,
  alpha,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Fade,
  Grow,
  Snackbar,
  Alert,
  Avatar
} from '@mui/material';
import {
  QueueMusic as PlaylistIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';
import { useJellyfin } from '../services/JellyfinContext';
import useCustomScrollbarStyle from '../hooks/useCustomScrollbarStyle';

const QuickAddToPlaylistMenu = ({ 
  open, 
  onClose, 
  track,
  tracks
}) => {
  const { getPlaylists, addToPlaylist, getImageUrl } = useJellyfin();
  const scrollbarStyle = useCustomScrollbarStyle();
  
  const [playlists, setPlaylists] = useState([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addedPlaylist, setAddedPlaylist] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const itemsToAdd = tracks && tracks.length > 0 ? tracks : (track ? [track] : []);
  
  useEffect(() => {
    if (open) {
      console.log('Track data:', { track, tracks });
      console.log('Items to add:', itemsToAdd);
      
      if (itemsToAdd.length === 0) {
        console.warn('No valid tracks provided to add to playlist');
      } else {
        console.log(`${itemsToAdd.length} valid track(s) ready to add`);
      }
    }
  }, [open, track, tracks, itemsToAdd]);
  
  useEffect(() => {
    const loadPlaylists = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        const playlistsData = await getPlaylists();
        setPlaylists(playlistsData);
        setFilteredPlaylists(playlistsData);
      } catch (err) {
        console.error('Error loading playlists:', err);
        setError('Could not load playlists');
      } finally {
        setLoading(false);
      }
    };
    
    loadPlaylists();
  }, [open, getPlaylists]);
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlaylists(playlists);
      return;
    }
    
    const filtered = playlists.filter(playlist => 
      playlist.Name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPlaylists(filtered);
  }, [searchTerm, playlists]);
  
  const handleAddToPlaylist = async (playlist) => {
    try {
      setError(null);
      setSuccess(null);
      setIsAdding(true);
      
      if (!itemsToAdd || itemsToAdd.length === 0) {
        throw new Error('No tracks selected to add to playlist');
      }
      
      const trackIds = itemsToAdd.filter(item => item && item.Id).map(item => item.Id);
      
      if (trackIds.length === 0) {
        throw new Error('No valid track IDs found');
      }
      
      console.log(`Adding ${trackIds.length} tracks to playlist: ${playlist.Name} (${playlist.Id})`);
      console.log('Track IDs being added:', trackIds);
      
      await addToPlaylist(playlist.Id, trackIds);
      
      console.log(`Successfully added ${trackIds.length} tracks to playlist: ${playlist.Name}`);
      
      setAddedPlaylist(playlist.Id);
      setSuccess(`Added to ${playlist.Name}`);
      
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setAddedPlaylist(null);
          setSearchTerm('');
          setIsAdding(false);
        }, 100);
      }, 1000);
      
    } catch (err) {
      console.error(`Error adding tracks to playlist ${playlist.Name}:`, err);
      setError(`Failed to add to playlist: ${err.message || 'Unknown error'}`);
      setIsAdding(false);
    }
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleErrorClose = () => {
    setError(null);
  };
  
  const handleSuccessClose = () => {
    setSuccess(null);
  };
  
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth
        TransitionComponent={Grow}
        transitionDuration={300}
        PaperProps={{
          elevation: 24,
          sx: {
            backgroundColor: '#282828',
            backgroundImage: 'none',
            borderRadius: 1,
            overflow: 'hidden',
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 16px 24px rgba(0,0,0,0.3), 0 6px 8px rgba(0,0,0,0.2)'
          }
        }}
        BackdropProps={{
          sx: { 
            backgroundColor: 'rgba(0,0,0,0.7)',
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: alpha('#fff', 0.1)
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
            Add to playlist
          </Typography>
          <IconButton 
            edge="end" 
            onClick={onClose}
            aria-label="close"
            sx={{ 
              color: alpha('#fff', 0.7),
              '&:hover': { color: '#fff' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: alpha('#fff', 0.1),
              borderRadius: 1,
              px: 2,
              py: 1
            }}>
              <SearchIcon fontSize="small" sx={{ mr: 1, color: alpha('#fff', 0.7) }} />
              <InputBase
                placeholder="Find a playlist"
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ 
                  fontSize: '0.95rem',
                  width: '100%',
                  color: '#fff'
                }}
                autoFocus
              />
            </Box>
          </Box>
          
          <List 
            sx={{ 
              p: 0, 
              maxHeight: 450, 
              overflowY: 'auto',
              ...scrollbarStyle
            }}
          >
            {loading ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress size={40} sx={{ color: '#1DB954' }} />
              </Box>
            ) : filteredPlaylists.length === 0 ? (
              <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', height: 200, justifyContent: 'center' }}>
                <ErrorIcon sx={{ fontSize: 48, color: alpha('#fff', 0.5), mb: 2 }} />
                <Typography 
                  variant="body1"
                  sx={{ 
                    color: alpha('#fff', 0.7),
                    textAlign: 'center',
                  }} 
                >
                  {searchTerm ? 'No matching playlists found' : 'No playlists available'}
                </Typography>
              </Box>
            ) : (
              filteredPlaylists.map((playlist) => (
                <ListItem 
                  key={playlist.Id} 
                  onClick={() => !isAdding && handleAddToPlaylist(playlist)}
                  button
                  selected={addedPlaylist === playlist.Id}
                  disabled={isAdding && addedPlaylist !== playlist.Id}
                  sx={{
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha('#fff', 0.1)
                    },
                    '&.Mui-selected': {
                      bgcolor: alpha('#1DB954', 0.15),
                      '&:hover': {
                        bgcolor: alpha('#1DB954', 0.2)
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 44,
                    color: addedPlaylist === playlist.Id ? '#1DB954' : alpha('#fff', 0.7)
                  }}>
                    {addedPlaylist === playlist.Id ? (
                      <CheckIcon sx={{ fontSize: '1.3rem' }} />
                    ) : (
                      <Avatar 
                        src={getImageUrl(playlist.Id)} 
                        variant="rounded"
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: alpha('#fff', 0.1),
                          fontSize: '0.9rem'
                        }}
                      >
                        <PlaylistIcon fontSize="small" />
                      </Avatar>
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={playlist.Name} 
                    secondary={`${playlist.ChildCount || 0} songs`}
                    primaryTypographyProps={{
                      sx: { 
                        fontSize: '1rem',
                        fontWeight: addedPlaylist === playlist.Id ? 600 : 400,
                        color: addedPlaylist === playlist.Id ? '#1DB954' : '#fff'
                      }
                    }}
                    secondaryTypographyProps={{
                      sx: {
                        color: alpha('#fff', 0.6),
                        fontSize: '0.8rem'
                      }
                    }}
                  />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>
      
      {/* Error Snackbar */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }} onClose={handleErrorClose}>
          {error}
        </Alert>
      </Snackbar>
      
      {/* Success Snackbar */}
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }} onClose={handleSuccessClose}>
          {success}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickAddToPlaylistMenu; 