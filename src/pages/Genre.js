import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Skeleton,
  Alert,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Album as AlbumIcon,
  PlayArrow as PlayArrowIcon,
  Shuffle as ShuffleIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import AlbumCard from '../components/AlbumCard'
import TrackList from '../components/TrackList'

const Genre = () => {
  const theme = useTheme()
  const { genreId: encodedGenreId } = useParams()
  const navigate = useNavigate()
  
  // Decode the genre ID from the URL
  const genreId = decodeURIComponent(encodedGenreId || '');
  
  // Add debugging
  console.log('Genre component mounted with genreId:', genreId, '(original encoded:', encodedGenreId, ')');
  
  const { 
    getItemsByGenre,
    connectionStatus, 
    isInitialized,
    getAllGenres
  } = useJellyfin()
  const { playTracks } = usePlayer()
  
  // State
  const [genreInfo, setGenreInfo] = useState(null)
  const [albums, setAlbums] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingTracks, setLoadingTracks] = useState(false)
  
  // Determine background color for genre header
  const getBgColor = () => {
    const colors = [
      '#1DB954', // Spotify green
      '#E13300', // Red/orange
      '#BC5900', // Brown
      '#7358FF', // Purple
      '#E91429', // Red
      '#8c67ab', // Light purple
      '#509bf5', // Blue
      '#ba5d07'  // Orange
    ]
    
    // Get a deterministic color based on genre name
    if (!genreInfo) return colors[0]
    
    // Simple hash function for genre name
    const hash = genreInfo.Name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    
    return colors[hash % colors.length]
  }
  
  // Fetch genre info and albums
  useEffect(() => {
    const fetchGenreData = async () => {
      if (!isInitialized || connectionStatus !== 'connected' || !genreId) {
        console.log('Genre fetch aborted - not initialized or no genreId', {
          isInitialized,
          connectionStatus,
          genreId
        });
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // First get all genres to find our genre info
        const genres = await getAllGenres()
        console.log('Fetched genres:', genres.length);
        
        // Try different matching approaches for the genre ID
        // First try exact match
        let currentGenre = genres.find(g => g.Id === genreId);
        
        // If no match, try case-insensitive match (in case of capitalization differences)
        if (!currentGenre && typeof genreId === 'string') {
          currentGenre = genres.find(g => 
            typeof g.Id === 'string' && 
            g.Id.toLowerCase() === genreId.toLowerCase()
          );
        }
        
        // If still no match, try matching by name for legacy support
        if (!currentGenre) {
          currentGenre = genres.find(g => 
            g.Name && typeof g.Name === 'string' && 
            g.Name.toLowerCase() === genreId.toLowerCase()
          );
        }
        
        console.log('Found genre match?', !!currentGenre, currentGenre);
        
        if (!currentGenre) {
          console.error('Genre not found with ID:', genreId);
          console.log('Available genres:', genres.map(g => ({ id: g.Id, name: g.Name })));
          setError('Genre not found')
          setLoading(false)
          return
        }
        
        setGenreInfo(currentGenre)
        
        // Fetch albums by genre
        const albumsData = await getItemsByGenre(genreId, 'MusicAlbum')
        setAlbums(albumsData || [])
        
        // Fetch tracks by genre (limited to avoid too many items)
        setLoadingTracks(true)
        const tracksData = await getItemsByGenre(genreId, 'Audio')
        
        // Sort tracks by album, then track number
        const sortedTracks = tracksData ? [...tracksData].sort((a, b) => {
          // First by album name
          if (a.Album !== b.Album) return a.Album.localeCompare(b.Album)
          // Then by disc number
          if (a.ParentIndexNumber !== b.ParentIndexNumber) 
            return a.ParentIndexNumber - b.ParentIndexNumber
          // Then by track number
          return a.IndexNumber - b.IndexNumber
        }) : []
        
        setTracks(sortedTracks.slice(0, 100)) // Limit to first 100 tracks
        setLoadingTracks(false)
      } catch (err) {
        console.error('Error fetching genre data:', err)
        setError('Failed to load genre data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchGenreData()
  }, [genreId, connectionStatus, isInitialized, getItemsByGenre, getAllGenres])
  
  // Play all tracks in the genre
  const handlePlayAll = () => {
    if (tracks && tracks.length > 0) {
      playTracks(tracks, 0)
    }
  }
  
  // Shuffle all tracks in the genre
  const handleShuffleAll = () => {
    if (tracks && tracks.length > 0) {
      // Create a shuffled copy of the tracks
      const shuffled = [...tracks].sort(() => 0.5 - Math.random())
      playTracks(shuffled, 0)
    }
  }
  
  // Go back to previous page
  const handleBack = () => {
    navigate(-1)
  }
  
  if (error) {
    return (
      <Box sx={{ pt: 2, px: 3 }}>
        <IconButton onClick={handleBack} sx={{ mb: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    )
  }
  
  return (
    <Box sx={{ pb: '120px' }}>
      {/* Genre header */}
      <Box
        sx={{
          bgcolor: loading ? alpha('#121212', 0.3) : getBgColor(),
          height: 280,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end'
        }}
      >
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            width: 300,
            height: 300,
            bgcolor: 'rgba(0,0,0,0.2)',
            bottom: -100,
            right: -100,
            transform: 'rotate(25deg)',
            borderRadius: 4
          }}
        />
        
        <Box
          sx={{
            position: 'absolute',
            width: 200,
            height: 200,
            bgcolor: 'rgba(0,0,0,0.15)',
            top: -50,
            left: -50,
            transform: 'rotate(15deg)',
            borderRadius: 4
          }}
        />
        
        {/* Back button */}
        <IconButton
          onClick={handleBack}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: 'rgba(0,0,0,0.4)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.6)'
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        {/* Genre info */}
        <Box sx={{ p: 4, zIndex: 2, width: '100%' }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5 }}
          >
            Genre
          </Typography>
          
          {loading ? (
            <Skeleton variant="text" width="50%" height={60} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <Typography variant="h3" fontWeight={900} sx={{ color: 'white' }}>
              {genreInfo?.Name || 'Unknown Genre'}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {loading ? (
              <>
                <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.1)', mr: 1 }} />
                <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                  sx={{
                    mr: 1,
                    bgcolor: 'white',
                    color: 'black',
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#eee' },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(255,255,255,0.3)',
                      color: 'rgba(0,0,0,0.3)'
                    }
                  }}
                >
                  Play
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShuffleIcon />}
                  onClick={handleShuffleAll}
                  disabled={tracks.length === 0}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.7)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    },
                    '&.Mui-disabled': {
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  Shuffle
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Box>
      
      {/* Content section */}
      <Box sx={{ p: 3 }}>
        {/* Albums section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Albums
          </Typography>
          
          {loading ? (
            <Grid container spacing={2}>
              {[...Array(4)].map((_, index) => (
                <Grid item key={index} xs={6} sm={4} md={3} lg={2.4}>
                  <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                  <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Grid>
              ))}
            </Grid>
          ) : albums.length > 0 ? (
            <Grid container spacing={2}>
              {albums.map(album => (
                <Grid item key={album.Id} xs={6} sm={4} md={3} lg={2.4}>
                  <AlbumCard album={album} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}
            >
              <AlbumIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.secondary, 0.5), mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No albums found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This genre doesn't have any albums in your library
              </Typography>
            </Paper>
          )}
        </Box>
        
        {/* Tracks section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Tracks
          </Typography>
          
          {loading ? (
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
          ) : loadingTracks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : tracks.length > 0 ? (
            <TrackList 
              tracks={tracks} 
              showAlbum={true} 
              showArtist={true} 
              showNumber={true}
            />
          ) : (
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                No tracks found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This genre doesn't have any tracks in your library
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default Genre 