import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, useMediaQuery, useTheme, Typography, Paper, CircularProgress } from '@mui/material'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'

// Components
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import TopBar from './components/TopBar'
import LoginForm from './components/LoginForm'
import ConnectionStatus, { ConnectionErrorScreen } from './components/ConnectionStatus'
import AddToPlaylistDialog from './components/AddToPlaylistDialog'
import CreatePlaylistDialog from './components/CreatePlaylistDialog'

// Pages
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Playlist from './pages/Playlist'
import Album from './pages/Album'
import Artist from './pages/Artist'
import Queue from './pages/Queue'
import Liked from './pages/Liked'
import Settings from './pages/Settings'
import Profile from './pages/Profile'

// Context and services
import { JellyfinProvider, useJellyfin } from './services/JellyfinContext'
import { PlayerProvider, usePlayer } from './services/PlayerContext'
import { SidebarProvider, useSidebar } from './services/SidebarContext'
import { AppProvider } from './services/AppContext'

// Create theme instance
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954', // Spotify green
      light: '#1ED760',
      dark: '#1AA34A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      dark: '#181818',
      card: '#282828',
      highlight: '#333333',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
  },
  typography: {
    fontFamily: '"Circular Std", "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3.5rem',
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.75rem',
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '2.25rem',
      letterSpacing: '0em',
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '0.00735em',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '0em',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1.25rem',
      letterSpacing: '0.0075em',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '0.00938em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '0.00714em',
    },
    body1: {
      fontSize: '1rem',
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 700,
      letterSpacing: '0.02857em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 8px rgba(0, 0, 0, 0.15)',
    '0px 4px 12px rgba(0, 0, 0, 0.2)',
    '0px 6px 16px rgba(0, 0, 0, 0.25)',
    '0px 8px 20px rgba(0, 0, 0, 0.3)',
    '0px 10px 24px rgba(0, 0, 0, 0.35)',
    '0px 12px 28px rgba(0, 0, 0, 0.4)',
    '0px 14px 32px rgba(0, 0, 0, 0.45)',
    '0px 16px 36px rgba(0, 0, 0, 0.5)',
    '0px 18px 40px rgba(0, 0, 0, 0.55)',
    '0px 20px 44px rgba(0, 0, 0, 0.6)',
    '0px 22px 48px rgba(0, 0, 0, 0.65)',
    '0px 24px 52px rgba(0, 0, 0, 0.7)',
    '0px 26px 56px rgba(0, 0, 0, 0.75)',
    '0px 28px 60px rgba(0, 0, 0, 0.8)',
    '0px 30px 64px rgba(0, 0, 0, 0.85)',
    '0px 32px 68px rgba(0, 0, 0, 0.9)',
    '0px 34px 72px rgba(0, 0, 0, 0.95)',
    '0px 36px 76px rgba(0, 0, 0, 1)',
    '0px 38px 80px rgba(0, 0, 0, 1)',
    '0px 40px 84px rgba(0, 0, 0, 1)',
    '0px 42px 88px rgba(0, 0, 0, 1)',
    '0px 44px 92px rgba(0, 0, 0, 1)',
    '0px 46px 96px rgba(0, 0, 0, 1)',
    '0px 48px 100px rgba(0, 0, 0, 1)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
            display: 'none', // Hide default scrollbar
          },
          '&::-webkit-scrollbar-track': {
            background: '#121212',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
          // Ensure no margin or padding anywhere
          '& *': {
            boxSizing: 'border-box',
          },
          // Remove gap between sidebar and content
          '& .MuiDrawer-root + .main-content': {
            marginLeft: 0,
          }
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 32,
          padding: '8px 24px',
          fontWeight: 700,
          textTransform: 'none',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
            transform: 'scale(1.03)',
          },
        },
        containedPrimary: {
          backgroundColor: '#1DB954',
          '&:hover': {
            backgroundColor: '#1ED760',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#282828',
          borderRadius: 8,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#333333',
            transform: 'translateY(-4px)',
            boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1DB954',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
              color: '#1DB954',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&.Mui-selected': {
            backgroundColor: 'rgba(29, 185, 84, 0.16)',
            '&:hover': {
              backgroundColor: 'rgba(29, 185, 84, 0.24)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#1DB954',
          height: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          '&.Mui-selected': {
            color: '#fff',
          },
        },
      },
    },
  },
});

// Custom scrollbar styles
const customScrollbarStyles = {
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': {
    width: '6px',
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
};

