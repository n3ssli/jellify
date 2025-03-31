import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Avatar,
  useTheme,
  Backdrop,
  Fade,
  Portal,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Paper,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipPrevious as PreviousIcon,
  SkipNext as NextIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
  Shuffle as ShuffleIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  VolumeMute as VolumeMuteIcon,
  VolumeDown as VolumeDownIcon,
  MoreVert as MoreIcon,
  Favorite as LikeIcon,
  FavoriteBorder as LikeOutlineIcon,
  ArrowBackIosNew as BackIcon,
  Lyrics as LyricsIcon,
  Close as CloseIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon
} from '@mui/icons-material';
import { usePlayer } from '../services/PlayerContext';
import { useJellyfin } from '../services/JellyfinContext';
import { formatTime } from '../utils/formatTime';
import ColorThief from 'colorthief';

// Helper function to generate random color
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 35%)`;
};

const FullScreenPlayer = ({ open, onClose }) => {
  const theme = useTheme();
  const { getImageUrl, getLyrics, toggleFavorite, isFavorite } = useJellyfin();
  const [dominantColor, setDominantColor] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyrics, setLyrics] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
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
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    setVolumeLevel,
    toggleMute,
    toggleShuffle,
    toggleRepeat
  } = playerContextValue;

  // Get album art
  const albumArt = currentTrack && currentTrack.Id ? getImageUrl(currentTrack.Id || currentTrack.AlbumId, 'Primary', 500, 'album') : null;

  // Hide/show the app when entering/exiting full screen mode
  useEffect(() => {
    if (open) {
      // Store original display values before hiding
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling immediately
      document.body.style.overflow = '';
    }

    // Cleanup function to ensure state is restored when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Extract dominant color from album art when it changes
  useEffect(() => {
    if (!albumArt || !open) {
      // Set a random color if no album art available
      setDominantColor(getRandomColor());
      return;
    }

    const img = new Image();
    const colorThief = new ColorThief();
    
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const color = colorThief.getColor(img);
        setDominantColor(`rgb(${color[0]}, ${color[1]}, ${color[2]})`);
      } catch (error) {
        console.error('Error extracting color:', error);
        setDominantColor(getRandomColor());
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for color extraction');
      setDominantColor(getRandomColor());
    };
    
    img.src = albumArt;
  }, [albumArt, open]);

  // Load lyrics when showing fullscreen player
  useEffect(() => {
    if (open && currentTrack?.Id && !lyrics) {
      fetchLyrics();
    }
  }, [open, currentTrack]);

  // Check if the current track is favorited when it changes
  useEffect(() => {
    if (currentTrack?.Id) {
      checkFavoriteStatus(currentTrack.Id);
    }
  }, [currentTrack]);

  // Function to check favorite status
  const checkFavoriteStatus = async (itemId) => {
    try {
      const favorited = await isFavorite(itemId);
      setIsLiked(favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleSliderChange = (_, newValue) => {
    setIsSeeking(true);
    setSeekValue(newValue);
  };

  const handleSliderCommit = (_, newValue) => {
    seekTo(newValue);
    setIsSeeking(false);
  };

  const handleVolumeChange = (_, value) => {
    setVolumeLevel(value / 100);
  };

  // Toggle the favorite status
  const toggleLike = async () => {
    if (!currentTrack?.Id) return;

    try {
      await toggleFavorite(currentTrack.Id);
      
      // Toggle the like state
      const newLikeState = !isLiked;
      setIsLiked(newLikeState);
      
      // Show snackbar message
      setSnackbarMessage(newLikeState 
        ? 'Added to your Liked Songs' 
        : 'Removed from your Liked Songs');
      setSnackbarSeverity(newLikeState ? 'success' : 'info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setSnackbarMessage('Failed to update Liked Songs');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const fetchLyrics = async () => {
    if (!currentTrack?.Id) return;
    
    setLoadingLyrics(true);
    
    try {
      const lyricsData = await getLyrics(currentTrack.Id);
      setLyrics(lyricsData);
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      setLyrics(null);
    } finally {
      setLoadingLyrics(false);
    }
  };

  const handleToggleLyrics = () => {
    setShowLyrics(prev => !prev);
  };

  // If no current track or not open, don't show player
  if (!currentTrack || !open) return null;

  // Determine which volume icon to display
  const VolumeIcon = () => {
    if (muted || volume === 0) return <VolumeOffIcon />;
    if (volume < 0.3) return <VolumeMuteIcon />;
    if (volume < 0.7) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  // Ensure we have valid duration
  const validDuration = duration && isFinite(duration) && duration > 0 ? duration : 100;
  
  // Use seekValue when dragging, otherwise use currentTime
  const displayTime = isSeeking ? seekValue : currentTime;
  
  // Repeat icon based on mode
  const RepeatButtonIcon = repeat === 'one' ? RepeatOneIcon : RepeatIcon;

  // Create solid gradient background with dominant color
  const backgroundStyle = {
    background: dominantColor 
      ? `linear-gradient(135deg, ${dominantColor} 0%, rgba(0, 0, 0, 1) 100%), 
         radial-gradient(circle at top right, ${dominantColor}, transparent 70%),
         radial-gradient(circle at bottom left, ${dominantColor}cc, transparent 70%), 
         #000000`
      : `linear-gradient(135deg, ${getRandomColor()} 0%, rgba(0, 0, 0, 1) 100%), #000000`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };

  // Use Portal to render outside of the normal DOM hierarchy
  return (
    <Portal>
      <Backdrop
        open={open}
        sx={{ 
          color: '#fff', 
          zIndex: theme.zIndex.drawer + 1500,
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none',
          backgroundColor: 'rgba(0, 0, 0, 1)'
        }}
      >
        <Fade in={open}>
          <Box sx={{ 
            width: '100vw', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            backgroundColor: '#000'
          }}>
            {/* Background with dominant color */}
            <Box sx={backgroundStyle} />
            
            {/* Black background layer to ensure opacity */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: -1,
              backgroundColor: '#000'
            }} />
            
            {/* Animated background particles */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              overflow: 'hidden',
              opacity: 0.5
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    width: { xs: '100px', md: '200px' },
                    height: { xs: '100px', md: '200px' },
                    borderRadius: '50%',
                    background: dominantColor 
                      ? `radial-gradient(circle, ${dominantColor}22 0%, transparent 70%)`
                      : 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    animation: `float-particle-${i} ${20 + i * 5}s ease-in-out infinite`,
                    filter: 'blur(8px)',
                    '@keyframes float-particle-0': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
                      '50%': { transform: 'translate(-30%, -30%) scale(1.2)' }
                    },
                    '@keyframes float-particle-1': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(0.8)' },
                      '50%': { transform: 'translate(-70%, -40%) scale(1.1)' }
                    },
                    '@keyframes float-particle-2': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1.2)' },
                      '50%': { transform: 'translate(-40%, -60%) scale(0.9)' }
                    },
                    '@keyframes float-particle-3': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(0.7)' },
                      '50%': { transform: 'translate(-60%, -50%) scale(1.3)' }
                    },
                    '@keyframes float-particle-4': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1.1)' },
                      '50%': { transform: 'translate(-30%, -70%) scale(0.8)' }
                    },
                    '@keyframes float-particle-5': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(0.9)' },
                      '50%': { transform: 'translate(-70%, -30%) scale(1.2)' }
                    },
                    '@keyframes float-particle-6': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1.3)' },
                      '50%': { transform: 'translate(-40%, -40%) scale(0.7)' }
                    },
                    '@keyframes float-particle-7': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(0.8)' },
                      '50%': { transform: 'translate(-60%, -60%) scale(1.1)' }
                    },
                    '@keyframes float-particle-8': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
                      '50%': { transform: 'translate(-30%, -50%) scale(1.2)' }
                    },
                    '@keyframes float-particle-9': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1.2)' },
                      '50%': { transform: 'translate(-50%, -30%) scale(0.9)' }
                    },
                    '@keyframes float-particle-10': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(0.9)' },
                      '50%': { transform: 'translate(-50%, -70%) scale(1.1)' }
                    },
                    '@keyframes float-particle-11': {
                      '0%, 100%': { transform: 'translate(-50%, -50%) scale(1.1)' },
                      '50%': { transform: 'translate(-70%, -50%) scale(0.8)' }
                    }
                  }}
                />
              ))}
            </Box>
            
            {/* Background overlay for lyrics */}
            {showLyrics && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)'
              }} />
            )}
            
            {/* Header */}
            <Box sx={{ 
              p: 3, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              zIndex: 2,
              backdropFilter: 'blur(5px)',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)'
            }}>
              <IconButton 
                onClick={onClose} 
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    color: '#1DB954',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <KeyboardArrowDownIcon sx={{ fontSize: '2rem' }} />
              </IconButton>
              
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  textAlign: 'center', 
                  fontWeight: 600, 
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  opacity: 0.9,
                  background: `linear-gradient(to right, #ffffff, ${dominantColor || '#1DB954'}, #ffffff)`,
                  backgroundSize: '200% auto',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shine 6s linear infinite',
                  '@keyframes shine': {
                    '0%': { backgroundPosition: '0% center' },
                    '100%': { backgroundPosition: '200% center' }
                  }
                }}
              >
                {currentTrack?.AlbumId ? 'PLAYING FROM ALBUM' : 'NOW PLAYING'}
              </Typography>
              
              <IconButton sx={{ 
                color: showLyrics ? '#1DB954' : 'white',
                '&:hover': {
                  color: '#1DB954',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
              onClick={handleToggleLyrics}
              >
                <LyricsIcon />
              </IconButton>
            </Box>
            
            {!showLyrics ? (
              <>
                {/* Album Cover */}
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  p: { xs: 2, sm: 4 },
                  mb: { xs: 2, sm: 0 },
                  zIndex: 1
                }}>
                  <Box sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: { xs: '280px', sm: '380px', md: '450px' },
                    aspectRatio: '1/1',
                    animation: 'floatAlbum 8s ease-in-out infinite',
                    '@keyframes floatAlbum': {
                      '0%': { transform: 'translateY(0px) rotateZ(-1deg)' },
                      '50%': { transform: 'translateY(-10px) rotateZ(1deg)' },
                      '100%': { transform: 'translateY(0px) rotateZ(-1deg)' }
                    }
                  }}>
                    <Avatar
                      variant="square"
                      src={albumArt}
                      alt={currentTrack.Name}
                      sx={{
                        width: '100%',
                        height: '100%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    {/* Vinyl record effect behind album */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        width: '90%',
                        height: '90%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #111 0%, #000 90%)',
                        transform: 'translate(-30%, -50%)',
                        zIndex: -1,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        opacity: 0.6,
                        animation: isPlaying ? 'spin 4s linear infinite' : 'none',
                        '@keyframes spin': {
                          '0%': { transform: 'translate(-30%, -50%) rotate(0deg)' },
                          '100%': { transform: 'translate(-30%, -50%) rotate(360deg)' }
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '15%',
                          height: '15%',
                          borderRadius: '50%',
                          background: '#222',
                          transform: 'translate(-50%, -50%)',
                          border: '1px solid #333'
                        }
                      }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)',
                      borderRadius: '8px',
                      pointerEvents: 'none'
                    }} />
                  </Box>
                </Box>
                
                {/* Track Info */}
                <Box sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  maxWidth: { xs: '100%', sm: '90%', md: '800px' },
                  mx: 'auto',
                  width: '100%',
                  zIndex: 1,
                  backdropFilter: 'blur(5px)',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
                  borderRadius: '16px 16px 0 0'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3
                  }}>
                    <Box sx={{ maxWidth: '80%' }}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 700, 
                          mb: 0.5,
                          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.2rem' },
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                          animation: 'fadeInUp 0.5s ease-out',
                          '@keyframes fadeInUp': {
                            '0%': { 
                              opacity: 0,
                              transform: 'translateY(20px)'
                            },
                            '100%': { 
                              opacity: 1,
                              transform: 'translateY(0)'
                            }
                          }
                        }}
                      >
                        {currentTrack.Name}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          animation: 'fadeInUp 0.5s ease-out 0.1s backwards',
                          textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        {currentTrack.AlbumArtist || currentTrack.ArtistItems?.[0]?.Name || 'Unknown Artist'}
                      </Typography>
                    </Box>
                    
                    <IconButton 
                      onClick={toggleLike} 
                      sx={{ 
                        color: isLiked ? '#1DB954' : 'white',
                        '&:hover': {
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease',
                        animation: 'fadeInUp 0.5s ease-out 0.2s backwards'
                      }}
                    >
                      {isLiked ? <LikeIcon fontSize="large" /> : <LikeOutlineIcon fontSize="large" />}
                    </IconButton>
                  </Box>
                  
                  {/* Progress bar */}
                  <Box sx={{ 
                    mb: 4,
                    animation: 'fadeInUp 0.5s ease-out 0.3s backwards',
                  }}>
                    <Slider
                      value={displayTime}
                      min={0}
                      max={validDuration}
                      onChange={handleSliderChange}
                      onChangeCommitted={handleSliderCommit}
                      aria-label="Time"
                      sx={{
                        color: '#1DB954',
                        height: 6,
                        '& .MuiSlider-thumb': {
                          width: 12,
                          height: 12,
                          transition: '0.2s',
                          '&:hover, &.Mui-active': {
                            boxShadow: '0 0 0 8px rgba(29, 185, 84, 0.16)',
                          },
                          '&::before': {
                            boxShadow: '0 0 3px rgba(0,0,0,0.4)'
                          }
                        },
                        '& .MuiSlider-rail': {
                          opacity: 0.3,
                          bgcolor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '& .MuiSlider-track': {
                          border: 'none',
                          boxShadow: '0 2px 10px rgba(29, 185, 84, 0.5)'
                        },
                        '&:hover .MuiSlider-track': {
                          bgcolor: '#1DB954',
                        },
                        '&:hover .MuiSlider-thumb': {
                          boxShadow: '0 0 0 8px rgba(29, 185, 84, 0.16)'
                        }
                      }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {formatTime(displayTime)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {formatTime(validDuration)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Playback controls */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 4,
                    maxWidth: { xs: '100%', sm: '90%', md: '600px' },
                    mx: 'auto',
                    animation: 'fadeInUp 0.5s ease-out 0.4s backwards'
                  }}>
                    <IconButton 
                      onClick={toggleShuffle}
                      sx={{ 
                        color: shuffle ? '#1DB954' : 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { 
                          color: shuffle ? '#1DB954' : 'white',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ShuffleIcon fontSize="large" />
                    </IconButton>
                    
                    <IconButton 
                      onClick={playPrevious}
                      sx={{ 
                        color: 'white',
                        '&:hover': { 
                          transform: 'scale(1.1)',
                          color: '#1DB954'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <PreviousIcon sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }} />
                    </IconButton>
                    
                    <IconButton 
                      onClick={togglePlay}
                      sx={{ 
                        bgcolor: 'white',
                        color: 'black',
                        p: { xs: 1.5, sm: 2 },
                        '&:hover': {
                          bgcolor: '#1DB954',
                          transform: 'scale(1.05)'
                        },
                        boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isPlaying ? 
                        <PauseIcon sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }} /> : 
                        <PlayIcon sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }} />
                      }
                    </IconButton>
                    
                    <IconButton 
                      onClick={playNext}
                      sx={{ 
                        color: 'white',
                        '&:hover': { 
                          transform: 'scale(1.1)',
                          color: '#1DB954'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <NextIcon sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }} />
                    </IconButton>
                    
                    <IconButton 
                      onClick={toggleRepeat}
                      sx={{ 
                        color: repeat !== 'off' ? '#1DB954' : 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { 
                          color: repeat !== 'off' ? '#1DB954' : 'white',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <RepeatButtonIcon fontSize="large" />
                    </IconButton>
                  </Box>
                  
                  {/* Volume */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 3,
                    justifyContent: 'center',
                    animation: 'fadeInUp 0.5s ease-out 0.5s backwards'
                  }}>
                    <IconButton 
                      onClick={toggleMute} 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { 
                          color: 'white',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <VolumeIcon />
                    </IconButton>
                    
                    <Slider
                      size="small"
                      value={muted ? 0 : volume * 100}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      sx={{ 
                        width: { xs: 120, sm: 200 },
                        mx: 2,
                        color: '#1DB954',
                        '& .MuiSlider-rail': {
                          opacity: 0.3,
                          bgcolor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '& .MuiSlider-thumb': {
                          width: 10,
                          height: 10
                        },
                        '&:hover .MuiSlider-track': {
                          bgcolor: '#1DB954'
                        }
                      }}
                    />
                  </Box>
                </Box>
              </>
            ) : (
              /* Lyrics View */
              <Box 
                sx={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'auto',
                  p: { xs: 2, sm: 4 },
                  zIndex: 1
                }}
              >
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  height: '100%',
                }}>
                  {/* Song info on the side */}
                  <Box sx={{ 
                    p: 2, 
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '30%'
                  }}>
                    <Box
                      sx={{
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                        mb: 3,
                        transition: 'all 0.3s ease',
                        animation: 'rotateAlbum 15s linear infinite',
                        animationPlayState: isPlaying ? 'running' : 'paused', 
                        '@keyframes rotateAlbum': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        }
                      }}
                    >
                      <Avatar
                        variant="circular"
                        src={albumArt}
                        alt={currentTrack.Name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        fontWeight: 700,
                        textAlign: 'center',
                        mb: 1
                      }}
                    >
                      {currentTrack.Name}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      component="div" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        textAlign: 'center',
                        mb: 2
                      }}
                    >
                      {currentTrack.AlbumArtist || currentTrack.ArtistItems?.[0]?.Name || 'Unknown Artist'}
                    </Typography>
                    
                    <Chip 
                      label={isPlaying ? 'Now Playing' : 'Paused'} 
                      size="small" 
                      sx={{ 
                        bgcolor: isPlaying ? '#1DB954' : 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem'
                      }} 
                    />
                  </Box>
                  
                  {/* Only show song info on mobile */}
                  <Box sx={{ 
                    p: 2, 
                    display: { xs: 'flex', md: 'none' },
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    mb: 2
                  }}>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        fontWeight: 700,
                        textAlign: 'center',
                        mb: 1
                      }}
                    >
                      {currentTrack.Name}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      component="div" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        textAlign: 'center',
                        mb: 1
                      }}
                    >
                      {currentTrack.AlbumArtist || currentTrack.ArtistItems?.[0]?.Name || 'Unknown Artist'}
                    </Typography>
                  </Box>
                  
                  {/* Lyrics Content */}
                  <Box sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: { xs: 1, sm: 3, md: 4 },
                    maxHeight: { xs: 'calc(100vh - 220px)', md: '100%' },
                    overflow: 'auto',
                    position: 'relative',
                    backdropFilter: 'blur(5px)',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.2)',
                  }}>
                    {loadingLyrics ? (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%'
                      }}>
                        <CircularProgress 
                          color="primary" 
                          size={50}
                          thickness={4}
                          sx={{
                            color: '#1DB954',
                            mb: 2,
                            animation: 'pulse 2s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 0.6, transform: 'scale(0.95)' },
                              '50%': { opacity: 1, transform: 'scale(1.05)' },
                              '100%': { opacity: 0.6, transform: 'scale(0.95)' }
                            }
                          }}
                        />
                        <Typography color="text.secondary">
                          Loading lyrics...
                        </Typography>
                      </Box>
                    ) : lyrics && lyrics.lyrics ? (
                      <Box
                        sx={{
                          maxWidth: '800px',
                          width: '100%',
                          mx: 'auto',
                          animation: 'fadeIn 1s ease-in-out',
                          '@keyframes fadeIn': {
                            '0%': { opacity: 0, transform: 'translateY(20px)' },
                            '100%': { opacity: 1, transform: 'translateY(0)' }
                          }
                        }}
                      >
                        <Typography
                          variant="body1"
                          component="div"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: '"Circular", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            lineHeight: 1.8,
                            fontSize: { xs: '1.1rem', md: '1.25rem' },
                            fontWeight: 400,
                            textAlign: 'center',
                            '& p, & div': {
                              mb: 2
                            },
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                          }}
                        >
                          {lyrics.lyrics}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        maxWidth: '400px',
                        mx: 'auto'
                      }}>
                        <Typography 
                          variant="h6" 
                          color="text.secondary"
                          sx={{ 
                            mb: 2,
                            opacity: 0.7
                          }}
                        >
                          No lyrics available for this song
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ opacity: 0.5 }}
                        >
                          Lyrics may not be available for instrumental tracks or songs that haven't had lyrics added to the database yet.
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Playback controls for lyrics view */}
                    <Paper
                      elevation={10}
                      sx={{ 
                        position: 'fixed',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: { xs: '90%', sm: '80%', md: '60%' },
                        maxWidth: '600px',
                        bgcolor: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                        '&:hover': {
                          boxShadow: '0 10px 30px rgba(29, 185, 84, 0.15)'
                        },
                        transition: 'box-shadow 0.3s ease'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          variant="rounded"
                          src={albumArt}
                          alt={currentTrack.Name}
                          sx={{ width: 40, height: 40, mr: 1.5 }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap fontWeight={600}>
                            {currentTrack.Name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {currentTrack.AlbumArtist || currentTrack.ArtistItems?.[0]?.Name}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                          onClick={playPrevious}
                          sx={{ 
                            color: 'white', 
                            p: 1,
                            '&:hover': {
                              color: '#1DB954',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <PreviousIcon />
                        </IconButton>
                        <IconButton
                          onClick={togglePlay}
                          sx={{ 
                            bgcolor: 'white', 
                            color: 'black',
                            mx: 1,
                            '&:hover': {
                              bgcolor: '#1DB954',
                              transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </IconButton>
                        <IconButton
                          onClick={playNext}
                          sx={{ 
                            color: 'white', 
                            p: 1,
                            '&:hover': {
                              color: '#1DB954',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <NextIcon />
                        </IconButton>
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Fade>
      </Backdrop>
      
      {/* Add Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ 
            width: '100%',
            backgroundColor: snackbarSeverity === 'success' ? '#1DB954' : undefined,
            color: snackbarSeverity === 'success' ? 'white' : undefined
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Portal>
  );
};

export default FullScreenPlayer; 