import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  InputBase,
  Avatar,
  Typography,
  Tooltip,
  useTheme,
  alpha,
  AppBar,
  Toolbar,
  Fade,
  Divider
} from '@mui/material'
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Favorite as FavoriteIcon,
  Add as AddIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { useSidebar } from '../services/SidebarContext'
import { useApp } from '../services/AppContext'

const TopBar = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout, getUserImageUrl } = useJellyfin()
  const { isOpen, toggleSidebar, openSidebar } = useSidebar()
  const { onCreatePlaylist } = useApp()
  
  const [anchorEl, setAnchorEl] = useState(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [scrolled, setScrolled] = useState(false)
  
  // Check if we're on the search page
  const isSearchPage = location.pathname === '/search'
  
  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleMenuClose = () => {
    setAnchorEl(null)
  }
  
  const handleLogout = async () => {
    handleMenuClose()
    await logout()
  }
  
  const handleSettings = () => {
    handleMenuClose()
    navigate('/settings')
  }
  
  const handleLikedSongs = () => {
    handleMenuClose()
    navigate('/liked')
  }
  
  const handleViewProfile = () => {
    handleMenuClose()
    navigate('/profile')
  }
  
  const handleCreatePlaylist = () => {
    if (onCreatePlaylist) {
      onCreatePlaylist()
    }
  }
  
  // Handle search
  const handleSearchChange = (e) => {
    setSearchText(e.target.value)
  }
  
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchText.trim()) {
      // Check if we're not already on the search page
      if (location.pathname !== '/search') {
        navigate('/search', { state: { searchQuery: searchText.trim() } })
      } else {
        // If already on search page, just update the state
        navigate('/search', { state: { searchQuery: searchText.trim() }, replace: true })
      }
    }
  }
  
  const activateSearch = () => {
    setSearchActive(true)
  }
  
  const deactivateSearch = () => {
    setSearchActive(false)
    setSearchText('')
  }
  
  // Disable search box on the search page
  useEffect(() => {
    if (isSearchPage) {
      deactivateSearch()
    }
  }, [isSearchPage])
  
  const handleGoBack = () => {
    navigate(-1)
  }
  
  const handleGoForward = () => {
    navigate(1)
  }
  
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Home';
    if (location.pathname === '/library') return 'Your Library';
    if (location.pathname === '/liked') return 'Liked Songs';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname === '/queue') return 'Play Queue';
    if (location.pathname === '/search') return 'Search';
    if (location.pathname.startsWith('/playlist/')) return 'Playlist';
    if (location.pathname.startsWith('/album/')) return 'Album';
    if (location.pathname.startsWith('/artist/')) return 'Artist';
    return '';
  };
  
  return (
    <AppBar 
      position="sticky" 
      color="transparent" 
      elevation={0}
      sx={{
        borderBottom: scrolled ? 1 : 0,
        borderColor: alpha(theme.palette.divider, 0.08),
        bgcolor: scrolled 
          ? alpha(theme.palette.background.default, 0.8)
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        zIndex: theme.zIndex.drawer - 1,
        boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      <Toolbar 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          minHeight: { xs: 64, sm: 70 },
          transition: 'min-height 0.3s ease',
          px: { xs: 2, sm: 3 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!isOpen && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={openSidebar}
              edge="start"
              sx={{ 
                mr: 2,
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* Navigation buttons */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, mr: 2 }}>
            <IconButton
              onClick={handleGoBack}
              sx={{ 
                color: theme.palette.text.primary,
                backgroundColor: alpha(theme.palette.background.paper, 0.4),
                mr: 1
              }}
            >
              <PrevIcon />
            </IconButton>
            <IconButton
              onClick={handleGoForward}
              sx={{ 
                color: theme.palette.text.primary,
                backgroundColor: alpha(theme.palette.background.paper, 0.4)
              }}
            >
              <NextIcon />
            </IconButton>
          </Box>
          
          {/* Search input - Only show outside of search page */}
          {!isSearchPage && (
            <Fade in={searchActive}>
              <InputBase
                placeholder="Search songs, artists, albums…"
                value={searchText}
                onChange={handleSearchChange}
                onKeyPress={handleSearchSubmit}
                autoFocus={searchActive}
                sx={{
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                  borderRadius: 2,
                  width: searchActive ? 300 : 0,
                  px: searchActive ? 2 : 0,
                  py: 1,
                  transition: 'all 0.3s ease',
                  opacity: searchActive ? 1 : 0,
                  pointerEvents: searchActive ? 'auto' : 'none',
                }}
                startAdornment={<SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                onBlur={deactivateSearch}
              />
            </Fade>
          )}
          
          {/* Search button */}
          {!isSearchPage && !searchActive && (
            <IconButton
              onClick={activateSearch}
              sx={{ 
                mr: 1,
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main
                }
              }}
            >
              <SearchIcon />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Create Playlist">
            <IconButton 
              onClick={handleCreatePlaylist}
              sx={{ 
                mr: 1,
                color: theme.palette.text.primary,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main
                }
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={userInfo ? userInfo.Name : "Account"}>
            <IconButton
              onClick={handleProfileMenuOpen}
              size="small"
              sx={{ 
                ml: 1,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  border: `2px solid ${theme.palette.primary.main}`,
                  transform: 'scale(1.05)'
                }
              }}
              aria-controls="profile-menu"
              aria-haspopup="true"
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: alpha(theme.palette.primary.main, 0.8),
                  color: theme.palette.primary.contrastText,
                  fontWeight: 700
                }}
                src={userInfo?.Id ? getUserImageUrl(userInfo.Id) : undefined}
                alt={userInfo?.Name}
              >
                {userInfo ? userInfo.Name.charAt(0) : <PersonIcon />}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            minWidth: 200,
            overflow: 'hidden',
            mt: 1.5,
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {userInfo ? userInfo.Name : 'Not signed in'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {userInfo ? 'Jellyfin User' : ''}
          </Typography>
        </Box>
        
        <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.1) }} />
        
        <MenuItem 
          onClick={handleViewProfile}
          sx={{ 
            py: 1.5,
            '&:hover': { 
              backgroundColor: alpha(theme.palette.action.hover, 0.1),
              '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main
              }
            } 
          }}
        >
          <PersonIcon 
            fontSize="small" 
            sx={{ 
              mr: 1.5, 
              color: theme.palette.text.secondary,
              transition: 'color 0.2s'
            }} 
          />
          Profile
        </MenuItem>
        
        <MenuItem 
          onClick={handleLikedSongs}
          sx={{ 
            py: 1.5,
            '&:hover': { 
              backgroundColor: alpha(theme.palette.action.hover, 0.1),
              '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main
              }
            } 
          }}
        >
          <FavoriteIcon 
            fontSize="small" 
            sx={{ 
              mr: 1.5, 
              color: theme.palette.text.secondary,
              transition: 'color 0.2s'
            }} 
          />
          Liked Songs
        </MenuItem>
        
        <MenuItem 
          onClick={handleSettings}
          sx={{ 
            py: 1.5,
            '&:hover': { 
              backgroundColor: alpha(theme.palette.action.hover, 0.1),
              '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main
              }
            } 
          }}
        >
          <SettingsIcon 
            fontSize="small" 
            sx={{ 
              mr: 1.5, 
              color: theme.palette.text.secondary,
              transition: 'color 0.2s'
            }} 
          />
          Settings
        </MenuItem>
        
        <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.1) }} />
        
        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            py: 1.5,
            '&:hover': { 
              backgroundColor: alpha('#f44336', 0.05),
              color: '#f44336',
              '& .MuiSvgIcon-root': {
                color: '#f44336'
              }
            } 
          }}
        >
          <LogoutIcon 
            fontSize="small" 
            sx={{ 
              mr: 1.5, 
              color: theme.palette.text.secondary,
              transition: 'color 0.2s'
            }} 
          />
          Sign Out
        </MenuItem>
      </Menu>
    </AppBar>
  )
}

export default TopBar 