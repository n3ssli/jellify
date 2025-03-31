import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  Fade,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useJellyfin } from '../services/JellyfinContext';

// Define the event name to match the one in Sidebar.js
const REFRESH_PLAYLISTS_EVENT = 'REFRESH_PLAYLISTS_EVENT';

export default function EditPlaylistDialog({ open, onClose, onPlaylistUpdated, playlist }) {
  const { updatePlaylist, deletePlaylist } = useJellyfin();
  
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (open && playlist) {
      setName(playlist.Name || '');
      setNameError('');
      setError('');
      setSuccess(false);
      setShowDeleteConfirm(false);
    }
  }, [open, playlist]);
  
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (!value.trim()) {
      setNameError('Playlist name cannot be empty');
    } else {
      setNameError('');
    }
  };
  
  const triggerPlaylistRefresh = () => {
    console.log('Triggering playlist refresh in sidebar with REFRESH_PLAYLISTS_EVENT');
    document.dispatchEvent(new CustomEvent(REFRESH_PLAYLISTS_EVENT));
  };
  
  const handleDeletePlaylist = async () => {
    if (!playlist || !playlist.Id) return;
    
    try {
      setLoading(true);
      setError('');
      
      await deletePlaylist(playlist.Id);
      
      setSuccess(true);
      
      triggerPlaylistRefresh();
      
      setTimeout(() => {
        onClose();
        if (onPlaylistUpdated) onPlaylistUpdated({deleted: true});
      }, 1000);
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      setError('Failed to delete playlist. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError('Playlist name cannot be empty');
      return;
    }
    
    const nameChanged = name !== playlist.Name;
    
    if (!nameChanged) {
      onClose();
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Updating playlist with:', JSON.stringify({
        playlistId: playlist.Id,
        name: name
      }));
      
      try {
        await updatePlaylist(playlist.Id, { name });
        setSuccess(true);
        console.log('Successfully updated playlist name');
        
        triggerPlaylistRefresh();
        
        setTimeout(() => {
          onClose();
          if (onPlaylistUpdated) {
            onPlaylistUpdated({
              message: 'Playlist name updated successfully'
            });
          }
        }, 1500);
      } catch (nameError) {
        console.error('Failed to update playlist name:', nameError);
        setError(`Failed to update playlist name: ${nameError.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to update playlist:', JSON.stringify({
        message: err.message,
        stack: err.stack || 'No stack trace'
      }));
      setError(`Failed to update playlist: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: '#282828',
          color: '#fff',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.6) 0%, #121212 100%)',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">Edit Playlist</Typography>
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={onClose} 
          disabled={loading}
          aria-label="close"
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 3 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              bgcolor: 'rgba(211, 47, 47, 0.15)',
              color: '#ff8a80',
              '& .MuiAlert-icon': { color: '#ff8a80' }
            }}
          >
            {error}
          </Alert>
        )}
        
        <Fade in={success}>
          <Alert 
            severity="success" 
            icon={<CheckIcon />}
            sx={{ 
              mb: 2,
              bgcolor: 'rgba(46, 125, 50, 0.15)',
              color: '#69f0ae',
              '& .MuiAlert-icon': { color: '#69f0ae' }
            }}
          >
            {showDeleteConfirm ? 'Playlist deleted successfully!' : 'Playlist updated successfully!'}
          </Alert>
        </Fade>
        
        {showDeleteConfirm ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" mb={2}>
              Delete "{playlist?.Name}"?
            </Typography>
            <Typography variant="body1" mb={3} color="text.secondary">
              This will permanently delete the playlist. This action cannot be undone.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.5)',
                    bgcolor: 'rgba(255,255,255,0.05)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeletePlaylist}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
              >
                {loading ? 'Deleting...' : 'Delete Playlist'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* Playlist Name */}
            <TextField
              label="Playlist Name"
              fullWidth
              value={name}
              onChange={handleNameChange}
              error={!!nameError}
              helperText={nameError}
              disabled={loading}
              autoFocus
              margin="normal"
              InputLabelProps={{
                sx: {
                  color: 'rgba(255,255,255,0.7)',
                }
              }}
              InputProps={{
                sx: {
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1DB954',
                  }
                }
              }}
              FormHelperTextProps={{
                sx: {
                  color: 'error.main',
                }
              }}
            />
            
            <Typography variant="body2" color="text.secondary" mt={2}>
              Enter a new name for your playlist.
            </Typography>
            
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Updating playlist...
                </Typography>
              </Box>
            )}
            
            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
            
            <Button
              color="error"
              variant="text"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              size="small"
              sx={{ mt: 1, alignSelf: 'flex-start' }}
            >
              Delete Playlist
            </Button>
          </Box>
        )}
      </DialogContent>
      
      {!showDeleteConfirm && (
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end' }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !!nameError || success}
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{
              bgcolor: '#1DB954',
              '&:hover': {
                bgcolor: '#1ed760',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(29, 185, 84, 0.5)',
                color: 'rgba(255,255,255,0.5)'
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
} 