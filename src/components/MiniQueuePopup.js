import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Avatar,
  Drawer,
  alpha,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Paper
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  DragHandle as DragHandleIcon,
  ShuffleOn as ShuffleIcon,
  Close as CloseIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { usePlayer } from '../services/PlayerContext';
import { useJellyfin } from '../services/JellyfinContext';
import { formatTime } from '../utils/formatTime';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const QueueSidebar = ({ open, onClose }) => {
  const { getImageUrl, api } = useJellyfin();
  const [tabValue, setTabValue] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  let playerContextValue;
  try {
    playerContextValue = usePlayer();
    if (!playerContextValue) {
      console.error('Player context is undefined');
      return null;
    }
  } catch (error) {
    console.error('Error accessing PlayerContext:', error);
    return null;
  }
  
  const { 
    currentTrack, 
    visibleQueue, 
    queue,
    isPlaying, 
    shuffle,
    togglePlay, 
    playTrack,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    findTrackIndex
  } = playerContextValue;

  const displayQueue = visibleQueue || queue;
  
  const currentIndex = displayQueue.findIndex(track => currentTrack && track.Id === currentTrack.Id);
  
  const nowPlaying = currentTrack ? [currentTrack] : [];
  const upNext = currentIndex >= 0 ? displayQueue.slice(currentIndex + 1) : displayQueue;

  useEffect(() => {
    if (!api || !open || tabValue !== 1) return;

    const fetchRecentlyPlayed = async () => {
      try {
        setIsLoading(true);
        if (api && api.getUserId && api.getItemsByUserId) {
          const userId = await api.getUserId();
          
          if (userId) {
            const recentItems = await api.getItemsByUserId({
              userId: userId,
              limit: 20,
              recursive: true,
              sortBy: 'DatePlayed',
              sortOrder: 'Descending',
              filters: 'IsPlayed',
              mediaTypes: 'Audio'
            });
            
            if (recentItems && recentItems.Items) {
              setRecentlyPlayed(recentItems.Items);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching recently played tracks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentlyPlayed();
  }, [api, open, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePlay = (track) => {
    if (!track || !track.Id) {
      console.error('Attempted to play invalid track in MiniQueuePopup', track);
      return;
    }
    
    console.log('Playing track from mini queue:', track.Name);
    if (currentTrack && currentTrack.Id === track.Id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const handleRemoveTrack = (track, queueIndex) => {
    if (!track || !track.Id) {
      console.error('Attempted to remove invalid track in MiniQueuePopup', track);
      return;
    }
    
    console.log('MiniQueuePopup - Removing track from mini queue:', track.Name);
    console.log('MiniQueuePopup - Using queue index:', queueIndex);
    
    if (queueIndex !== undefined) {
      removeFromQueue(queueIndex);
    } else {
      const index = findTrackIndex(track.Id);
      console.log('MiniQueuePopup - Found track index via findTrackIndex:', index, 'for track ID:', track.Id);
      
      if (index !== -1) {
        removeFromQueue(index);
      } else {
        console.error('MiniQueuePopup - Could not find track in queue:', track);
      }
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    const actualSourceIndex = currentIndex + 1 + sourceIndex;
    const actualDestinationIndex = currentIndex + 1 + destinationIndex;
    
    if (sourceIndex < 0 || sourceIndex >= upNext.length ||
        destinationIndex < 0 || destinationIndex >= upNext.length) {
      console.error('Invalid source or destination index in MiniQueuePopup', 
                  { sourceIndex, destinationIndex, queueLength: upNext.length });
      return;
    }
    
    const sourceTrack = upNext[sourceIndex];
    const targetTrack = upNext[destinationIndex];
    
    if (!sourceTrack || !sourceTrack.Id || !targetTrack || !targetTrack.Id) {
      console.error('Invalid tracks for drag operation in MiniQueuePopup', 
                  { sourceTrack, targetTrack });
      return;
    }
    
    if (actualSourceIndex !== actualDestinationIndex &&
        actualSourceIndex > 0 && actualDestinationIndex > 0 &&
        actualSourceIndex < queue.length && actualDestinationIndex < queue.length) {
      console.log(`Moving track from index ${actualSourceIndex} to ${actualDestinationIndex}`);
      reorderQueue(actualSourceIndex, actualDestinationIndex);
    } else {
      console.warn('Invalid queue indices for reordering', 
                { actualSourceIndex, actualDestinationIndex, queueLength: queue.length });
    }
  };

  const getArtistDisplay = (track) => {
    if (track?.Artists && track.Artists.length > 0) {
      return track.Artists.join(', ');
    }
    if (track?.AlbumArtist) {
      return track.AlbumArtist;
    }
    return 'Unknown Artist';
  };

  const renderTrack = (track, index, section) => {
    if (!track || !track.Id) {
      console.error('Invalid track in MiniQueuePopup:', track);
      return null;
    }
    
    const isCurrentPlaying = currentTrack && track.Id === currentTrack.Id;
    
    if (section === 'now-playing') {
      return (
        <Paper 
          elevation={0}
          key={`${section}-${track.Id}`}
          sx={{
            bgcolor: alpha('#fff', 0.08),
            borderRadius: 1,
            mb: 1,
            overflow: 'hidden'
          }}
        >
          <ListItem
            sx={{
              px: 2,
              py: 1,
            }}
          >
            <Avatar 
              variant="rounded"
              src={getImageUrl(track.Id)}
              alt={track.Name || 'Unknown Track'}
              sx={{ width: 48, height: 48, mr: 2 }}
            />
            
            <ListItemText
              primary={track.Name || 'Unknown Track'}
              secondary={getArtistDisplay(track)}
              primaryTypographyProps={{ 
                variant: 'body1', 
                fontWeight: 600,
                color: 'primary.main',
                noWrap: true
              }}
              secondaryTypographyProps={{ 
                variant: 'caption',
                noWrap: true,
                color: 'text.secondary'
              }}
              sx={{ mr: 1 }}
            />
            
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                {formatTime(track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0)}
              </Typography>
              
              <IconButton 
                size="small" 
                onClick={() => handlePlay(track)}
                sx={{ color: isPlaying ? 'primary.main' : 'inherit' }}
              >
                {isPlaying ? <PlayIcon /> : <PlayIcon />}
              </IconButton>
            </Box>
          </ListItem>
        </Paper>
      );
    }
    
    if (section === 'up-next') {
      const queueIndex = currentIndex + 1 + index;
      
      return (
        <Draggable 
          key={`queue-track-${track.Id}-${index}`} 
          draggableId={`queue-track-${track.Id}-${index}`} 
          index={index}
        >
          {(provided, snapshot) => (
            <Paper
              ref={provided.innerRef}
              {...provided.draggableProps}
              elevation={0}
              sx={{
                bgcolor: snapshot.isDragging ? alpha('#fff', 0.12) : 'transparent',
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  bgcolor: alpha('#fff', 0.06)
                }
              }}
            >
              <ListItem
                sx={{
                  px: 2,
                  py: 1,
                }}
              >
                <Box {...provided.dragHandleProps} sx={{ mr: 1, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                  <DragHandleIcon />
                </Box>
                
                <Avatar 
                  variant="rounded"
                  src={getImageUrl(track.Id)}
                  alt={track.Name || 'Unknown Track'}
                  sx={{ width: 48, height: 48, mr: 2 }}
                />
                
                <ListItemText
                  primary={track.Name || 'Unknown Track'}
                  secondary={getArtistDisplay(track)}
                  primaryTypographyProps={{ 
                    variant: 'body1', 
                    fontWeight: 500,
                    noWrap: true
                  }}
                  secondaryTypographyProps={{ 
                    variant: 'caption',
                    noWrap: true,
                    color: 'text.secondary'
                  }}
                  sx={{ mr: 1 }}
                />
                
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    {formatTime(track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0)}
                  </Typography>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => handlePlay(track)}
                  >
                    <PlayIcon />
                  </IconButton>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => handleRemoveTrack(track, queueIndex)}
                    sx={{ ml: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            </Paper>
          )}
        </Draggable>
      );
    }
    
    return (
      <Paper
        key={`recent-${track.Id}`}
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          borderRadius: 1,
          mb: 1,
          '&:hover': {
            bgcolor: alpha('#fff', 0.06)
          }
        }}
      >
        <ListItem
          sx={{
            px: 2,
            py: 1,
          }}
        >
          <Avatar 
            variant="rounded"
            src={getImageUrl(track.Id)}
            alt={track.Name || 'Unknown Track'}
            sx={{ width: 48, height: 48, mr: 2 }}
          />
          
          <ListItemText
            primary={track.Name || 'Unknown Track'}
            secondary={getArtistDisplay(track)}
            primaryTypographyProps={{ 
              variant: 'body1', 
              fontWeight: 500,
              noWrap: true
            }}
            secondaryTypographyProps={{ 
              variant: 'caption',
              noWrap: true,
              color: 'text.secondary'
            }}
            sx={{ mr: 1 }}
          />
          
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              {formatTime(track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0)}
            </Typography>
            
            <IconButton 
              size="small" 
              onClick={() => playTrack(track)}
            >
              <PlayIcon />
            </IconButton>
          </Box>
        </ListItem>
      </Paper>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380 },
          maxWidth: '100%',
          height: '100%',
          bgcolor: '#121212',
          borderLeft: '1px solid #333',
          overflow: 'hidden',
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }
      }}
    >
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
        pt: 1
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            minHeight: 56,
            '& .MuiTab-root': {
              minHeight: 56,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: 'white'
              }
            }
          }}
        >
          <Tab label="Queue" />
          <Tab label="Recently played" />
        </Tabs>
        
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Box sx={{ 
        overflowY: 'auto', 
        height: 'calc(100% - 56px)',
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)'
          }
        },
        px: 2,
        pt: 2
      }}>
        {tabValue === 0 ? (
          displayQueue.length === 0 ? (
            <Box sx={{ textAlign: 'center', my: 4, p: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Your queue is empty
              </Typography>
            </Box>
          ) : (
            <>
              {nowPlaying.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: 'text.secondary', letterSpacing: 0.5 }}>
                    NOW PLAYING
                  </Typography>
                  <List disablePadding>
                    {nowPlaying.map((track, index) => renderTrack(track, index, 'now-playing'))}
                  </List>
                  
                  {upNext.length > 0 && (
                    <Box sx={{ mt: 3, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'text.secondary', letterSpacing: 0.5 }}>
                        UP NEXT {shuffle && <ShuffleIcon fontSize="small" color="primary" sx={{ ml: 0.5, verticalAlign: 'text-bottom' }} />}
                      </Typography>
                      
                      {queue.length > 1 && (
                        <Tooltip title="Clear queue">
                          <IconButton size="small" onClick={clearQueue} sx={{ color: 'error.main' }}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </Box>
              )}
              
              {upNext.length > 0 && (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="queue-tracks">
                    {(provided) => (
                      <List 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        disablePadding
                      >
                        {upNext.map((track, index) => renderTrack(track, index, 'up-next'))}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </>
          )
        ) : (
          isLoading ? (
            <Box sx={{ textAlign: 'center', my: 4, p: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Loading recently played tracks...
              </Typography>
            </Box>
          ) : recentlyPlayed.length === 0 ? (
            <Box sx={{ textAlign: 'center', my: 4, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <HistoryIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No recently played tracks found
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: 'text.secondary', letterSpacing: 0.5 }}>
                RECENTLY PLAYED
              </Typography>
              <List disablePadding>
                {recentlyPlayed.map((track, index) => renderTrack(track, index, 'recent'))}
              </List>
            </>
          )
        )}
      </Box>
    </Drawer>
  );
};

export default QueueSidebar; 