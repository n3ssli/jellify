import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Grid,
  Skeleton,
  CircularProgress,
  Alert,
  Divider,
  alpha,
  Button,
  Tooltip,
  Stack
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Shuffle as ShuffleIcon,
  MoreHoriz as MoreIcon,
  ArrowBackIosNew as BackIcon,
  ArrowForwardIos as ForwardIcon,
  VerifiedUser as VerifiedIcon,
  Add as AddIcon,
  Info as InfoIcon,
  MusicNote as MusicNoteIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import TrackList from '../components/TrackList'
import AlbumCard from '../components/AlbumCard'
import ColorThief from 'colorthief'

// Helper function to generate random color
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 35%)`;
};

// Helper to get tracks from all artist albums
const getArtistTracks = (albums, albumTracks) => {
  if (!albums || !albumTracks || albums.length === 0) return [];
  
  const allTracks = [];
  // Collect all tracks from all albums
  albums.forEach(album => {
    const tracks = albumTracks[album.Id] || [];
    tracks.forEach(track => {
      allTracks.push({
        ...track,
        AlbumId: album.Id,
        AlbumName: album.Name
      });
    });
  });
  
  return allTracks;
};

// Helper to get random tracks from all artist albums
const getRandomTracks = (albums, albumTracks, count = 5) => {
  const allTracks = getArtistTracks(albums, albumTracks);
  
  // Shuffle and take first 'count' tracks
  if (allTracks.length === 0) return [];
  
  const shuffled = [...allTracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const Artist = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getArtist, getArtistAlbums, getImageUrl, getAlbumItems, connectionStatus, isInitialized } = useJellyfin()
  const { currentTrack, isPlaying, playTrack, pause, toggleShuffle } = usePlayer()
  
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [albumTracks, setAlbumTracks] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dominantColor, setDominantColor] = useState(getRandomColor())
  const [scrolled, setScrolled] = useState(false)
  const [following, setFollowing] = useState(false)
  const [showMore, setShowMore] = useState(false)
  
  // Generate random listener count for UI
  const monthlyListeners = useMemo(() => {
    const base = Math.floor(Math.random() * 900000) + 100000;
    return base.toLocaleString();
  }, []);
  
  // Random tracks from artist's albums
  const randomTracks = useMemo(() => {
    return getRandomTracks(albums, albumTracks, 5);
  }, [albums, albumTracks]);
  
  // Fetch artist details and albums
  useEffect(() => {
    const fetchData = async () => {
      if (!isInitialized || connectionStatus !== 'connected') {
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // Get artist details
        const artistData = await getArtist(id)
        setArtist(artistData)
        
        // Get artist albums
        const albumsData = await getArtistAlbums(id)
        setAlbums(albumsData)
        
        // Get tracks for each album
        const tracks = {};
        for (const album of albumsData) {
          const albumTracks = await getAlbumItems(album.Id);
          tracks[album.Id] = albumTracks;
        }
        setAlbumTracks(tracks);
      } catch (error) {
        console.error('Error fetching artist data:', error)
        setError('Failed to load artist data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
      fetchData()
    }
  }, [id, getArtist, getArtistAlbums, getAlbumItems, connectionStatus, isInitialized])
  
  // Extract dominant color from artist image
  useEffect(() => {
    if (!artist || loading) return;
    
    const imageUrl = getImageUrl(artist.Id);
    if (!imageUrl) {
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
    
    img.src = imageUrl;
  }, [artist, getImageUrl, loading]);
  
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
  
  // Check if any track from this artist is currently playing
  const isArtistPlaying = currentTrack && 
    randomTracks.some(track => track.Id === currentTrack.Id) && isPlaying
  
  // Handle play all tracks by artist
  const handlePlayAll = () => {
    if (randomTracks.length === 0) return;
    
    if (isArtistPlaying) {
      pause();
    } else {
      // Play a random track from this artist's albums
      const randomIndex = Math.floor(Math.random() * randomTracks.length);
      playTrack(randomTracks[randomIndex], randomTracks);
    }
  };
  
  // Handle follow/unfollow artist
  const handleFollowToggle = () => {
    setFollowing(prev => !prev)
    // In a real app, this would call an API to follow/unfollow
  }
  
  // Handle shuffle play
  const handleShufflePlay = () => {
    if (randomTracks.length === 0) return
    
    const shuffledTracks = toggleShuffle() || [...randomTracks].sort(() => 0.5 - Math.random())
    playTrack(shuffledTracks[0], shuffledTracks)
  }
  
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
          height: 250, 
          background: 'linear-gradient(transparent 0, rgba(0,0,0,.5) 100%), linear-gradient(to right bottom, #4285f4, #34a853)',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          p: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Skeleton variant="circular" 
              sx={{ 
                width: 200, 
                height: 200, 
                mr: 3, 
                boxShadow: '0 4px 60px rgba(0,0,0,.5)'
              }} 
            />
            <Box sx={{ pb: 2 }}>
              <Skeleton variant="text" width={80} sx={{ mb: 1 }} />
              <Skeleton variant="text" width={250} height={50} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={180} sx={{ mb: 2 }} />
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" width={200} height={48} sx={{ mb: 3, borderRadius: 50 }} />
          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            <Skeleton width={120} />
          </Typography>
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item key={i} xs={6} sm={4} md={3} lg={2}>
                <Skeleton variant="rectangular" sx={{ paddingTop: '100%', borderRadius: 1 }} />
                <Skeleton width="80%" sx={{ mt: 1 }} />
                <Skeleton width="60%" />
              </Grid>
            ))}
          </Grid>
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
        <IconButton 
          color="primary"
          onClick={handleRetry}
          sx={{ borderRadius: 50, bgcolor: 'rgba(255,255,255,0.1)' }}
        >
          <BackIcon />
        </IconButton>
      </Box>
    )
  }
  
  // If artist doesn't exist
  if (!artist) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Artist not found</Typography>
      </Box>
    )
  }
  
  // Check if we have an image for the artist
  const hasImage = getImageUrl(artist.Id) !== null && getImageUrl(artist.Id) !== '';
  
  return (
    <Box sx={{ 
      pb: '120px',
      width: '100%', 
      ml: 0, // Remove any left margin
      overflow: 'hidden', // Prevent horizontal scrolling
      position: 'relative' // Ensure proper positioning
    }}>
      {/* Navigation buttons */}
      <Box sx={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 10, 
        p: 2,
        display: 'flex',
        alignItems: 'center',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        backgroundColor: scrolled ? alpha('#121212', 0.7) : 'transparent',
        transition: 'background-color 0.3s ease',
        gap: 1,
        width: '100%', // Full width
        left: 0 // Align to the left
      }}>
        <IconButton 
          onClick={() => navigate(-1)}
          size="small"
          sx={{ 
            bgcolor: alpha('#000', 0.6),
            color: '#fff',
            '&:hover': { bgcolor: alpha('#000', 0.8) }
          }}
        >
          <BackIcon fontSize="small" />
        </IconButton>
        <IconButton 
          onClick={() => navigate(1)}
          size="small"
          sx={{ 
            bgcolor: alpha('#000', 0.6),
            color: '#fff',
            '&:hover': { bgcolor: alpha('#000', 0.8) }
          }}
        >
          <ForwardIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {/* Artist header */}
      <Box sx={{ 
        background: hasImage 
          ? `url(${getImageUrl(artist.Id, 'Primary', 1200)})` 
          : `linear-gradient(to right bottom, ${dominantColor}, ${alpha(dominantColor, 0.6)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        position: 'relative',
        pt: { xs: 15, sm: 20 },
        pb: 3,
        px: 3,
        width: '100%', // Full width
        left: 0, // Align to the left
        m: 0, // No margin
        boxSizing: 'border-box', // Include padding in width calculation
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.5) 70%, #121212 100%)',
          zIndex: 0
        }
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar
              src={getImageUrl(artist.Id, 'Primary', 48)}
              sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: '#1DB954',
                mr: 1 
              }}
            >
              <VerifiedIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Typography variant="subtitle2" sx={{ color: '#fff' }}>
              Verified Artist
            </Typography>
          </Box>
          
          <Typography 
            variant="h1" 
            component="h1" 
            fontWeight={900} 
            sx={{ 
              mb: 1,
              fontSize: { xs: '3rem', sm: '5rem', md: '7rem' },
              lineHeight: 1.1,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {artist.Name}
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 2,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.8)'
            }}
          >
            {monthlyListeners} monthly listeners
          </Typography>
        </Box>
      </Box>
      
      {/* Actions bar */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        bgcolor: alpha('#121212', 0.9),
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        width: '100%', // Full width
        boxSizing: 'border-box', // Include padding in width
        left: 0 // Align to the left
      }}>
        <IconButton
          onClick={handlePlayAll}
          sx={{ 
            bgcolor: '#1DB954',
            color: '#000',
            width: 56,
            height: 56,
            mr: 2,
            '&:hover': {
              bgcolor: '#1ed760'
            },
            boxShadow: '0 8px 16px rgba(0,0,0,.3)'
          }}
        >
          {isArtistPlaying ? <PauseIcon sx={{ fontSize: 28 }} /> : <PlayIcon sx={{ fontSize: 28 }} />}
        </IconButton>
        
        <IconButton
          sx={{ 
            color: '#b3b3b3',
            '&:hover': { color: '#fff' }
          }}
        >
          <MoreIcon />
        </IconButton>
      </Box>
      
      {/* Main content */}
      <Box sx={{ 
        px: 3, 
        pt: 4, 
        bgcolor: '#121212',
        width: '100%', // Full width
        boxSizing: 'border-box', // Include padding in width
        left: 0 // Align to the left
      }}>
        {/* Popular tracks section */}
        <Box sx={{ mb: 6, minHeight: '200px' }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
            Popular
          </Typography>
          
          {randomTracks.length > 0 ? (
            <TrackList 
              tracks={randomTracks} 
              showNumber={true}
              showHeader={false}
              showAlbum={true}
              limit={5}
            />
          ) : (
            <Typography variant="body1" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
              No tracks available for this artist
            </Typography>
          )}
        </Box>
        
        {/* Discography section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
            Discography
          </Typography>
          
          {albums.length > 0 ? (
            <Grid container spacing={2}>
              {albums.map(album => (
                <Grid item key={album.Id} xs={6} sm={4} md={3} lg={2}>
                  <Box 
                    onClick={() => navigate(`/album/${album.Id}`)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        opacity: 0.8,
                        transform: 'scale(1.02)',
                        transition: 'all 0.2s ease'
                      }
                    }}
                  >
                    <Avatar
                      variant="square"
                      src={getImageUrl(album.Id, 'Primary', 300, 'album')}
                      alt={album.Name}
                      sx={{
                        width: '100%',
                        height: 0,
                        paddingTop: '100%',
                        position: 'relative',
                        borderRadius: 1,
                        bgcolor: alpha(dominantColor, 0.3),
                      }}
                    >
                      <MusicNoteIcon />
                    </Avatar>
                    <Typography variant="body1" fontWeight={600} sx={{ mt: 1, lineHeight: 1.2, color: '#fff' }}>
                      {album.Name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {album.ProductionYear || 'Album'}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
              No albums available for this artist
            </Typography>
          )}
        </Box>
        
        {/* Biography section */}
        {artist.Overview && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={700}>
                About
              </Typography>
              <InfoIcon sx={{ ml: 1, color: 'text.secondary' }} />
            </Box>
            
            <Box 
              sx={{ 
                p: 3, 
                borderRadius: 2, 
                bgcolor: alpha(dominantColor, 0.1),
                maxWidth: { sm: '100%', md: '70%' }
              }}
            >
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitLineClamp: showMore ? 'unset' : 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: artist.Overview.length > 400 && !showMore ? 1 : 0
                }}
              >
                {artist.Overview}
              </Typography>
              
              {artist.Overview.length > 400 && (
                <Button 
                  onClick={() => setShowMore(!showMore)}
                  sx={{ 
                    textTransform: 'none', 
                    color: '#fff',
                    fontWeight: 700,
                    pl: 0
                  }}
                >
                  {showMore ? 'Show less' : 'Show more'}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Artist 