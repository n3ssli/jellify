import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Typography,
  Avatar,
  Skeleton,
  CircularProgress,
  Alert,
  alpha,
  IconButton,
  Stack,
  Button
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Shuffle as ShuffleIcon,
  Search as SearchIcon,
  List as ListIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import TrackList from '../components/TrackList'
import { formatDuration } from '../utils/formatTime'
import ColorThief from 'colorthief'

// Helper function to generate random color
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 35%)`;
};

const Album = () => {
  // Get album ID from URL params
  const { id: albumId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Access Jellyfin and Player contexts
  const { getAlbum, getAlbumItems, getImageUrl, connectionStatus, isInitialized } = useJellyfin()
  const { currentTrack, isPlaying, playTrack, pause, toggleShuffle } = usePlayer()
  
  // Component state
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [dominantColor, setDominantColor] = useState(getRandomColor())
  
  // TrackList reference
  const trackListRef = useRef(null)
  
  // Debug information
  console.log('Album component - Current state:', { 
    albumId,
    path: location.pathname,
    connectionStatus,
    isInitialized,
    loading,
    hasAlbum: Boolean(album),
    trackCount: tracks?.length || 0
  })
  
  // Fetch album data when component mounts or albumId changes
  useEffect(() => {
    const fetchData = async () => {
      if (!isInitialized || connectionStatus !== 'connected' || !albumId) {
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // Get album details directly
        const albumData = await getAlbum(albumId)
        
        if (!albumData) {
          setError('Album not found')
          setLoading(false)
          return
        }
        
        setAlbum(albumData)
        
        // Get album tracks
        const tracksData = await getAlbumItems(albumId)
        setTracks(tracksData || [])
      } catch (error) {
        console.error('Error fetching album:', error)
        setError('Failed to load album. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [albumId, getAlbum, getAlbumItems, connectionStatus, isInitialized])
  
  // Extract dominant color from album cover
  useEffect(() => {
    if (!album || loading) return;
    
    const imageUrl = getImageUrl(album.Id);
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
  }, [album, getImageUrl, loading]);
  
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
  
  // Check if any track from this album is currently playing
  const isAlbumPlaying = currentTrack && tracks.some(track => track.Id === currentTrack.Id) && isPlaying
  
  // Calculate total duration
  const totalDuration = tracks.reduce((acc, track) => acc + (track.RunTimeTicks ? track.RunTimeTicks / 10000000 : 0), 0)
  
  // Handle play button click
  const handlePlayAlbum = () => {
    if (isAlbumPlaying) {
      pause()
    } else if (tracks.length > 0) {
      playTrack(tracks[0], tracks)
    }
  }

  // Handle shuffle button click
  const handleShuffleAlbum = () => {
    if (tracks.length > 0) {
      // Enable shuffle mode first
      toggleShuffle(true);
      
      // Select a random track to start with instead of always the first one
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const randomTrack = tracks[randomIndex];
      
      console.log(`Starting shuffle from random track: ${randomTrack?.Name} (index ${randomIndex})`);
      
      // Play the random track with the full tracks array
      playTrack(randomTrack, tracks, true);
    }
  }
  
  // Handle search button click by triggering TrackList search
  const handleSearchClick = () => {
    if (trackListRef.current) {
      trackListRef.current.toggleSearch();
    }
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
          <TrackList tracks={[]} loading={true} />
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
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.1)', 
            p: 1.5,
            borderRadius: 2,
            mb: 2 
          }}
        >
          <Typography variant="button" sx={{ mx: 1 }}>Retry</Typography>
        </IconButton>
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            Debug info: <br />
            Path: {location.pathname}<br />
            Album ID: {albumId || 'undefined'}<br />
            Connection: {connectionStatus}
          </Typography>
        </Box>
      </Box>
    )
  }
  
  // If album doesn't exist
  if (!album) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Album not found</Typography>
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
      {/* Album header */}
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
          src={getImageUrl(album.Id, 'Primary', 300, 'album')}
          alt={album.Name}
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
          color: 'white'
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
            Album
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
            {album.Name}
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
            {album.AlbumArtist} • {album.ProductionYear} • {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} • {formatDuration(totalDuration)}
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
            onClick={handlePlayAlbum}
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
            {isAlbumPlaying ? <PauseIcon sx={{ fontSize: 28 }} /> : <PlayIcon sx={{ fontSize: 28 }} />}
          </IconButton>

          <IconButton
            onClick={handleShuffleAlbum}
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
          
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {album.ProductionYear}
          </Typography>
          
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
        
        <TrackList 
          ref={trackListRef}
          tracks={tracks} 
          showArtist={false}
          showAlbum={false}
          showNumber={true}
        />
      </Box>
    </Box>
  )
}

export default Album 