// Main content component that depends on Jellyfin connection
const MainContent = ({ onConnectionError }) => {
  const { 
    connectionStatus, 
    isInitialized,
    connectionError,
    initJellyfin
  } = useJellyfin()
  const { isOpen, isQueueOpen, toggleQueueSidebar, closeQueueSidebar } = useSidebar()
  const { currentTrack } = usePlayer() // Get current track to check if player is visible
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const drawerWidth = 240;
  
  // Initialize Jellyfin in the background without blocking the UI
  useEffect(() => {
    let isInitializing = false;
    
    const initialize = async () => {
      // Prevent multiple initializations running at once
      if (isInitializing) return;
      isInitializing = true;
      
      try {
        // Get credentials directly
        const url = await window.electron.getServerUrl();
        const token = await window.electron.getAuthToken();
        
        // Only proceed if we have both URL and token
        if (url && token) {
          // Explicitly call with true to skip credential check (we just did it)
          const result = await initJellyfin(true);
          
          if (!result && onConnectionError) {
            console.error('Failed to initialize Jellyfin');
            onConnectionError('Failed to initialize Jellyfin client');
          }
        } else {
          if (onConnectionError) {
            onConnectionError('No credentials available');
          }
        }
      } catch (error) {
        if (onConnectionError) {
          onConnectionError(error.message || 'Error during initialization');
        }
      } finally {
        isInitializing = false;
      }
    };
    
    // Only do auto-initialization once when component mounts
    initialize();
    
    // Cleanup function
    return () => {
      isInitializing = false;
    };
  }, [initJellyfin, onConnectionError]);

  // Trigger the onConnectionError callback when connection status is error
  useEffect(() => {
    if (connectionStatus === 'error' && onConnectionError) {
      console.log('MainContent: Detected connection error:', connectionError)
      onConnectionError(connectionError)
    }
  }, [connectionStatus, connectionError, onConnectionError])

  // Only show error screen for critical connection errors
  if (connectionStatus === 'error') {
    return <ConnectionErrorScreen onRetryFailed={onConnectionError} />
  }

  // Determine bottom padding based on whether the player is visible
  const bottomPadding = currentTrack ? '90px' : '0';

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#121212'
    }}>
      <Sidebar />
      <ConnectionStatus />
      
      <Box 
        className="main-content"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${drawerWidth}px)`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
          }),
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          padding: 0,
          marginLeft: 0,
          position: 'relative',
          borderLeft: 'none',
          marginRight: isQueueOpen ? { xs: 0, sm: '380px' } : 0,
        }}
      >
        <TopBar />
        
        {/* Main scrollable content area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            pb: bottomPadding, // Dynamic padding based on player visibility
            width: '100%', // Ensure full width
            m: 0, // No margins
            p: 0, // No padding
            boxSizing: 'border-box', // Include padding in width
            ...customScrollbarStyles,
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/playlist/:id" element={<Playlist />} />
            <Route path="/album/:id" element={<Album />} />
            <Route path="/artist/:id" element={<Artist />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/liked" element={<Liked />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
        
        {/* Fixed player at bottom */}
        <Player />
      </Box>
    </Box>
  )
}

const App = () => {
  const [electronAvailable, setElectronAvailable] = useState(false)
  const [error, setError] = useState(null)
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true')
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false)
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [selectedTracks, setSelectedTracks] = useState([])
  
  // Handler for opening add to playlist dialog - moved to top with other hooks
  const handleAddToPlaylistOpen = useCallback((track, tracks) => {
    // Just set the state directly - no extra delays or DOM events
    if (tracks && tracks.length > 0) {
      // Handle multiple tracks
      setSelectedTracks(tracks);
      setSelectedTrack(null);
    } else if (track) {
      // Handle single track
      setSelectedTrack(track);
      setSelectedTracks([]);
    }
    setAddToPlaylistOpen(true);
  }, []);
  
  // Handler for closing add to playlist dialog - moved to top with other hooks
  const handleAddToPlaylistClose = useCallback(() => {
    // Prevent console logging which might trigger dev tools rerender
    setAddToPlaylistOpen(false);
    
    // Clear selected tracks but no API calls
    setSelectedTrack(null);
    setSelectedTracks([]);
  }, []);
  
  // Handler for opening/closing the dialog
  const handleCreatePlaylistOpen = useCallback(() => {
    // Use global function instead of setting state
    if (window.openNativeCreatePlaylistDialog) {
      window.openNativeCreatePlaylistDialog();
    }
  }, []);
  
  const handleCreatePlaylistClose = useCallback(() => {
    // Do nothing - dialog handles its own closing
  }, []);

  // Handle player expansion
  const handleTogglePlayerExpand = () => {
    setIsPlayerExpanded(prev => !prev)
  }

  // Sidebar width
  const drawerWidth = 240

  // First check if window.electron is available
  useEffect(() => {
    try {
      console.log('Checking for window.electron...')
      if (window.electron) {
        console.log('window.electron is available!')
        setElectronAvailable(true)
      } else {
        console.log('window.electron is NOT available!')
        setError('window.electron is not defined - make sure preload.js is working correctly')
      }
    } catch (err) {
      console.error('Error checking for window.electron:', err)
      setError(err.message)
    }
  }, [])

  // App wrapper with error handling for Electron API
  const AppWrapper = () => {
    const [serverConfigured, setServerConfigured] = useState(false)
    // Set initial checking state to true
    const [checkingCredentials, setCheckingCredentials] = useState(true)
    // Track if we've just logged in to prevent immediate error handling
    const [justLoggedIn, setJustLoggedIn] = useState(false)
    // Ref to store timer for clearing justLoggedIn flag
    const loginTimerRef = useRef(null)
    
    // Check for stored credentials on mount
    useEffect(() => {
      const checkStoredCredentials = async () => {
        try {
          console.log('Checking for stored credentials...')
          const url = await window.electron.getServerUrl()
          const token = await window.electron.getAuthToken()
          
          if (url && token) {
            console.log('Found stored credentials, auto-logging in')
            setServerConfigured(true)
            setJustLoggedIn(true)
            
            // Clear the "just logged in" flag after a delay to allow initialization
            loginTimerRef.current = setTimeout(() => {
              setJustLoggedIn(false)
            }, 5000)
          } else {
            console.log('No stored credentials found')
          }
        } catch (error) {
          console.error('Error checking stored credentials:', error)
        } finally {
          setCheckingCredentials(false)
        }
      }
      
      checkStoredCredentials()
    }, [])
    
    // Clear the login timer on unmount
    useEffect(() => {
      return () => {
        if (loginTimerRef.current) {
          clearTimeout(loginTimerRef.current)
        }
      }
    }, [])
    
    // Login success handler - This is called after a successful login
    const handleLoginSuccess = useCallback(() => {
      console.log('App: Login successful, initializing app with credentials')
      setJustLoggedIn(true)
      setServerConfigured(true)
      
      // Clear the "just logged in" flag after a delay to allow initialization
      loginTimerRef.current = setTimeout(() => {
        setJustLoggedIn(false)
      }, 5000)
    }, [])
    
    // Connection error handler - This is called if the Jellyfin connection fails
    const handleConnectionError = useCallback((error) => {
      console.log('App: Connection error detected:', error)
      
      // Ignore connection errors right after login to give time for initialization
      if (justLoggedIn) {
        console.log('App: Ignoring connection error because we just logged in')
        return
      }
      
      console.log('App: Showing login screen due to connection error')
      setServerConfigured(false)
    }, [justLoggedIn])
    
    // Show loading indicator while checking for credentials
    if (checkingCredentials) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      )
    }
    
    // Show the login form or the main app based on login status
    if (!serverConfigured) {
      return <LoginForm onLoginSuccess={handleLoginSuccess} />
    }
    
    // Show main app after successful login
    return (
      <JellyfinProvider onConnectionError={handleConnectionError}>
        <PlayerProvider>
          <SidebarProvider>
            <AppProvider
              createPlaylistOpen={createPlaylistOpen}
              onCreatePlaylist={handleCreatePlaylistOpen}
              onCreatePlaylistClose={handleCreatePlaylistClose}
              addToPlaylistOpen={addToPlaylistOpen}
              onAddToPlaylist={handleAddToPlaylistOpen}
              onAddToPlaylistClose={handleAddToPlaylistClose}
              selectedTrack={selectedTrack}
            >
              <MainContent onConnectionError={handleConnectionError} />
              <CreatePlaylistDialog open={createPlaylistOpen} onClose={handleCreatePlaylistClose} />
              <AddToPlaylistDialog 
                open={addToPlaylistOpen} 
                onClose={handleAddToPlaylistClose}
                trackId={selectedTrack}
              />
            </AppProvider>
          </SidebarProvider>
        </PlayerProvider>
      </JellyfinProvider>
    )
  }

  // Show error if window.electron is not available
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom color="error">
            Error Loading Application
          </Typography>
          <Typography variant="body1" paragraph>
            {error}
          </Typography>
        </Paper>
      </Box>
    )
  }

  // Show loading message while checking electron
  if (!electronAvailable) {
    return (
      <Box sx={{ p: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Initializing Application...
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppWrapper />
    </ThemeProvider>
  )
}

export default App 