import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Skeleton,
  useTheme,
  Alert,
  CircularProgress,
  alpha,
  Chip,
  Container,
  IconButton,
  useMediaQuery,
  Slide,
  Fade,
  Divider,
  Stack,
  Paper
} from '@mui/material'
import { 
  PlayArrow as PlayIcon, 
  Refresh as RefreshIcon, 
  ChevronRight as ChevronRightIcon, 
  AccessTime as RecentIcon,
  LibraryMusic as LibraryIcon,
  Explore as ExploreIcon,
  Add as AddIcon,
  KeyboardArrowRight as ArrowRightIcon,
  QueueMusic as PlaylistIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import PageContainer from '../components/PageContainer'

const Home = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'))
  const scrollContainerRef = useRef(null)
  
  const { 
    getRecentAlbums, 
    getAllGenres,
    getPlaylists,
    getItemsByGenre,
    getAllAlbums,
    getImageUrl, 
    getAlbumItems, 
    connectionStatus,
    isInitialized
  } = useJellyfin()
  
  const { playTrack } = usePlayer()
  
  const [recentAlbums, setRecentAlbums] = useState([])
  const [allPlaylists, setAllPlaylists] = useState([])
  const [genres, setGenres] = useState([])
  const [spotlightAlbums, setSpotlightAlbums] = useState([])
  const [recentlyAddedTracks, setRecentlyAddedTracks] = useState([])
  
  const [loading, setLoading] = useState({
    recentAlbums: true,
    playlists: true,
    genres: true,
    spotlight: true,
    tracks: true
  })
  const [error, setError] = useState(null)
  
  const fetchHomeData = async () => {
    if (connectionStatus !== 'connected' || !isInitialized) {
      return
    }
    
    try {
      setError(null)
      
      setLoading(prev => ({
        ...prev,
        recentAlbums: true,
        playlists: true,
        genres: true,
        spotlight: true
      }))
      
      const [albums, playlists, genresList, allAlbums] = await Promise.all([
        getRecentAlbums(12),
        getPlaylists(),
        getAllGenres(),
        getAllAlbums()
      ])
      
      setRecentAlbums(albums)
      setLoading(prev => ({ ...prev, recentAlbums: false }))
      
      setAllPlaylists(playlists)
      setLoading(prev => ({ ...prev, playlists: false }))
      
      const validGenres = genresList.filter(genre => genre && genre.Name)
      const randomGenres = getRandomItems(validGenres, 15)
      setGenres(randomGenres)
      setLoading(prev => ({ ...prev, genres: false }))
      
      if (allAlbums && allAlbums.length > 0) {
        const randomAlbums = getRandomItems(allAlbums, 6)
        setSpotlightAlbums(randomAlbums)
      }
      setLoading(prev => ({ ...prev, spotlight: false }))
      
      if (albums && albums.length > 0) {
        try {
          const randomAlbum = getRandomItems(albums, 1)[0]
          if (randomAlbum) {
            const tracks = await getAlbumItems(randomAlbum.Id)
            setRecentlyAddedTracks(tracks.slice(0, 5))
          }
        } catch (error) {
          console.error('Error fetching recent tracks:', error)
        }
      }
      setLoading(prev => ({ ...prev, tracks: false }))
      
    } catch (error) {
      console.error('Error fetching home data:', error)
      setError('Failed to load home content. Please try again.')
      
      setLoading({
        recentAlbums: false,
        playlists: false,
        genres: false,
        spotlight: false,
        tracks: false
      })
    }
  }
  
  const getRandomItems = (items, count) => {
    if (!items || items.length === 0) return []
    if (items.length <= count) return [...items]
    
    const shuffled = [...items].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }
  
  useEffect(() => {
    fetchHomeData()
  }, [connectionStatus, isInitialized])
  
  const handleAlbumPlay = async (album, event) => {
    if (event) event.stopPropagation()
    
    try {
      const tracks = await getAlbumItems(album.Id)
      if (tracks && tracks.length > 0) {
        playTrack(tracks[0], tracks)
      } else {
        setError('No tracks found in this album')
      }
    } catch (error) {
      console.error('Error playing album:', error)
      setError('Failed to play album. Please try again.')
    }
  }
  
  const handleCardClick = (type, item) => {
    if (type === 'album') {
      navigate(`/album/${item.Id}`)
    } else if (type === 'playlist') {
      navigate(`/playlist/${item.Id}`)
    } else if (type === 'genre') {
      navigate(`/search?genre=${item.Name}`)
    } else if (type === 'track') {
      playTrack(item)
    }
  }
  
  // Helper for time-based greeting
  const getTimeBasedGreeting = () => {
    const hours = new Date().getHours()
    if (hours < 12) return "Good Morning"
    if (hours < 18) return "Good Afternoon"
    return "Good Evening"
  }
  
  // Render album cards for horizontal scrolling
  const renderHorizontalAlbumCards = (albums, loading = false) => {
    if (loading) {
      return Array(6).fill(0).map((_, index) => (
        <Box
          key={`album-skeleton-${index}`}
          sx={{
            minWidth: isSmallScreen ? 150 : 180,
            maxWidth: isSmallScreen ? 150 : 180,
            mr: 2,
            flexShrink: 0
          }}
        >
          <Skeleton
            variant="rectangular"
            sx={{
              width: '100%',
              height: isSmallScreen ? 150 : 180,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.common.white, 0.05)
            }}
          />
          <Skeleton
            variant="text"
            width="70%"
            sx={{
              mt: 1,
              backgroundColor: alpha(theme.palette.common.white, 0.1)
            }}
          />
          <Skeleton
            variant="text"
            width="50%"
            sx={{
              backgroundColor: alpha(theme.palette.common.white, 0.07)
            }}
          />
        </Box>
      ))
    }
    
    if (!albums || albums.length === 0) {
      return (
        <Box sx={{ p: 3, width: '100%', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No albums found
          </Typography>
        </Box>
      )
    }
    
    return albums.map((album) => (
        <Card 
        key={album.Id}
        onClick={() => handleCardClick('album', album)}
          sx={{ 
          minWidth: isSmallScreen ? 150 : 180,
          maxWidth: isSmallScreen ? 150 : 180,
          mr: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.2),
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'transparent',
            cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: theme.shadows[8],
            backgroundColor: alpha(theme.palette.background.paper, 0.4),
            borderColor: alpha(theme.palette.primary.main, 0.3),
            '& .play-button': {
              opacity: 1,
              transform: 'translateY(0) scale(1)'
            }
            }
          }}
        >
        <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              image={getImageUrl(album.Id, 'Primary', 300, 'album')}
              alt={album.Name}
              sx={{ 
              aspectRatio: '1/1',
              objectFit: 'cover',
              backgroundColor: alpha(theme.palette.common.black, 0.2)
              }}
            />
            <Box
              className="play-button"
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                opacity: 0,
              transform: 'translateY(8px) scale(0.8)',
                transition: 'all 0.3s ease',
                zIndex: 2
              }}
            onClick={(e) => handleAlbumPlay(album, e)}
          >
            <IconButton
              size="medium"
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: '#fff',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                  transform: 'scale(1.05)'
                }
                }}
              >
                <PlayIcon />
            </IconButton>
          </Box>
        </Box>
        <CardContent sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            noWrap
            title={album.Name}
          >
              {album.Name}
            </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ opacity: 0.7 }}
            noWrap
          >
              {album.AlbumArtist || 'Unknown Artist'}
            </Typography>
          </CardContent>
        </Card>
    ))
  }
  
  // Render playlists for horizontal scrolling
  const renderHorizontalPlaylists = (playlists, loading = false) => {
    if (loading) {
      return Array(6).fill(0).map((_, index) => (
        <Box
          key={`playlist-skeleton-${index}`}
          sx={{
            minWidth: isSmallScreen ? 150 : 180,
            maxWidth: isSmallScreen ? 150 : 180,
            mr: 2,
            flexShrink: 0
          }}
        >
          <Skeleton
            variant="rectangular"
            sx={{
              width: '100%',
              height: isSmallScreen ? 150 : 180,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.common.white, 0.05)
            }}
          />
          <Skeleton
            variant="text"
            width="70%"
            sx={{
              mt: 1,
              backgroundColor: alpha(theme.palette.common.white, 0.1)
            }}
          />
        </Box>
      ))
    }
    
    if (!playlists || playlists.length === 0) {
      return (
        <Box sx={{ p: 3, width: '100%', textAlign: 'center', flexShrink: 0 }}>
          <Typography variant="body2" color="text.secondary">
            No playlists found
          </Typography>
        </Box>
      )
    }
    
    return playlists.map((playlist) => (
      <Card
        key={playlist.Id}
        onClick={() => handleCardClick('playlist', playlist)}
        sx={{
          minWidth: isSmallScreen ? 150 : 180,
          maxWidth: isSmallScreen ? 150 : 180,
          mr: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.2),
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'transparent',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: theme.shadows[8],
            backgroundColor: alpha(theme.palette.background.paper, 0.4),
            borderColor: alpha(theme.palette.primary.main, 0.3)
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={getImageUrl(playlist.Id)}
            alt={playlist.Name}
            sx={{
              aspectRatio: '1/1',
              objectFit: 'cover',
              backgroundColor: alpha(theme.palette.common.black, 0.2)
            }}
          />
        </Box>
        <CardContent sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            noWrap
            title={playlist.Name}
          >
            {playlist.Name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ opacity: 0.7 }}
          >
            Playlist
          </Typography>
          </CardContent>
        </Card>
    ))
  }
  
  // Render genre chips
  const renderGenreChips = (genres, loading = false) => {
    if (loading) {
      return Array(8).fill(0).map((_, index) => (
        <Skeleton
          key={`genre-skeleton-${index}`}
          variant="rectangular"
          width={index % 2 === 0 ? 120 : 80}
          height={32}
          sx={{
            mr: 1,
            mb: 1,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.common.white, 0.05)
          }}
        />
      ))
    }
    
    if (!genres || genres.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No genres found
        </Typography>
      )
    }
    
    return genres.map((genre) => (
      <Chip
        key={genre.Id}
        label={genre.Name}
        onClick={() => handleCardClick('genre', genre)}
        sx={{
          mr: 1,
          mb: 1,
          backgroundColor: alpha(theme.palette.primary.main, 0.15),
          color: theme.palette.text.primary,
          borderRadius: '16px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.3),
            transform: 'translateY(-2px)'
          }
        }}
      />
    ))
  }
  
  // Render recently added tracks
  const renderRecentTracks = (tracks, loading = false) => {
    if (loading) {
      return Array(5).fill(0).map((_, index) => (
        <Box
          key={`track-skeleton-${index}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: 1,
            px: 2,
            mb: 1,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.common.white, 0.02)
          }}
        >
          <Skeleton
            variant="circular"
            width={40}
            height={40}
            sx={{ mr: 2, backgroundColor: alpha(theme.palette.common.white, 0.05) }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton
              variant="text"
              width="60%"
              sx={{ backgroundColor: alpha(theme.palette.common.white, 0.1) }}
            />
            <Skeleton
              variant="text"
              width="40%"
              sx={{ backgroundColor: alpha(theme.palette.common.white, 0.07) }}
            />
          </Box>
        </Box>
      ))
    }
    
    if (!tracks || tracks.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No recent tracks found
        </Typography>
      )
    }
    
    return tracks.map((track, index) => (
      <Paper
        key={track.Id}
        onClick={() => handleCardClick('track', track)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 2,
          mb: 1,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.15),
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.background.paper, 0.3),
            transform: 'translateX(4px)'
          }
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            minWidth: 40,
            borderRadius: '8px',
            overflow: 'hidden',
            mr: 2,
            position: 'relative'
          }}
        >
          <CardMedia
            component="img"
            image={getImageUrl(track.AlbumId || track.Id, 'Primary', 300, 'album')}
            alt={track.Name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
              opacity: 0,
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 1
              }
            }}
          >
            <PlayIcon fontSize="small" />
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {track.Name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {track.AlbumArtist || track.Artists?.[0] || 'Unknown Artist'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          {formatDuration(track.RunTimeTicks)}
        </Typography>
      </Paper>
    ))
  }
  
  // Format duration from ticks to mm:ss
  const formatDuration = (ticks) => {
    if (!ticks) return '0:00'
    const seconds = Math.floor(ticks / 10000000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  // Horizontal scroll button handler
  const handleScrollRight = (containerId) => {
    const container = document.getElementById(containerId)
    if (container) {
      container.scrollBy({
        left: 300,
        behavior: 'smooth'
      })
    }
  }
  
  // Show connecting state if not connected yet
  if (connectionStatus !== 'connected' || !isInitialized) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '80vh'
      }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Connecting to Jellyfin Server...
        </Typography>
        <Box sx={{ mt: 2 }}>
          <CircularProgress />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Please wait while we connect to your Jellyfin server
        </Typography>
      </Box>
    )
  }
  
  // Handle server connection issues
  if (connectionStatus === 'error') {
    return (
      <PageContainer>
        <Alert 
          severity="warning" 
          action={
            <Button
              color="inherit"
              size="small"
              onClick={fetchHomeData}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Could not connect to Jellyfin server. Check your connection.
        </Alert>
        <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 4 }}>
          {getTimeBasedGreeting()}
        </Typography>
      </PageContainer>
    )
  }
  
  return (
    <PageContainer>
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
      {error && (
        <Alert 
          severity="error" 
          action={
            <Button
              color="inherit"
              size="small"
                onClick={fetchHomeData}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
            sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}
      
        {/* Greeting Section with animation */}
        <Fade in={true} timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              fontWeight={800} 
              sx={{ 
                mb: 1,
                background: 'linear-gradient(90deg, #fff, #aaa)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textFillColor: 'transparent'
              }}
            >
              {getTimeBasedGreeting()}
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ opacity: 0.8 }}
            >
              What would you like to listen to today?
      </Typography>
          </Box>
        </Fade>
        
        {/* Recently Added Albums Section */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <RecentIcon 
                sx={{ 
                  mr: 1, 
                  color: theme.palette.primary.main,
                  opacity: 0.8
                }} 
              />
              <Typography variant="h6" fontWeight={700}>
          Recently Added
        </Typography>
            </Box>
            <Button 
              onClick={() => navigate('/library')}
              endIcon={<ChevronRightIcon />}
              sx={{ 
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.text.primary
                }
              }}
            >
              See All
            </Button>
          </Box>
          
          <Box 
            id="recent-albums-container"
            sx={{ 
              display: 'flex',
              overflowX: 'auto',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: alpha(theme.palette.common.white, 0.05),
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(theme.palette.common.white, 0.2),
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.3),
                }
              }
            }}
          >
            {renderHorizontalAlbumCards(recentAlbums, loading.recentAlbums)}
          </Box>
        </Box>
        
        {/* Your Playlists Section */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PlaylistIcon 
                sx={{ 
                  mr: 1, 
                  color: theme.palette.primary.main,
                  opacity: 0.8
                }} 
              />
              <Typography variant="h6" fontWeight={700}>
                Your Playlists
              </Typography>
            </Box>
            <Button 
              onClick={() => navigate('/library?tab=1')} // Navigate to Library with Playlists tab selected
              endIcon={<ChevronRightIcon />}
              sx={{ 
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.text.primary
                }
              }}
            >
              See All
            </Button>
          </Box>
          
          <Box 
            id="playlists-container"
            sx={{ 
              display: 'flex',
              overflowX: 'auto',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: alpha(theme.palette.common.white, 0.05),
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(theme.palette.common.white, 0.2),
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.3),
                }
              }
            }}
          >
            {renderHorizontalPlaylists(allPlaylists, loading.playlists)}
          </Box>
        </Box>
        
        {/* Browse Genres Section */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ExploreIcon 
                sx={{ 
                  mr: 1, 
                  color: theme.palette.primary.main,
                  opacity: 0.8
                }} 
              />
              <Typography variant="h6" fontWeight={700}>
                Browse Genres
              </Typography>
            </Box>
            <Button 
              onClick={() => navigate('/search')}
              endIcon={<ChevronRightIcon />}
              sx={{ 
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.text.primary
                }
              }}
            >
              See All
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
            {renderGenreChips(genres, loading.genres)}
          </Box>
        </Box>
        
        {/* Spotlight Albums Section */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} md={7}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LibraryIcon 
                  sx={{ 
                    mr: 1, 
                    color: theme.palette.primary.main,
                    opacity: 0.8
                  }} 
                />
                <Typography variant="h6" fontWeight={700}>
                  Spotlight Albums
                  </Typography>
                </Box>
            </Box>
            
            <Grid container spacing={2}>
              {loading.spotlight ? (
                Array(4).fill(0).map((_, index) => (
                  <Grid item xs={6} sm={4} key={`spotlight-skeleton-${index}`}>
                    <Skeleton
                      variant="rectangular"
                      sx={{
                        width: '100%',
                        height: 0,
                        paddingBottom: '100%',
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.common.white, 0.05)
                      }}
                    />
                    <Skeleton
                      variant="text"
                      width="70%"
                      sx={{
                        mt: 1,
                        backgroundColor: alpha(theme.palette.common.white, 0.1)
                      }}
                    />
                    <Skeleton
                      variant="text"
                      width="50%"
                      sx={{
                        backgroundColor: alpha(theme.palette.common.white, 0.07)
                      }}
                    />
                  </Grid>
                ))
              ) : (
                spotlightAlbums.slice(0, 6).map((album) => (
                  <Grid item xs={6} sm={4} key={album.Id}>
                    <Card
                      onClick={() => handleCardClick('album', album)}
                      sx={{
                        height: '100%',
                        backgroundColor: alpha(theme.palette.background.paper, 0.2),
                        borderRadius: 2,
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        border: '1px solid',
                        borderColor: 'transparent',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: theme.shadows[6],
                          backgroundColor: alpha(theme.palette.background.paper, 0.4),
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          '& .play-button': {
                            opacity: 1,
                            transform: 'translateY(0) scale(1)'
                          }
                        }
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          image={getImageUrl(album.Id, 'Primary', 300, 'album')}
                          alt={album.Name}
                          sx={{
                            aspectRatio: '1/1',
                            objectFit: 'cover',
                            backgroundColor: alpha(theme.palette.common.black, 0.2)
                          }}
                        />
                        <Box
                          className="play-button"
                          sx={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            opacity: 0,
                            transform: 'translateY(8px) scale(0.8)',
                            transition: 'all 0.3s ease',
                            zIndex: 2
                          }}
                          onClick={(e) => handleAlbumPlay(album, e)}
                        >
                          <IconButton
                            size="small"
                            sx={{
                              backgroundColor: theme.palette.primary.main,
                              color: '#fff',
                              '&:hover': {
                                backgroundColor: theme.palette.primary.dark,
                                transform: 'scale(1.05)'
                              }
                            }}
                          >
                            <PlayIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          noWrap
                          title={album.Name}
                        >
                          {album.Name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ opacity: 0.7 }}
                          noWrap
                        >
                          {album.AlbumArtist || 'Unknown Artist'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Grid>
          
          {/* Recently Added Tracks Section */}
          <Grid item xs={12} md={5}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <RecentIcon 
                  sx={{ 
                    mr: 1, 
                    color: theme.palette.primary.main,
                    opacity: 0.8
                  }} 
                />
                <Typography variant="h6" fontWeight={700}>
                  Recently Added Songs
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ height: '100%' }}>
              {renderRecentTracks(recentlyAddedTracks, loading.tracks)}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  )
}

export default Home 