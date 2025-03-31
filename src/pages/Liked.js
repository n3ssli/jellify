import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Button,
  alpha,
  Avatar
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Shuffle as ShuffleIcon,
  Search as SearchIcon,
  List as ListIcon,
  Favorite as HeartIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import TrackList from '../components/TrackList'
import ColorThief from 'colorthief'

// Helper function to generate random color
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 35%)`;
};

const Liked = () => {
  const { getFavorites, isInitialized, connectionStatus, getImageUrl } = useJellyfin()
  const { playTrack, toggleShuffle } = usePlayer()
  
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dominantColor, setDominantColor] = useState('#5a33a0')
  const [scrolled, setScrolled] = useState(false)
  
  // Reference to the TrackList component to control search visibility
  const trackListRef = useRef(null)
  
  // Add scroll event listener to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 100)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Fetch liked songs
  useEffect(() => {
    const fetchLikedSongs = async () => {
      if (!isInitialized || connectionStatus !== 'connected') return
      
      setLoading(true)
      setError(null)
      
      try {
        const favorites = await getFavorites()
        setTracks(favorites || [])
      } catch (err) {
        console.error('Error fetching liked songs:', err)
        setError('Failed to load your liked songs. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchLikedSongs()
  }, [getFavorites, isInitialized, connectionStatus])
  
  // Extract color from first track if available
  useEffect(() => {
    if (tracks.length === 0) return;
    
    // Use the first track's image for the color extraction
    const imageUrl = getImageUrl(tracks[0].Id);
    if (!imageUrl) return;
    
    const img = new Image();
    const colorThief = new ColorThief();
    
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const color = colorThief.getColor(img);
        setDominantColor(`rgb(${color[0]}, ${color[1]}, ${color[2]})`);
      } catch (error) {
        console.error('Error extracting color:', error);
        setDominantColor('#5a33a0'); // Default purple color
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for color extraction');
      setDominantColor('#5a33a0'); // Default purple color
    };
    
    img.src = imageUrl;
  }, [tracks, getImageUrl]);
  
  // Handle search button click by triggering TrackList search
  const handleSearchClick = () => {
    if (trackListRef.current) {
      trackListRef.current.toggleSearch();
    }
  }
  
  // Play all liked songs
  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks, true)
    }
  }
  
  // Play all liked songs in shuffle mode
  const handleShuffle = () => {
    if (tracks.length > 0) {
      // Enable shuffle mode first
      toggleShuffle(true);
      
      // Select a random track to start with instead of always the first one
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const randomTrack = tracks[randomIndex];
      
      // Verify the random track is valid
      if (!randomTrack || !randomTrack.Id) {
        console.error('Random track in liked songs is invalid:', randomTrack);
        return;
      }
      
      console.log(`Starting shuffle from random track: ${randomTrack?.Name} (index ${randomIndex})`);
      
      // Play the random track with the full tracks array
      playTrack(randomTrack, tracks, true);
    }
  }
  
  const isLoading = loading || !isInitialized || connectionStatus !== 'connected'
  const isError = error || connectionStatus === 'error'
  const isEmpty = !isLoading && !isError && (!tracks || tracks.length === 0)
  
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      pb: '120px'
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
        gap: 1
      }}></Box>
      
      {/* Header Banner */}
      <Box sx={{ 
        position: 'relative',
        background: `linear-gradient(transparent 0, rgba(0,0,0,.5) 100%), linear-gradient(to bottom, ${dominantColor} 0%, ${alpha(dominantColor, 0.6)} 100%)`,
        pt: scrolled ? 2 : 12,
        pb: 3,
        px: 3,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'center', sm: 'flex-end' },
        transition: 'all 0.3s ease',
        minHeight: scrolled ? 'auto' : 250
      }}>
        {/* Custom gradient heart icon */}
        <Box sx={{
          width: scrolled ? 100 : { xs: 150, sm: 200 },
          height: scrolled ? 100 : { xs: 150, sm: 200 },
          borderRadius: 1,
          mb: { xs: 2, sm: 0 },
          mr: { xs: 0, sm: 3 },
          boxShadow: '0 4px 60px rgba(0,0,0,.5)',
          background: `linear-gradient(135deg, ${dominantColor}, ${alpha(dominantColor, 0.4)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          flexShrink: 0
        }}>
          <HeartIcon sx={{ fontSize: scrolled ? 50 : 90, color: 'white' }} />
        </Box>
        
        {/* Header Text */}
        <Box sx={{ 
          textAlign: { xs: 'center', sm: 'left' },
          width: '100%',
          color: 'white'
        }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              mb: 1,
              fontWeight: 500,
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
            Liked Songs
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
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
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
          <IconButton
            onClick={handlePlayAll}
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
            <PlayIcon sx={{ fontSize: 28 }} />
          </IconButton>

          <IconButton
            onClick={handleShuffle}
            sx={{ 
              color: '#b3b3b3',
              '&:hover': { color: '#fff' }
            }}
          >
            <ShuffleIcon fontSize="large" />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
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
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: 'white'
              }
            }}
          >
            <ListIcon />
          </IconButton>
        </Box>
        
        {/* Content States */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}
        
        {isError && (
          <Alert 
            severity="error" 
            sx={{ my: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                RETRY
              </Button>
            }
          >
            {error || 'Failed to connect to Jellyfin server. Please check your connection.'}
          </Alert>
        )}
        
        {isEmpty && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            p: 5, 
            textAlign: 'center'
          }}>
            <Typography variant="h6">No liked songs found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use the heart icon to save songs you love
            </Typography>
          </Box>
        )}
        
        {/* Tracks List */}
        {!isLoading && !isError && tracks.length > 0 && (
          <TrackList 
            ref={trackListRef}
            tracks={tracks} 
            currentPlaylist={tracks} 
            showAlbum={true}
            showArtist={true}
            showNumber={true}
          />
        )}
      </Box>
    </Box>
  )
}

export default Liked 