import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Tab,
  Tabs,
  Skeleton,
  Button,
  Chip,
  Divider,
  useTheme,
  CircularProgress,
  alpha,
  Avatar,
  Stack,
  IconButton,
  CardActionArea
} from '@mui/material'
import { 
  PlayArrow as PlayIcon, 
  Album as AlbumIcon, 
  LibraryMusic as LibraryIcon, 
  QueueMusic as PlaylistIcon,
  MusicNote as GenreIcon,
  Person as ArtistIcon,
  ArrowBack as BackIcon,
  MoreHoriz as MoreIcon,
  FormatListBulleted as ListIcon,
  GridView as GridViewIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'
import PageContainer from '../components/PageContainer'

const Library = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const { 
    getPlaylists, 
    getAllAlbums, 
    getAllArtists, 
    getAllGenres, 
    getItemsByGenre,
    getImageUrl, 
    getAlbumItems,
    connectionStatus,
    isInitialized
  } = useJellyfin()
  const { playTrack } = usePlayer()
  
  const [tabValue, setTabValue] = useState(0)
  const [playlists, setPlaylists] = useState([])
  const [albums, setAlbums] = useState([])
  const [artists, setArtists] = useState([])
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  
  // Only fetch data when connection is established
  useEffect(() => {
    if (connectionStatus === 'connected' && isInitialized) {
      const fetchAllData = async () => {
        try {
          setLoading(true)
          setError(null)
          
          const [playlistsData, albumsData, artistsData] = await Promise.all([
            getPlaylists(),
            getAllAlbums(),
            getAllArtists()
          ])
          
          setPlaylists(playlistsData)
          setAlbums(albumsData)
          setArtists(artistsData)
        } catch (error) {
          console.error('Error fetching library data:', error)
          setError('Failed to load library data. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      
      fetchAllData()
    }
  }, [connectionStatus, isInitialized, getPlaylists, getAllAlbums, getAllArtists])
  
  // Fetch data based on selected tab
  useEffect(() => {
    if (connectionStatus !== 'connected' || !isInitialized) return
    
    // Skip if we're on the "All" tab as data is already loaded
    if (tabValue === 0) return
    
    const fetchTabData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (tabValue === 1) {
          // Playlists tab
          const playlistsData = await getPlaylists()
          setPlaylists(playlistsData)
        } else if (tabValue === 2) {
          // Albums tab
          const albumsData = await getAllAlbums()
          setAlbums(albumsData)
        } else if (tabValue === 3) {
          // Genres tab
          const genresData = await getAllGenres()
          setGenres(genresData)
          setSelectedGenre(null)
        } else if (tabValue === 4) {
          // Artists tab
          const artistsData = await getAllArtists()
          setArtists(artistsData)
        }
      } catch (error) {
        console.error('Error fetching tab data:', error)
        setError('Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTabData()
  }, [tabValue, connectionStatus, isInitialized, getPlaylists, getAllAlbums, getAllArtists, getAllGenres])
  
  // Fetch albums by genre when a genre is selected
  useEffect(() => {
    if (connectionStatus !== 'connected' || !isInitialized || !selectedGenre) return
    
    const fetchGenreAlbums = async () => {
      try {
        setLoading(true)
        const albumsByGenre = await getItemsByGenre(selectedGenre.Id)
        setAlbums(albumsByGenre)
      } catch (error) {
        console.error('Error fetching genre albums:', error)
        setError(`Failed to load albums for genre "${selectedGenre.Name}".`)
      } finally {
        setLoading(false)
      }
    }
    
    if (tabValue === 3) {
      fetchGenreAlbums()
    }
  }, [selectedGenre, connectionStatus, isInitialized, getItemsByGenre, tabValue])
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }
  
  const handleCardClick = (type, item) => {
    if (type === 'album') {
      navigate(`/album/${item.Id}`)
    } else if (type === 'playlist') {
      navigate(`/playlist/${item.Id}`)
    } else if (type === 'artist') {
      navigate(`/artist/${item.Id}`)
    } else if (type === 'genre') {
      setSelectedGenre(item)
    }
  }
  
  const handleAlbumPlay = async (album, event) => {
    event.stopPropagation()
    try {
      setLoading(true)
      // Get album tracks
      const tracks = await getAlbumItems(album.Id)
      if (tracks && tracks.length > 0) {
        // Play the first track
        playTrack(tracks[0], tracks)
      } else {
        setError('No tracks found in this album')
      }
    } catch (error) {
      console.error('Error playing album:', error)
      setError('Failed to play album')
    } finally {
      setLoading(false)
    }
  }
  
  const handleArtistPlay = async (artist, event) => {
    event.stopPropagation()
    try {
      setLoading(true)
      // Navigate to artist page instead of playing
      navigate(`/artist/${artist.Id}`)
    } catch (error) {
      console.error('Error navigating to artist:', error)
      setError('Failed to open artist')
    } finally {
      setLoading(false)
    }
  }
  
  const handleGenreBack = () => {
    setSelectedGenre(null)
  }
  
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid')
  }
  
  const renderCards = (items, type) => {
    if (viewMode === 'list' && type !== 'genre') {
      return renderListView(items, type)
    }
    
    return (
      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid item key={item.Id} xs={6} sm={4} md={3} lg={2.4}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%', 
                position: 'relative',
                cursor: 'pointer',
                bgcolor: 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)'
                },
                '&:hover .play-button': {
                  opacity: 1,
                  transform: 'translateY(0)'
                }
              }}
              onClick={() => handleCardClick(type, item)}
            >
              <Box sx={{ position: 'relative', paddingTop: '100%', mb: 1 }}>
                {type === 'artist' ? (
                  <Avatar
                    src={getImageUrl(item.Id)}
                    alt={item.Name}
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                    }}
                  />
                ) : type === 'genre' ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: 2,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.6)})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <GenreIcon sx={{ fontSize: 64, color: 'white', opacity: 0.7 }} />
                  </Box>
                ) : (
                  <CardMedia
                    component="img"
                    image={getImageUrl(item.Id)}
                    alt={item.Name}
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 2,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}
                  />
                )}
                
                {type !== 'genre' && (
                  <Box
                    className="play-button"
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      opacity: 0,
                      transform: 'translateY(8px)',
                      transition: 'all 0.3s ease',
                      zIndex: 2
                    }}
                    onClick={(e) => handleAlbumPlay(item, e)}
                  >
                    <IconButton
                      sx={{
                        bgcolor: '#1DB954',
                        color: '#000',
                        width: 48,
                        height: 48,
                        '&:hover': {
                          bgcolor: '#1ed760',
                          transform: 'scale(1.04)'
                        },
                        boxShadow: '0 8px 16px rgba(0,0,0,.3)'
                      }}
                    >
                      <PlayIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ px: 0.5 }}>
                <Typography 
                  variant="body1" 
                  fontWeight={700} 
                  noWrap
                  sx={{ color: 'text.primary' }}
                >
                  {item.Name}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  noWrap 
                  sx={{ color: 'text.secondary' }}
                >
                  {type === 'album' 
                    ? (item.AlbumArtist || 'Unknown Artist') 
                    : type === 'playlist' 
                      ? `Playlist • ${item.ChildCount || 0} tracks`
                      : type === 'artist' 
                        ? 'Artist'
                        : type === 'genre' 
                          ? 'Genre'
                          : ''
                  }
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }
  
  const renderListView = (items, type) => {
    return (
      <Box sx={{ 
        width: '100%',
        bgcolor: alpha(theme.palette.background.paper, 0.3),
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        {items.map((item, index) => (
          <Box 
            key={item.Id}
            onClick={() => handleCardClick(type, item)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: 1,
              px: 2,
              cursor: 'pointer',
              borderBottom: index < items.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
              '&:hover': {
                bgcolor: alpha(theme.palette.action.hover, 0.1)
              }
            }}
          >
            <Avatar
              variant="rounded"
              src={getImageUrl(item.Id)}
              alt={item.Name}
              sx={{ 
                width: 50,
                height: 50,
                mr: 2,
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }}
            >
              {type === 'playlist' ? <PlaylistIcon /> : type === 'album' ? <AlbumIcon /> : <ArtistIcon />}
            </Avatar>
            
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body1" fontWeight={600} noWrap>
                {item.Name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" noWrap>
                {type === 'album' 
                  ? (item.AlbumArtist || 'Unknown Artist') 
                  : type === 'playlist' 
                    ? `Playlist • ${item.ChildCount || 0} tracks`
                    : type === 'artist' 
                      ? 'Artist'
                      : ''
                }
              </Typography>
            </Box>
            
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (type === 'album') {
                  handleAlbumPlay(item, e);
                } else if (type === 'artist') {
                  handleArtistPlay(item, e);
                } else if (type === 'playlist') {
                  handleCardClick(type, item);
                }
              }}
              sx={{ color: theme.palette.text.secondary }}
            >
              <PlayIcon />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={(e) => e.stopPropagation()}
              sx={{ color: theme.palette.text.secondary }}
            >
              <MoreIcon />
            </IconButton>
          </Box>
        ))}
      </Box>
    )
  }
  
  const renderSkeletons = (count) => {
    return (
      <Grid container spacing={2}>
        {Array(count).fill(0).map((_, index) => (
          <Grid item key={index} xs={6} sm={4} md={3} lg={2.4}>
            <Box sx={{ height: '100%' }}>
              <Skeleton 
                variant="rectangular" 
                height={0} 
                sx={{ 
                  paddingTop: '100%', 
                  borderRadius: 2,
                  mb: 1 
                }} 
              />
              <Skeleton variant="text" width="80%" height={28} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="50%" height={20} />
            </Box>
          </Grid>
        ))}
      </Grid>
    )
  }
  
  const renderGenreChips = () => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 3 }}>
        {genres.map((genre) => (
          <Chip
            key={genre.Id}
            label={genre.Name}
            onClick={() => handleCardClick('genre', genre)}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, selectedGenre?.Id === genre.Id ? 1 : 0.1),
              color: selectedGenre?.Id === genre.Id ? 'white' : theme.palette.text.primary,
              borderRadius: '16px',
              py: 2.5,
              fontWeight: 600,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, selectedGenre?.Id === genre.Id ? 0.9 : 0.2),
              }
            }}
          />
        ))}
      </Box>
    )
  }
  
  // Connection status
  if (connectionStatus !== 'connected' || !isInitialized) {
    return (
      <Box sx={{ 
        height: '80vh', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <CircularProgress sx={{ mb: 3 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Connecting to Jellyfin Server
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we establish connection
        </Typography>
      </Box>
    )
  }
  
  return (
    <PageContainer>
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight={700}>
            Your Library
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={toggleViewMode}
              color={viewMode === 'list' ? 'primary' : 'default'}
              sx={{ bgcolor: alpha(theme.palette.background.paper, 0.4) }}
            >
              <ListIcon />
            </IconButton>
            
            <IconButton 
              onClick={toggleViewMode}
              color={viewMode === 'grid' ? 'primary' : 'default'}
              sx={{ bgcolor: alpha(theme.palette.background.paper, 0.4) }}
            >
              <GridViewIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 4,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
              height: 3
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              minWidth: 100,
              color: alpha(theme.palette.text.primary, 0.7),
              '&.Mui-selected': {
                color: theme.palette.text.primary
              }
            }
          }}
        >
          <Tab 
            label="All" 
            icon={<LibraryIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={`Playlists (${playlists.length})`} 
            icon={<PlaylistIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={`Albums (${albums.length})`} 
            icon={<AlbumIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Genres" 
            icon={<GenreIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={`Artists (${artists.length})`} 
            icon={<ArtistIcon />} 
            iconPosition="start"
          />
        </Tabs>
        
        {/* Display content based on selected tab */}
        {error && (
          <Typography 
            variant="body2" 
            color="error" 
            sx={{ mb: 2, display: 'flex', alignItems: 'center' }}
          >
            {error}
          </Typography>
        )}
        
        {selectedGenre && tabValue === 3 && (
          <Box sx={{ mb: 3 }}>
            <Button 
              startIcon={<BackIcon />} 
              onClick={handleGenreBack}
              sx={{ 
                mb: 2,
                textTransform: 'none',
                color: theme.palette.text.primary,
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.hover, 0.1)
                }
              }}
            >
              Back to Genres
            </Button>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              {selectedGenre.Name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Albums in {selectedGenre.Name} genre
            </Typography>
          </Box>
        )}
        
        {loading ? (
          renderSkeletons(12)
        ) : (
          <>
            {/* All tab */}
            {tabValue === 0 && (
              <Box>
                {/* Playlists Section */}
                {playlists.length > 0 && (
                  <Box sx={{ mb: 5 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography variant="h5" fontWeight={700}>
                        Playlists
                      </Typography>
                      <Button 
                        onClick={() => setTabValue(1)}
                        sx={{ 
                          textTransform: 'none',
                          color: theme.palette.text.secondary,
                          '&:hover': { 
                            color: theme.palette.text.primary,
                            bgcolor: 'transparent',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        See all
                      </Button>
                    </Box>
                    {renderCards(playlists.slice(0, 6), 'playlist')}
                  </Box>
                )}
                
                {/* Albums Section */}
                {albums.length > 0 && (
                  <Box sx={{ mb: 5 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography variant="h5" fontWeight={700}>
                        Albums
                      </Typography>
                      <Button 
                        onClick={() => setTabValue(2)}
                        sx={{ 
                          textTransform: 'none',
                          color: theme.palette.text.secondary,
                          '&:hover': { 
                            color: theme.palette.text.primary,
                            bgcolor: 'transparent',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        See all
                      </Button>
                    </Box>
                    {renderCards(albums.slice(0, 6), 'album')}
                  </Box>
                )}
                
                {/* Artists Section */}
                {artists.length > 0 && (
                  <Box>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography variant="h5" fontWeight={700}>
                        Artists
                      </Typography>
                      <Button 
                        onClick={() => setTabValue(4)}
                        sx={{ 
                          textTransform: 'none',
                          color: theme.palette.text.secondary,
                          '&:hover': { 
                            color: theme.palette.text.primary,
                            bgcolor: 'transparent',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        See all
                      </Button>
                    </Box>
                    {renderCards(artists.slice(0, 6), 'artist')}
                  </Box>
                )}
              </Box>
            )}
            
            {/* Playlists tab */}
            {tabValue === 1 && (
              <Box>
                {playlists.length > 0 ? (
                  renderCards(playlists, 'playlist')
                ) : (
                  <Box sx={{ textAlign: 'center', p: 5 }}>
                    <PlaylistIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.secondary, 0.5), mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>No playlists found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create a playlist to start organizing your music
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Albums tab */}
            {tabValue === 2 && (
              <Box>
                {albums.length > 0 ? (
                  renderCards(albums, 'album')
                ) : (
                  <Box sx={{ textAlign: 'center', p: 5 }}>
                    <AlbumIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.secondary, 0.5), mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>No albums found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your album library is empty
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Genres tab */}
            {tabValue === 3 && (
              <Box>
                {selectedGenre ? (
                  albums.length > 0 ? (
                    renderCards(albums, 'album')
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 5 }}>
                      <AlbumIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.secondary, 0.5), mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 1 }}>No albums found in this genre</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try selecting a different genre
                      </Typography>
                    </Box>
                  )
                ) : (
                  genres.length > 0 ? (
                    <>
                      {renderGenreChips()}
                      <Divider sx={{ my: 3, borderColor: alpha(theme.palette.divider, 0.1) }} />
                      {renderCards(genres, 'genre')}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 5 }}>
                      <GenreIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.secondary, 0.5), mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 1 }}>No genres found</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your genre library is empty
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            )}
            
            {/* Artists tab */}
            {tabValue === 4 && (
              <Box>
                {artists.length > 0 ? (
                  renderCards(artists, 'artist')
                ) : (
                  <Box sx={{ textAlign: 'center', p: 5 }}>
                    <ArtistIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.secondary, 0.5), mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>No artists found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your artist library is empty
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </PageContainer>
  )
}

export default Library 