import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Paper,
  ListItemAvatar,
  Button
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  ShuffleOn as ShuffleIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  DragHandle as DragHandleIcon
} from '@mui/icons-material';
import { usePlayer } from '../services/PlayerContext';
import { useJellyfin } from '../services/JellyfinContext';
import { formatTime } from '../utils/formatTime';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const QueueSidebar = ({ open, onClose }) => {
  const { getImageUrl, api } = useJellyfin();
  const [tabValue, setTabValue] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localUpNext, setLocalUpNext] = useState([]);
  
  // Add a try-catch block to handle potential undefined values from usePlayer
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
    directSwapTracks,
    findTrackIndex,
    reorderQueue
  } = playerContextValue;

  // Use the visible queue that respects the shuffle order
  const displayQueue = useMemo(() => {
    // Make sure we're using a valid queue array
    if (Array.isArray(visibleQueue) && visibleQueue.length > 0) {
      return visibleQueue;
    }
    // Fallback to the standard queue if visibleQueue is empty or not available
    return Array.isArray(queue) ? queue : [];
  }, [visibleQueue, queue]);
  
  // Get current track index in the visible queue
  const currentIndex = useMemo(() => 
    currentTrack ? displayQueue.findIndex(track => track?.Id === currentTrack?.Id) : -1,
    [displayQueue, currentTrack]
  );
  
  // Split queue into "Now Playing" and "Up Next"
  const nowPlaying = useMemo(() => currentTrack ? [currentTrack] : [], [currentTrack]);
  
  // Simple reference for tracking if we need to update
  const upNextRef = useRef(null);
  
  // Use more defensive approach to get "Up Next" tracks
  const upNext = useMemo(() => {
    // Safety check for displayQueue
    if (!Array.isArray(displayQueue) || displayQueue.length === 0) {
      return [];
    }
    
    // If we have a valid current track and can find it in the queue
    if (currentTrack && currentTrack.Id && currentIndex >= 0) {
      // Get everything after the current track
      const nextTracks = displayQueue.slice(currentIndex + 1);
      return nextTracks;
    }
    
    // If no current track or it's not in the queue, return the whole queue
    return [...displayQueue]; 
  }, [currentIndex, displayQueue, currentTrack]);
  
  // Update local state when the queue changes with more reliable tracking
  useEffect(() => {
    // Only update if actually changed - avoid unnecessary re-renders
    const stringified = JSON.stringify(upNext.map(t => t?.Id));
    if (upNextRef.current !== stringified) {
      // Save the new fingerprint
      upNextRef.current = stringified;
      
      // Update local state
      setLocalUpNext(upNext);
      console.log(`Updated queue with ${upNext.length} tracks`);
    }
  }, [upNext]);

  // Fetch recently played tracks from Jellyfin API
  useEffect(() => {
    if (!api || !open || tabValue !== 1) return;

    const fetchRecentlyPlayed = async () => {
      try {
        setIsLoading(true);
        // Fetch user's playing history if API is available
        if (api && api.getUserId && api.getItemsByUserId) {
          const userId = await api.getUserId();
          
          if (userId) {
            // Get items with "Audio" media type that the user has played
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
      console.error('Attempted to play invalid track', track);
      return;
    }
    
    console.log('Playing track from queue sidebar:', track.Name);
    playTrack(track);
  };

  const handleRemoveTrack = (track, index) => {
    if (!track || !track.Id) {
      console.error('Attempted to remove invalid track in QueueSidebar', track);
      return;
    }
    
    console.log('QueueSidebar - Removing track from queue:', track.Name);
    // Find the track in the queue
    const queueIndex = findTrackIndex(track.Id);
    console.log('QueueSidebar - Found track index:', queueIndex, 'for track ID:', track.Id);
    
    if (queueIndex !== -1) {
      removeFromQueue(queueIndex);
      
      // Also update local state to give immediate UI feedback
      setLocalUpNext(prev => prev.filter(t => t.Id !== track.Id));
    } else {
      console.error('QueueSidebar - Could not find track in queue:', track);
    }
  };

  // Setup dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Updated for dnd-kit
  const handleDndDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    if (!active || !over || active.id === over.id) {
      return; // No change or invalid drop
    }

    try {
      // Extract the source and target indices from the composite IDs
      // Format is "trackId-index"
      const sourceIdParts = active.id.toString().split('-');
      const targetIdParts = over.id.toString().split('-');
      
      // Get the indices within our localUpNext array
      const sourceIndex = parseInt(sourceIdParts[sourceIdParts.length - 1]);
      const targetIndex = parseInt(targetIdParts[targetIdParts.length - 1]);
      
      // Validate indices
      if (isNaN(sourceIndex) || isNaN(targetIndex) || 
          sourceIndex < 0 || sourceIndex >= localUpNext.length ||
          targetIndex < 0 || targetIndex >= localUpNext.length) {
        console.error('Invalid indices extracted from IDs', { sourceIndex, targetIndex });
        return;
      }
      
      // Get the tracks
      const sourceTrack = localUpNext[sourceIndex];
      const targetTrack = localUpNext[targetIndex];
      
      if (!sourceTrack || !targetTrack) {
        console.error('Could not find tracks for drag operation', { sourceIndex, targetIndex });
        return;
      }
      
      console.log(`Moving track "${sourceTrack.Name}" from index ${sourceIndex} to ${targetIndex}`);
      
      // Update local state for immediate feedback
      setLocalUpNext(prevItems => {
        return arrayMove(prevItems, sourceIndex, targetIndex);
      });
      
      // COMPLETELY NEW APPROACH: Calculate the actual queue indices
      const queueSourceIndex = findTrackIndex(sourceTrack.Id);
      
      if (queueSourceIndex === -1) {
        console.error('Could not find source track in queue:', sourceTrack.Id);
        return;
      }
      
      // Transform the local targetIndex to the appropriate queue targetIndex
      const currentIndexInQueue = currentTrack ? findTrackIndex(currentTrack.Id) : -1;
      // Calculate offset to convert from localUpNext index to full queue index
      // Add +1 because localUpNext starts after currentTrack
      const offset = currentIndexInQueue + 1;
      // Calculate the target queue index
      const queueTargetIndex = targetIndex + offset;
      
      console.log(`Queue indices: source=${queueSourceIndex}, computed target=${queueTargetIndex}`);
      
      // Apply the move in the actual queue
      if (queueSourceIndex !== queueTargetIndex) {
        setTimeout(() => {
          console.log(`Calling reorderQueue with ${queueSourceIndex} -> ${queueTargetIndex}`);
          reorderQueue(queueSourceIndex, queueTargetIndex);
        }, 100);
      }
    } catch (error) {
      console.error('Error handling drag end:', error);
    }
  }, [localUpNext, reorderQueue, findTrackIndex, currentTrack]);

  // Helper function to get the correct artist display name
  const getArtistDisplay = (track) => {
    // First prioritize Artists array if available
    if (track?.Artists && track.Artists.length > 0) {
      return track.Artists.join(', ');
    }
    // Fallback to AlbumArtist
    if (track?.AlbumArtist) {
      return track.AlbumArtist;
    }
    // Last resort
    return 'Unknown Artist';
  };

  // SortableItem component for queue items
  const SortableQueueItem = ({ track, index, handlePlay, handleRemove, getImageUrl, formatTime, getArtistDisplay }) => {
    // Create a position-based unique ID for this item to prevent issues with duplicate tracks
    const uniqueId = `${track.Id}-${index}`;
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: uniqueId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      zIndex: isDragging ? 9999 : 1,
      position: 'relative',
    };

    return (
      <Paper
        ref={setNodeRef}
        elevation={0}
        sx={{
          bgcolor: isDragging ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
          borderRadius: 1,
          mb: 1,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.06)'
          },
          ...style
        }}
      >
        <ListItem sx={{ px: 2, py: 1 }}>
          <Box 
            {...attributes} 
            {...listeners}
            sx={{ color: 'text.secondary', mr: 1, display: 'flex', alignItems: 'center', cursor: 'grab' }}
          >
            <DragHandleIcon fontSize="small" />
          </Box>
          
          <Avatar 
            variant="rounded"
            src={getImageUrl(track.Id)}
            alt={track.Name}
            sx={{ width: 48, height: 48, mr: 2 }}
          />
          
          <ListItemText
            primary={track.Name}
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
              onClick={() => handleRemove(track, index)}
              sx={{ ml: 0.5 }}
            >
              <ClearIcon fontSize="small" />
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
          (!displayQueue.length && !localUpNext.length) ? (
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
                  
                  {nowPlaying.map(track => (
                    <Paper 
                      elevation={0}
                      key={`now-playing-${track.Id}`}
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
                          alt={track.Name}
                          sx={{ width: 48, height: 48, mr: 2 }}
                        />
                        
                        <ListItemText
                          primary={track.Name}
                          secondary={getArtistDisplay(track)}
                          primaryTypographyProps={{ 
                            variant: 'body1', 
                            fontWeight: 600,
                            color: '#1DB954',
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
                            onClick={() => togglePlay()}
                            sx={{ color: isPlaying ? '#1DB954' : 'inherit' }}
                          >
                            {isPlaying ? <PlayIcon /> : <PlayIcon />}
                          </IconButton>
                        </Box>
                      </ListItem>
                    </Paper>
                  ))}
                  
                    <Box sx={{ mt: 3, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'text.secondary', letterSpacing: 0.5 }}>
                        UP NEXT {shuffle && <ShuffleIcon fontSize="small" color="primary" sx={{ ml: 0.5, verticalAlign: 'text-bottom' }} />}
                      </Typography>
                      
                      {(queue.length > 1 || localUpNext.length > 0) && (
                        <Tooltip title="Clear queue">
                          <IconButton size="small" onClick={clearQueue} sx={{ color: 'error.main' }}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                </Box>
              )}
              
              {/* Simplified drag-and-drop container */}
              {localUpNext.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDndDragEnd}
                >
                  <SortableContext
                    items={localUpNext.map((track, index) => `${track.Id}-${index}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <List disablePadding>
                      {localUpNext.map((track, index) => {
                        if (!track || !track.Id) return null;
                        
                        return (
                          <SortableQueueItem
                            key={`queue-item-${track.Id}-${index}`}
                            track={track}
                            index={index}
                            handlePlay={handlePlay}
                            handleRemove={handleRemoveTrack}
                            getImageUrl={getImageUrl}
                            formatTime={formatTime}
                            getArtistDisplay={getArtistDisplay}
                          />
                        );
                      })}
                    </List>
                  </SortableContext>
                </DndContext>
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
                {recentlyPlayed.map((track) => (
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
                        alt={track.Name}
                        sx={{ width: 48, height: 48, mr: 2 }}
                      />
                      
                      <ListItemText
                        primary={track.Name}
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
                ))}
              </List>
            </>
          )
        )}
      </Box>
    </Drawer>
  );
};

export default QueueSidebar; 