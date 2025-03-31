import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Stack,
  Avatar,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material'
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
  FullscreenRounded as FullScreenIcon,
  QueueMusic as QueueMusicIcon,
  Lyrics as LyricsIcon,
  Close as CloseIcon,
  Favorite as LikeIcon,
  FavoriteBorder as LikeOutlineIcon
} from '@mui/icons-material'
import { usePlayer } from '../services/PlayerContext'
import { useJellyfin } from '../services/JellyfinContext'
import { useSidebar } from '../services/SidebarContext'
import { formatTime } from '../utils/formatTime'
import QueueSidebar from './QueueSidebar'
import FullScreenPlayer from './FullScreenPlayer'
import { Fade } from '@mui/material'

const Player = ({ expanded, onToggleExpand }) => {
  const theme = useTheme()
  const { getImageUrl, getLyrics, toggleFavorite, isFavorite } = useJellyfin()
  const { isQueueOpen, toggleQueueSidebar, closeQueueSidebar } = useSidebar()
  
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
  } = playerContextValue
  
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [fullScreenOpen, setFullScreenOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [lyrics, setLyrics] = useState(null)
  const [loadingLyrics, setLoadingLyrics] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')

  useEffect(() => {
    if (currentTrack?.Id) {
      checkFavoriteStatus(currentTrack.Id);
    }
  }, [currentTrack]);

  const checkFavoriteStatus = async (itemId) => {
    try {
      const favorited = await isFavorite(itemId);
      setIsLiked(favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleLike = async () => {
    if (!currentTrack?.Id) return;

    try {
      await toggleFavorite(currentTrack.Id);
      
      const newLikeState = !isLiked;
      setIsLiked(newLikeState);
      
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

  const handleSliderChange = (_, newValue) => {
    setIsSeeking(true)
    setSeekValue(newValue)
  }

  const handleSliderCommit = (_, newValue) => {
    seekTo(newValue)
    setIsSeeking(false)
  }

  const handleVolumeChange = (_, value) => {
    setVolumeLevel(value / 100)
  }

  const handleFullScreenOpen = () => {
    setFullScreenOpen(true)
  }

  const handleFullScreenClose = () => {
    setFullScreenOpen(false)
  }

  const handleLyricsOpen = async () => {
    if (!currentTrack?.Id) return
    
    setLyricsOpen(true)
    setLoadingLyrics(true)
    
    try {
      const lyricsData = await getLyrics(currentTrack.Id)
      setLyrics(lyricsData)
    } catch (error) {
      console.error('Failed to fetch lyrics:', error)
      setLyrics(null)
    } finally {
      setLoadingLyrics(false)
    }
  }

  const handleLyricsClose = () => {
    setLyricsOpen(false)
  }

  if (!currentTrack) {
    return null;
  }

  const VolumeIcon = () => {
    if (muted || volume === 0) return <VolumeOffIcon />
    if (volume < 0.3) return <VolumeMuteIcon />
    if (volume < 0.7) return <VolumeDownIcon />
    return <VolumeUpIcon />
  }

  const validDuration = duration && isFinite(duration) && duration > 0 ? duration : 100
  
  const displayTime = isSeeking ? seekValue : currentTime
  
  const albumArt = currentTrack && currentTrack.Id ? getImageUrl(currentTrack.Id || currentTrack.AlbumId, 'Primary', 300, 'album') : null

  const RepeatButtonIcon = repeat === 'one' ? RepeatOneIcon : RepeatIcon

  return (
    <>
      {!fullScreenOpen && !lyricsOpen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'black', 
            background: 'linear-gradient(rgba(18, 18, 18, 0.6) 0%, rgba(0, 0, 0, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            height: '90px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: theme.zIndex.appBar + 1,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.2)'
          }}
          className="player-container"
        >
          <Box sx={{ px: 2, pt: 1, pb: 0, display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                mr: 1, 
                fontSize: '0.75rem', 
                minWidth: '35px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatTime(displayTime)}
            </Typography>
            
            <Slider
              size="small"
              value={displayTime}
              min={0}
              max={validDuration}
              onChange={handleSliderChange}
              onChangeCommitted={handleSliderCommit}
              aria-label="Time"
              sx={{
                color: theme.palette.primary.main,
                height: 4,
                padding: 0,
                '& .MuiSlider-thumb': {
                  width: 0,
                  height: 0,
                  transition: '0.3s cubic-bezier(0.2, 0, 0.2, 1)',
                  '&:hover, &.Mui-active, &.Mui-focusVisible': {
                    width: 12, 
                    height: 12,
                    boxShadow: `0 0 0 8px ${theme.palette.primary.main}30`
                  }
                },
                '& .MuiSlider-rail': {
                  opacity: 0.3,
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                },
                '& .MuiSlider-track': {
                  border: 'none',
                  bgcolor: theme.palette.primary.main,
                  opacity: 0.8
                },
                '&:hover .MuiSlider-track': {
                  bgcolor: theme.palette.primary.light,
                  opacity: 1
                },
                '&:hover .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  boxShadow: `0 0 0 8px ${theme.palette.primary.main}30`
                }
              }}
            />
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                ml: 1, 
                fontSize: '0.75rem', 
                minWidth: '35px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatTime(validDuration)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            height: '100%', 
            px: 2,
            py: 1
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              width: { xs: '30%', sm: '25%' }, 
              minWidth: 180,
              pr: 2
            }}>
              <Box 
                sx={{ 
                  width: 46, 
                  height: 46, 
                  borderRadius: 1, 
                  mr: 2, 
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 6px 14px rgba(0, 0, 0, 0.3)'
                  }
                }}
              >
                <Avatar
                  variant="rounded" 
                  src={albumArt}
                  alt={currentTrack.Name}
                  sx={{ 
                    width: '100%', 
                    height: '100%',
                    opacity: isPlaying ? 1 : 0.8 
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography 
                    variant="subtitle2" 
                    noWrap 
                    sx={{ 
                      fontWeight: 600,
                      color: 'white',
                      fontSize: '0.95rem'
                    }}
                  >
                    {currentTrack.Name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    noWrap 
                    sx={{ 
                      display: 'block',
                      fontSize: '0.8rem',
                      '&:hover': {
                        color: theme.palette.primary.main,
                        cursor: 'pointer'
                      }
                    }}
                  >
                    {currentTrack.ArtistItems?.[0]?.Name || 'Unknown artist'}
                  </Typography>
                </Box>
                <Tooltip title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}>
                  <IconButton
                    onClick={toggleLike}
                    sx={{ 
                      color: isLiked ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.7)',
                      ml: 1,
                      p: 0.5,
                      '&:hover': {
                        color: isLiked ? theme.palette.primary.light : 'white',
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isLiked ? <LikeIcon fontSize="small" /> : <LikeOutlineIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ flexGrow: 1 }}>
              <Tooltip title={shuffle ? "Shuffle: On" : "Shuffle: Off"}>
                <IconButton
                  onClick={toggleShuffle}
                  sx={{ 
                    color: shuffle ? theme.palette.primary.main : 'text.secondary',
                    '&:hover': {
                      color: shuffle ? theme.palette.primary.light : 'white',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ShuffleIcon />
                </IconButton>
              </Tooltip>
              
              <IconButton
                onClick={playPrevious}
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    color: theme.palette.primary.main,
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
                  p: 0, 
                  bgcolor: 'white', 
                  width: 40, 
                  height: 40,
                  '&:hover': {
                    bgcolor: theme.palette.primary.main,
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {isPlaying ? (
                  <PauseIcon sx={{ color: 'black', fontSize: '1.5rem' }} />
                ) : (
                  <PlayIcon sx={{ color: 'black', fontSize: '1.5rem' }} />
                )}
              </IconButton>
              
              <IconButton
                onClick={playNext}
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    color: theme.palette.primary.main,
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <NextIcon />
              </IconButton>
              
              <Tooltip 
                title={repeat === 'off' 
                  ? "Repeat: Off" 
                  : repeat === 'all' 
                  ? "Repeat: All" 
                  : "Repeat: One"}
              >
                <IconButton
                  onClick={toggleRepeat}
                  sx={{ 
                    color: repeat !== 'off' ? theme.palette.primary.main : 'text.secondary',
                    '&:hover': {
                      color: repeat !== 'off' ? theme.palette.primary.light : 'white',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <RepeatButtonIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center" 
              sx={{ 
                width: { xs: '30%', sm: '25%' }, 
                minWidth: 180, 
                justifyContent: 'flex-end' 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: 140 }}>
                <Tooltip title={muted ? "Unmute" : "Mute"}>
                  <IconButton onClick={toggleMute} sx={{ color: muted ? theme.palette.primary.main : 'white' }}>
                    <VolumeIcon />
                  </IconButton>
                </Tooltip>
                
                <Slider
                  size="small"
                  value={muted ? 0 : Math.round(volume * 100)}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  sx={{
                    mx: 1,
                    width: 80,
                    color: theme.palette.primary.main,
                    height: 4,
                    '& .MuiSlider-thumb': {
                      width: 10,
                      height: 10,
                      transition: '0.1s cubic-bezier(0.2, 0, 0.2, 1)',
                      '&:hover, &.Mui-active, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${theme.palette.primary.main}30`
                      }
                    },
                    '& .MuiSlider-rail': {
                      opacity: 0.3,
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    },
                    '& .MuiSlider-track': {
                      border: 'none',
                    }
                  }}
                />
              </Box>
              
              <Tooltip title="Queue">
                <IconButton
                  color={isQueueOpen ? "primary" : "default"}
                  onClick={toggleQueueSidebar}
                  sx={{ 
                    color: isQueueOpen ? theme.palette.primary.main : 'white',
                    '&:hover': {
                      color: theme.palette.primary.main
                    }
                  }}
                >
                  <QueueMusicIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Lyrics">
                <IconButton
                  onClick={handleLyricsOpen}
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      color: theme.palette.primary.main,
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <LyricsIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Full Screen Player">
                <IconButton
                  onClick={handleFullScreenOpen}
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      color: theme.palette.primary.main
                    }
                  }}
                >
                  <FullScreenIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>
      )}
      
      {lyricsOpen && (
        <Dialog
          open={lyricsOpen}
          onClose={handleLyricsClose}
          fullScreen
          PaperProps={{
            sx: {
              bgcolor: 'transparent',
              color: 'white',
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 20, 0.95) 100%)`,
              backdropFilter: 'blur(20px)',
              overflow: 'auto',
              height: '100vh',
              m: 0
            }
          }}
          TransitionComponent={Fade}
          TransitionProps={{
            timeout: 400
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              background: currentTrack && albumArt ? 
                `linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 100%), url(${albumArt}) no-repeat center/cover` : 
                undefined,
              backgroundAttachment: 'fixed'
            }}
          >
            <Box 
              sx={{ 
                p: 2,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)'
              }}
            >
              <IconButton 
                onClick={handleLyricsClose}
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    color: theme.palette.primary.main,
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <CloseIcon />
              </IconButton>
              
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontSize: '0.9rem'
                }}
              >
                Lyrics
              </Typography>
              
              <Box sx={{ width: 40 }} />
            </Box>
            
            <Box sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              height: '100%',
              overflow: 'auto'
            }}>
              <Box sx={{ 
                p: 4, 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: { xs: '100%', md: '40%' },
                position: 'sticky',
                top: 0
              }}>
                <Box
                  sx={{
                    width: { xs: '200px', sm: '250px', md: '280px' },
                    height: { xs: '200px', sm: '250px', md: '280px' },
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    mb: 3,
                    transition: 'all 0.3s ease',
                    animation: 'float 6s ease-in-out infinite',
                    '@keyframes float': {
                      '0%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-10px)' },
                      '100%': { transform: 'translateY(0px)' }
                    }
                  }}
                >
                  <Avatar
                    variant="square"
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
                  variant="h5" 
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
                  variant="subtitle1" 
                  component="div" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    mb: 4
                  }}
                >
                  {currentTrack.ArtistItems?.[0]?.Name || 'Unknown artist'}
                </Typography>
              </Box>
              
              <Box sx={{ 
                p: { xs: 3, md: 5 },
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflowY: 'auto',
                bgcolor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)'
              }}>
                {loadingLyrics ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100%',
                    width: '100%'
                  }}>
                    <CircularProgress 
                      color="primary" 
                      size={60}
                      thickness={4}
                      sx={{
                        color: theme.palette.primary.main,
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 0.6, transform: 'scale(0.95)' },
                          '50%': { opacity: 1, transform: 'scale(1.05)' },
                          '100%': { opacity: 0.6, transform: 'scale(0.95)' }
                        }
                      }}
                    />
                  </Box>
                ) : lyrics && lyrics.lyrics ? (
                  <Box
                    sx={{
                      maxWidth: '800px',
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
              </Box>
            </Box>
          </Box>
        </Dialog>
      )}
      
      {fullScreenOpen && (
        <FullScreenPlayer
          open={fullScreenOpen}
          onClose={handleFullScreenClose}
          currentTrack={currentTrack}
          albumArt={albumArt}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          playNext={playNext}
          playPrevious={playPrevious}
          currentTime={currentTime}
          duration={validDuration}
          onSeek={seekTo}
        />
      )}
      
      {isQueueOpen && !fullScreenOpen && !lyricsOpen && <QueueSidebar open={isQueueOpen} onClose={closeQueueSidebar} />}
      
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
    </>
  )
}

export default Player 