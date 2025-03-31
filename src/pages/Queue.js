import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Avatar,
  alpha,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  MoreVert as MoreIcon,
  MusicNote as MusicNoteIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Clear as ClearIcon,
  Shuffle as ShuffleIcon,
  DragHandle as DragHandleIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import { formatTime } from '../utils/formatTime'
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

const Queue = () => {
  const { getImageUrl, connectionStatus, isInitialized } = useJellyfin()
  const { 
    queue, 
    visibleQueue,
    currentTrack, 
    isPlaying, 
    shuffle,
    togglePlay, 
    playTrack, 
    removeFromQueue,
    clearQueue,
    directSwapTracks,
    findTrackIndex,
    reorderQueue
  } = usePlayer()
  
  // Local state to handle immediate UI updates during drag operations
  const [localUpNext, setLocalUpNext] = useState([])
  
  // Use the visible queue that respects the shuffle order
  const displayQueue = useMemo(() => {
    console.log('Refreshing displayQueue', { 
      visibleQueueLength: visibleQueue?.length || 0, 
      queueLength: queue?.length || 0,
      shuffle
    });
    return shuffle && visibleQueue?.length > 0 ? visibleQueue : queue;
  }, [visibleQueue, queue, shuffle]);
  
  // Get current track index in the visible queue
  const currentIndex = useMemo(() => {
    if (!currentTrack) return -1;
    const index = displayQueue.findIndex(track => track && currentTrack && track.Id === currentTrack.Id);
    console.log('Current track index in queue:', index);
    return index;
  }, [displayQueue, currentTrack]);
  
  // Split queue into "Now Playing" and "Up Next"
  const nowPlaying = useMemo(() => currentTrack ? [currentTrack] : [], [currentTrack]);
  const upNext = useMemo(() => {
    if (currentIndex >= 0 && displayQueue.length > 0) {
      const nextItems = displayQueue.slice(currentIndex + 1);
      console.log(`Split queue: ${nextItems.length} tracks up next`);
      return nextItems;
    }
    return displayQueue;
  }, [currentIndex, displayQueue]);
  
  // Use a ref to track the previous upNext value to prevent unnecessary updates
  const upNextRef = useRef(upNext)
  
  // Force refresh when queue changes to ensure we're showing the latest data
  useEffect(() => {
    console.log('Queue changed, updating local state', { 
      queueLength: queue.length, 
      upNextLength: upNext.length 
    });
    setLocalUpNext(upNext);
    upNextRef.current = upNext;
  }, [queue, upNext]);
  
  const handlePlay = (track) => {
    if (!track || !track.Id) {
      console.error('Attempted to play invalid track in Queue', track);
      return;
    }
    
    console.log('Playing track from queue:', track.Name);
    if (currentTrack && currentTrack.Id === track.Id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };
  
  const handleRemoveTrack = (track) => {
    if (!track || !track.Id) {
      console.error('Attempted to remove invalid track in Queue', track);
      return;
    }
    
    console.log('Removing track from queue:', track.Name);
    // Find the track in the queue
    const index = findTrackIndex(track.Id);
    if (index !== -1) {
      removeFromQueue(index);
      
      // Also update local state to give immediate UI feedback
      setLocalUpNext(prev => prev.filter(t => t.Id !== track.Id));
    } else {
      console.error('Could not find track in queue:', track);
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
  
  // Render a non-draggable track (for Now Playing section)
  const renderNowPlayingTrack = (track, index) => {
    const isCurrentPlaying = currentTrack && track.Id === currentTrack.Id
    
    return (
      <ListItem
        key={`now-playing-${track.Id}`}
        sx={{
          px: 2,
          py: 1,
          borderRadius: 1,
          mb: 0.5,
          bgcolor: isCurrentPlaying ? alpha('#fff', 0.1) : 'transparent',
          '&:hover': {
            bgcolor: alpha('#fff', 0.1)
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
            <MusicNoteIcon fontSize="small" sx={{ color: 'primary.main' }} />
        </ListItemIcon>
        
        <Avatar 
          variant="square"
          src={getImageUrl(track.Id)}
          alt={track.Name}
          sx={{ width: 40, height: 40, mr: 2, borderRadius: 1 }}
        />
        
        <ListItemText
          primary={track.Name}
          secondary={track.Artists?.join(', ') || track.AlbumArtist || 'Unknown Artist'}
          primaryTypographyProps={{ 
            variant: 'body1', 
            fontWeight: isCurrentPlaying ? 600 : 400,
            color: isCurrentPlaying ? 'primary.main' : 'inherit',
            noWrap: true
          }}
          secondaryTypographyProps={{ 
            variant: 'body2',
            noWrap: true
          }}
          sx={{ mr: 2 }}
        />
        
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {formatTime(track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0)}
        </Typography>
        
        <Box sx={{ ml: 'auto', display: 'flex' }}>
          <IconButton 
            size="small" 
            onClick={() => handlePlay(track)}
            sx={{ color: isCurrentPlaying && isPlaying ? 'primary.main' : 'inherit' }}
          >
            <PlayIcon fontSize="small" />
          </IconButton>
        </Box>
      </ListItem>
    );
  };
  
  // SortableQueueItem component for the queue page
  const SortableQueueItem = ({ track, index, handlePlay, handleRemove, getImageUrl, formatTime }) => {
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
        elevation={isDragging ? 3 : 0}
        sx={{
          mb: 0.5,
          bgcolor: isDragging ? alpha('#fff', 0.12) : 'transparent',
          borderRadius: 1,
          '&:hover': {
            bgcolor: alpha('#fff', 0.06)
          },
          ...style
        }}
      >
        <ListItem 
          sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
          }}
        >
          <Box 
            {...attributes} 
            {...listeners}
            sx={{ color: 'text.secondary', mr: 1, display: 'flex', alignItems: 'center', cursor: 'grab' }}
          >
            <DragHandleIcon fontSize="small" />
          </Box>
          
          <Avatar 
            variant="square"
            src={getImageUrl(track.Id)}
            alt={track.Name}
            sx={{ width: 40, height: 40, mr: 2, borderRadius: 1 }}
          />
          
          <ListItemText
            primary={track.Name}
            secondary={track.Artists?.join(', ') || track.AlbumArtist || 'Unknown Artist'}
            primaryTypographyProps={{ 
              variant: 'body1', 
              fontWeight: 400,
              noWrap: true
            }}
            secondaryTypographyProps={{ 
              variant: 'body2',
              noWrap: true
            }}
            sx={{ mr: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {formatTime(track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0)}
          </Typography>
          
          <Box sx={{ ml: 'auto', display: 'flex' }}>
            <IconButton 
              size="small" 
              onClick={() => handlePlay(track)}
            >
              <PlayIcon fontSize="small" />
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={() => handleRemove(track)}
              sx={{ ml: 1 }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        </ListItem>
      </Paper>
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Queue {shuffle && <ShuffleIcon color="primary" sx={{ ml: 1, verticalAlign: 'middle' }} />}
        </Typography>
        {queue.length > 0 && (
          <IconButton onClick={clearQueue} color="error">
            <ClearIcon />
          </IconButton>
        )}
      </Box>
      
      {displayQueue.length === 0 ? (
        // Empty queue state
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Your queue is empty
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Add songs to your queue to start listening
          </Typography>
        </Box>
      ) : (
        // Queue content
        <>
          {/* Now Playing section */}
          {nowPlaying.length > 0 && (
            <>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Now Playing
              </Typography>
              <List disablePadding>
                {nowPlaying.map((track, index) => renderNowPlayingTrack(track, index))}
              </List>
              
              <Divider sx={{ my: 3 }} />
            </>
          )}
          
          {/* Up Next section */}
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Up Next
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({localUpNext.length} {localUpNext.length === 1 ? 'song' : 'songs'})
                </Typography>
              </Typography>
          
          {/* Replace the non-draggable component with a DnD component */}
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
                    if (!track || !track.Id) {
                      console.error('Invalid track at index', index, track);
                      return null;
                    }
                    
                    return (
                      <SortableQueueItem
                        key={`queue-item-${track.Id}-${index}`}
                        track={track}
                        index={index}
                        handlePlay={handlePlay}
                        handleRemove={handleRemoveTrack}
                        getImageUrl={getImageUrl}
                        formatTime={formatTime}
                      />
                    );
                  })}
                </List>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}
    </Box>
  )
}

export default Queue 