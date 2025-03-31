import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Grid,
  Paper,
  Alert,
  useTheme,
  InputBase,
  IconButton,
  alpha,
  Card,
  CardActionArea,
  Chip,
  Button
} from '@mui/material'
import {
  Album as AlbumIcon,
  Person as ArtistIcon,
  MusicNote as TrackIcon,
  QueueMusic as PlaylistIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Audiotrack as GenreIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import AlbumCard from '../components/AlbumCard'
import ArtistCard from '../components/ArtistCard'
import TrackList from '../components/TrackList'
import PlaylistCard from '../components/PlaylistCard'

// Helper to get the query parameter from URL
const useQuery = () => {
  return new URLSearchParams(useLocation().search)
}

// Recent searches helper
const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('recentSearches')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  const addSearch = useCallback((query) => {
    if (!query || query.trim() === '') return
    
    const newSearches = [
      query.trim(),
      ...recentSearches.filter(s => s !== query.trim())
    ].slice(0, 8) // Keep only the most recent 8 searches
    
    setRecentSearches(newSearches)
    try {
      localStorage.setItem('recentSearches', JSON.stringify(newSearches))
    } catch (e) {
      // Silent fail
    }
  }, [recentSearches])

  const clearSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem('recentSearches')
    } catch (e) {
      // Silent fail
    }
  }, [])

  return { recentSearches, addSearch, clearSearches }
}

