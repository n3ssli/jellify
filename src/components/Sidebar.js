import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Button,
  Avatar,
  Tooltip
} from '@mui/material'
import {
  Home as HomeIcon,
  Search as SearchIcon,
  LibraryMusic as LibraryMusicIcon,
  Add as AddIcon,
  Favorite as FavoriteIcon,
  QueueMusic as QueueMusicIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { useSidebar } from '../services/SidebarContext'
import { useApp } from '../services/AppContext'
import { usePlayer } from '../services/PlayerContext'
import JellifyLogo from '../assets/logo'

// Define the event constant
const REFRESH_PLAYLISTS_EVENT = 'REFRESH_PLAYLISTS_EVENT';

// Drawer width
const drawerWidth = 240

const Sidebar = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { isOpen, toggleSidebar } = useSidebar()
  const { onCreatePlaylist } = useApp()
  const { getPlaylists, userInfo, getUserImageUrl } = useJellyfin()
  const { currentTrack } = usePlayer()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Calculate sidebar height based on player visibility
  const sidebarHeight = currentTrack ? 'calc(100% - 90px)' : '100%';
  
  // Function to fetch playlists
  const fetchPlaylists = useCallback(async () => {
    // Only fetch playlists if Jellyfin is fully initialized
    if (!window.jellyfinService || !window.jellyfinService.isInitialized || !window.jellyfinService.connectionStatus || window.jellyfinService.connectionStatus !== 'connected') {
      return
    }
    
    try {
      setLoading(true)
      const data = await getPlaylists()
      if (data && Array.isArray(data)) {
        setPlaylists(data)
      } else {
        setPlaylists([])
      }
    } catch (error) {
      setPlaylists([])
    } finally {
      setLoading(false)
    }
  }, [getPlaylists])
  
  // Fetch playlists initially and when refresh trigger changes
  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists, refreshTrigger])
  
  // Listen for the custom refresh playlists event
  useEffect(() => {
    // Event handler to refresh playlists
    const handleRefreshPlaylists = () => {
      console.log('REFRESH_PLAYLISTS_EVENT received, refreshing playlists');
      setRefreshTrigger(prev => prev + 1);
    };
    
    // Add event listener
    window.addEventListener(REFRESH_PLAYLISTS_EVENT, handleRefreshPlaylists);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener(REFRESH_PLAYLISTS_EVENT, handleRefreshPlaylists);
    };
  }, []);
  
  // Navigation items
  const mainNavItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Search', icon: <SearchIcon />, path: '/search' },
    { text: 'Your Library', icon: <LibraryMusicIcon />, path: '/library' }
  ]

  const secondaryNavItems = [
    { text: 'Queue', icon: <QueueMusicIcon />, path: '/queue' }
  ]

  const handleUserProfileClick = () => {
    navigate('/profile');
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      open={true}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          border: 'none',
          bgcolor: 'black',
          height: sidebarHeight,
          overflow: 'hidden',
          borderRight: 'none',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center' }}>
          <JellifyLogo height="28px" />
          Jellify
        </Typography>
      </Box>

      <List>
        {mainNavItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 1,
                mx: 1,
                py: 1,
                '&.Mui-selected': {
                  backgroundColor: '#282828',
                  '&:hover': {
                    backgroundColor: '#282828'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'text.secondary', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: location.pathname === item.path ? 700 : 400,
                  color: location.pathname === item.path ? 'white' : 'text.secondary'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ padding: 2, mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<AddIcon />}
          onClick={() => {
            if (window.openNativeCreatePlaylistDialog) {
              window.openNativeCreatePlaylistDialog();
            } else {
              onCreatePlaylist();
            }
          }}
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            justifyContent: 'flex-start',
            backgroundColor: 'transparent',
            '&:hover': {
              color: 'white',
              backgroundColor: 'transparent'
            }
          }}
        >
          Create Playlist
        </Button>
        <Button
          startIcon={<FavoriteIcon sx={{ color: '#1DB954' }} />}
          onClick={() => navigate('/liked')}
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            justifyContent: 'flex-start',
            backgroundColor: 'transparent',
            '&:hover': {
              color: 'white',
              backgroundColor: 'transparent'
            }
          }}
        >
          Liked Songs
        </Button>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mt: 1, mx: 2 }} />

      <List sx={{ overflow: 'auto', flex: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        {secondaryNavItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 1,
                mx: 1,
                py: 1,
                '&.Mui-selected': {
                  backgroundColor: '#282828',
                  '&:hover': {
                    backgroundColor: '#282828'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'text.secondary', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: location.pathname === item.path ? 700 : 400,
                  color: location.pathname === item.path ? 'white' : 'text.secondary'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}

        {playlists && playlists.map((playlist) => (
          <ListItem key={playlist.Id} disablePadding>
            <ListItemButton
              selected={location.pathname === `/playlist/${playlist.Id}`}
              onClick={() => navigate(`/playlist/${playlist.Id}`)}
              sx={{
                borderRadius: 1,
                mx: 1,
                py: 0.75,
                '&.Mui-selected': {
                  backgroundColor: '#282828',
                  '&:hover': {
                    backgroundColor: '#282828'
                  }
                }
              }}
            >
              <ListItemText 
                primary={playlist.Name} 
                primaryTypographyProps={{ 
                  fontWeight: location.pathname === `/playlist/${playlist.Id}` ? 700 : 400,
                  color: location.pathname === `/playlist/${playlist.Id}` ? 'white' : 'text.secondary',
                  fontSize: '0.875rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {userInfo && (
        <Tooltip title="View profile">
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              cursor: 'pointer', 
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#282828',
              },
              transition: 'background-color 0.2s'
            }}
            onClick={handleUserProfileClick}
          >
            <Avatar 
              sx={{ width: 32, height: 32 }}
              src={userInfo?.Id ? getUserImageUrl(userInfo.Id) : undefined}
              alt={userInfo.Name}
            >
              {userInfo.Name.charAt(0)}
            </Avatar>
            <Typography variant="body2" fontWeight={500} noWrap>
              {userInfo.Name}
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Drawer>
  )
}

export default Sidebar 