const Search = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const query = useQuery()
  const searchQuery = query.get('q') || ''
  const { search, connectionStatus, isInitialized, getAllGenres, getItemsByGenre } = useJellyfin()
  const { recentSearches, addSearch, clearSearches } = useRecentSearches()
  
  // For tracking initial load
  const hasInitialized = useRef(false)
  const hasSearched = useRef(false)
  
  // Search input state
  const [inputValue, setInputValue] = useState(searchQuery)
  
  // Search results
  const [results, setResults] = useState({
    albums: [],
    artists: [],
    tracks: [],
    playlists: []
  })
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [genres, setGenres] = useState([])
  const [loadingGenres, setLoadingGenres] = useState(false)
  const [tabKey, setTabKey] = useState(0) // Force re-render of tabs
  
  // Genre selection state - similar to Library approach
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [genreAlbums, setGenreAlbums] = useState([])
  const [loadingGenreContent, setLoadingGenreContent] = useState(false)
  
  // Load albums for selected genre
  useEffect(() => {
    if (!selectedGenre || !isInitialized || connectionStatus !== 'connected') return;
    
    const fetchGenreAlbums = async () => {
      try {
        setLoadingGenreContent(true);
        const albumsByGenre = await getItemsByGenre(selectedGenre.Id);
        setGenreAlbums(albumsByGenre || []);
      } catch (error) {
        setError(`Failed to load albums for genre "${selectedGenre.Name}".`);
      } finally {
        setLoadingGenreContent(false);
      }
    };
    
    fetchGenreAlbums();
  }, [selectedGenre, connectionStatus, isInitialized, getItemsByGenre]);
  
  // Update input value when URL changes
  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])
  
  // Fetch genres from Jellyfin only once
  useEffect(() => {
    if (!isInitialized || connectionStatus !== 'connected' || hasInitialized.current) {
      return
    }
    
    const fetchGenres = async () => {
      if (loadingGenres) return
      
      try {
        hasInitialized.current = true
        setLoadingGenres(true)
        const genresData = await getAllGenres()
        
        if (genresData && genresData.length > 0) {
          const shuffled = [...genresData].sort(() => 0.5 - Math.random())
          setGenres(shuffled.slice(0, 8))
        }
      } catch (error) {
        // Silently fail
      } finally {
        setLoadingGenres(false)
      }
    }
    
    fetchGenres()
  }, [getAllGenres, connectionStatus, isInitialized, loadingGenres])
  
  // One-time search effect - only run when searchQuery changes
  useEffect(() => {
    // Skip empty queries
    if (!searchQuery) {
      hasSearched.current = false
      return
    }
    
    // Skip if already searching or not initialized
    if (!isInitialized || connectionStatus !== 'connected' || loading) {
      return
    }
    
    // Avoid duplicate searches
    if (hasSearched.current && searchQuery === hasSearched.current) {
      return
    }
    
    const performSearch = async () => {
      setLoading(true)
      setError(null)
      
      try {
        hasSearched.current = searchQuery
        const searchResults = await search(searchQuery)
        setResults(searchResults || { albums: [], artists: [], tracks: [], playlists: [] })
        addSearch(searchQuery)
        
        // Set active tab to first non-empty category
        if (searchResults) {
          let newActiveTab = activeTab
          if (activeTab === 0 && (!searchResults.albums || searchResults.albums.length === 0)) {
            if (searchResults.artists && searchResults.artists.length > 0) {
              newActiveTab = 1
            } else if (searchResults.tracks && searchResults.tracks.length > 0) {
              newActiveTab = 2
            } else if (searchResults.playlists && searchResults.playlists.length > 0) {
              newActiveTab = 3
            }
          }
          
          if (newActiveTab !== activeTab) {
            setActiveTab(newActiveTab)
            // Force tab re-render
            setTabKey(prevKey => prevKey + 1)
          }
        }
      } catch (err) {
        console.error('Error searching:', err)
        setError('Failed to search. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    performSearch()
  }, [searchQuery, search, connectionStatus, isInitialized, addSearch, activeTab, loading])
  
  // Handle search input submit
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }
  
  // Handle search input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }
  
  // Handle clear input
  const handleClearInput = () => {
    setInputValue('')
    navigate('/search')
  }
  
  // Handle clicking on a recent search
  const handleRecentSearchClick = (searchTerm) => {
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`)
  }
  
  // Handle clicking on a genre - Library style approach
  const handleGenreClick = (genre) => {
    setSelectedGenre(genre);
  }
  
  // Clear selected genre
  const handleBackToGenres = () => {
    setSelectedGenre(null);
    setGenreAlbums([]);
  }
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
    setTabKey(prevKey => prevKey + 1) // Force re-render
  }
  
  // Get results count for tabs
  const getResultsCount = (type) => {
    const count = results[type]?.length || 0
    return count > 0 ? ` (${count})` : ''
  }
  
  // Choose a color for genre cards
  const getGenreColor = (index) => {
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
    return colors[index % colors.length]
  }
  
  // Determine if we're in search mode
  const isSearchMode = searchQuery !== ''
  
  // Album content
  const AlbumContent = () => (
    <Box>
      {results.albums && results.albums.length > 0 ? (
        <Grid container spacing={2}>
          {results.albums.map((album) => (
            <Grid item key={album.Id} xs={6} sm={4} md={3} lg={2.4}>
              <AlbumCard album={album} />
            </Grid>
          ))}
        </Grid>
      ) : !loading && (
        <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
          <AlbumIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 1 }}>
            No albums found matching "{searchQuery}"
          </Typography>
          <Typography variant="body2">
            Try searching with another term or browse our library
          </Typography>
        </Box>
      )}
    </Box>
  )
  
  // Artist content
  const ArtistContent = () => (
    <Box>
      {results.artists && results.artists.length > 0 ? (
        <Grid container spacing={2}>
          {results.artists.map((artist) => (
            <Grid item key={artist.Id} xs={6} sm={4} md={3} lg={2.4}>
              <ArtistCard artist={artist} />
            </Grid>
          ))}
        </Grid>
      ) : !loading && (
        <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
          <ArtistIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 1 }}>
            No artists found matching "{searchQuery}"
          </Typography>
          <Typography variant="body2">
            Try searching with another term or browse our library
          </Typography>
        </Box>
      )}
    </Box>
  )
  
  // Track content
  const TrackContent = () => (
    <Box>
      {results.tracks && results.tracks.length > 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <TrackList
            tracks={results.tracks}
            showArtist={true}
            showAlbum={true}
            showNumber={true}
          />
        </Paper>
      ) : !loading && (
        <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
          <TrackIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 1 }}>
            No songs found matching "{searchQuery}"
          </Typography>
          <Typography variant="body2">
            Try searching with another term or browse our library
          </Typography>
        </Box>
      )}
    </Box>
  )
  
  // Playlist content
  const PlaylistContent = () => (
    <Box>
      {results.playlists && results.playlists.length > 0 ? (
        <Grid container spacing={2}>
          {results.playlists.map((playlist) => (
            <Grid item key={playlist.Id} xs={6} sm={4} md={3} lg={2.4}>
              <PlaylistCard playlist={playlist} />
            </Grid>
          ))}
        </Grid>
      ) : !loading && (
        <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
          <PlaylistIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 1 }}>
            No playlists found matching "{searchQuery}"
          </Typography>
          <Typography variant="body2">
            Try searching with another term or browse our library
          </Typography>
        </Box>
      )}
    </Box>
  )

  return (
    <Box sx={{ 
      pb: '120px',
      bgcolor: 'background.default',
      minHeight: 'calc(100vh - 64px - 90px)'
    }}>
      {/* Search header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          bgcolor: alpha(theme.palette.background.default, 0.98),
          backdropFilter: 'blur(30px)',
          zIndex: 10,
          p: 3,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" fontWeight={700}>
            Search
          </Typography>
          
          <Button
            component={Link}
            to="/library?tab=3"
            variant="text"
            color="primary"
            sx={{ 
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Browse All Genres
          </Button>
        </Box>
        
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            borderRadius: 2,
            px: 2,
            py: 1,
            mb: 2,
            border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            '&:focus-within': {
              boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
              borderColor: 'transparent'
            }
          }}
        >
          <SearchIcon sx={{ color: 'text.secondary', mr: 1, my: 'auto' }} />
          <InputBase
            placeholder="Artists, songs, or albums"
            value={inputValue}
            onChange={handleInputChange}
            sx={{
              ml: 1,
              flex: 1,
              color: 'text.primary',
              fontSize: '1rem',
              '& .MuiInputBase-input': {
                p: 0
              }
            }}
            autoFocus
          />
          {inputValue && (
            <IconButton
              size="small"
              aria-label="clear"
              onClick={handleClearInput}
              sx={{ color: 'text.secondary' }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Tabs only for search results */}
        {isSearchMode && (
          <Tabs
            key={tabKey}
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{
              style: { backgroundColor: theme.palette.primary.main }
            }}
            sx={{
              '& .MuiTabs-flexContainer': {
                gap: 2
              },
              '& .MuiTab-root': {
                minWidth: 'auto',
                color: alpha(theme.palette.text.primary, 0.7),
                fontWeight: 600,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: theme.palette.primary.main
                }
              }
            }}
          >
            <Tab 
              icon={<AlbumIcon />} 
              label={`Albums${getResultsCount('albums')}`} 
              iconPosition="start"
              data-tab-type="albums"
            />
            <Tab 
              icon={<ArtistIcon />} 
              label={`Artists${getResultsCount('artists')}`} 
              iconPosition="start"
              data-tab-type="artists"
            />
            <Tab 
              icon={<TrackIcon />} 
              label={`Songs${getResultsCount('tracks')}`} 
              iconPosition="start"
              data-tab-type="tracks"
            />
            <Tab 
              icon={<PlaylistIcon />} 
              label={`Playlists${getResultsCount('playlists')}`} 
              iconPosition="start"
              data-tab-type="playlists"
            />
          </Tabs>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 3, mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!isSearchMode ? (
        <Box sx={{ px: 3, mt: 2 }}>
          {/* Recent searches section */}
          {recentSearches.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Recent searches
                </Typography>
                <Typography 
                  variant="body2" 
                  color="primary.main" 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                  onClick={clearSearches}
                >
                  Clear
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recentSearches.map((term, index) => (
                  <Chip
                    key={index}
                    label={term}
                    onClick={() => handleRecentSearchClick(term)}
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
                      color: theme.palette.text.primary,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Browse genres */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              {selectedGenre ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton 
                      onClick={handleBackToGenres}
                      sx={{ mr: 1 }}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedGenre.Name}
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h6" fontWeight={700}>
                    Browse genres
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="primary.main" 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                    onClick={() => navigate('/library?tab=3')}
                  >
                    View all genres
                  </Typography>
                </>
              )}
            </Box>

            {/* Display genres grid or selected genre content */}
            {selectedGenre ? (
              loadingGenreContent ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : genreAlbums.length > 0 ? (
                <Grid container spacing={2}>
                  {genreAlbums.map((album) => (
                    <Grid item xs={6} sm={4} md={3} lg={2.4} key={album.Id}>
                      <AlbumCard album={album} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary', bgcolor: alpha(theme.palette.background.paper, 0.4), borderRadius: 2 }}>
                  <AlbumIcon sx={{ fontSize: 48, opacity: 0.6, mb: 2 }} />
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    No albums found in the "{selectedGenre.Name}" genre
                  </Typography>
                  <Typography variant="body2">
                    Try another genre or browse our library
                  </Typography>
                </Box>
              )
            ) : loadingGenres ? (
              <CircularProgress size={24} sx={{ ml: 2 }} />
            ) : genres.length > 0 ? (
              <Grid container spacing={2}>
                {genres.map((genre, index) => (
                  <Grid item xs={6} sm={4} md={3} key={genre.Id}>
                    <Card 
                      sx={{ 
                        bgcolor: getGenreColor(index),
                        position: 'relative',
                        height: 100,
                        overflow: 'hidden',
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.9,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s ease'
                        }
                      }}
                      onClick={() => handleGenreClick(genre)}
                    >
                      <Box
                        sx={{ 
                          height: '100%',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                          p: 2,
                          position: 'relative',
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          fontWeight={700}
                          sx={{ zIndex: 1 }}
                        >
                          {genre.Name}
                        </Typography>
                        
                        {/* Decorative overlay */}
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            width: 60,
                            height: 60,
                            bgcolor: 'rgba(0,0,0,0.2)',
                            bottom: -10,
                            right: -10,
                            transform: 'rotate(25deg)',
                            borderRadius: 1
                          }} 
                        />
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No genres found in your Jellyfin library
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        <Box 
          sx={{ 
            p: 3,
            pt: 2,
            minHeight: 300,
            display: !loading ? 'flex' : 'none',
            flexDirection: 'column'
          }}
        >
          {/* Tab content as separate components */}
          {activeTab === 0 && <AlbumContent />}
          {activeTab === 1 && <ArtistContent />}
          {activeTab === 2 && <TrackContent />}
          {activeTab === 3 && <PlaylistContent />}
        </Box>
      )}
    </Box>
  )
}

export default Search