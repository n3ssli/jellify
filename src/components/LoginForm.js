import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  FormHelperText,
  Tabs,
  Tab,
  Divider,
  Link,
  Stack,
  useTheme,
  alpha
} from '@mui/material'
import { 
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LockOutlined as LockIcon,
  HttpOutlined as ServerIcon,
  KeyboardArrowLeft as BackIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material'
import JellifyLogo from '../assets/logo'

// Tab panel component for switching between server and login tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`login-tabpanel-${index}`}
      aria-labelledby={`login-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LoginForm = ({ onLoginSuccess }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword)
  }
  
  const handleServerSubmit = (e) => {
    e.preventDefault();
    
    if (!serverUrl) {
      setError('Server URL is required');
      return;
    }
    
    setActiveTab(1);
  }
  
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    
    if (!username) {
      setError('Username is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Normalize server URL (ensure it has http/https protocol and no trailing slash)
      let normalizedUrl = serverUrl.trim()
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'http://' + normalizedUrl
      }
      
      if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1)
      }
      
      const result = await window.electron.authenticateJellyfin(normalizedUrl, username, password)
      
      if (result.success) {
        await window.electron.setServerUrl(normalizedUrl)
        await window.electron.setAuthToken(result.token)
        
        // Small delay to ensure credentials are properly saved
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (onLoginSuccess) {
          onLoginSuccess()
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }
  
  const handleBack = () => {
    setActiveTab(0);
  };
  
  return (
    <Box 
      sx={{ 
        height: '100vh', 
        width: '100vw', 
        bgcolor: 'black',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6) 0%, #121212 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '30vh',
          background: 'linear-gradient(180deg, #1DB954 -10%, rgba(18, 18, 18, 0) 100%)',
          opacity: 0.5,
        }
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ position: 'relative', zIndex: 2, mb: 4, textAlign: 'center' }}>
          <JellifyLogo height="80px" style={{ marginBottom: '1rem' }} />
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              color: 'white',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            Jellify
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'rgba(255,255,255,0.7)', 
              mt: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            Premium music experience for your Jellyfin server
          </Typography>
        </Box>
        
        <Paper 
          elevation={4} 
          sx={{ 
            borderRadius: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: 'blur(10px)',
            color: 'white',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Header */}
          <Box sx={{ 
            px: 4, 
            pt: 4, 
            pb: 2, 
            background: 'linear-gradient(145deg, rgba(29, 185, 84, 0.05) 0%, rgba(30, 215, 96, 0.01) 100%)'
          }}>
            <Typography 
              variant="h5" 
              component="h1" 
              fontWeight={900} 
              align="center" 
              sx={{ letterSpacing: -0.5 }}
            >
              {activeTab === 0 ? 'Connect to Jellyfin' : 'Log in to Jellify'}
            </Typography>
          </Box>
          
          {/* Tabs */}
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ 
              borderBottom: 1, 
              borderColor: alpha(theme.palette.divider, 0.1),
              '& .MuiTab-root': {
                color: alpha(theme.palette.common.white, 0.7),
                py: 2,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                height: 3,
              }
            }}
          >
            <Tab 
              label="Server" 
              icon={<ServerIcon />} 
              iconPosition="start"
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              label="Login" 
              icon={<LockIcon />} 
              iconPosition="start"
              disabled={!serverUrl}
              sx={{ fontWeight: 700 }}
            />
          </Tabs>
          
          {/* Error message */}
          {error && (
            <Box sx={{ px: 4, pt: 3 }}>
              <Alert 
                severity="error" 
                variant="filled"
                sx={{ 
                  bgcolor: alpha('#d32f2f', 0.9), 
                  color: '#fff',
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: '#fff'
                  }
                }}
              >
                {error}
              </Alert>
            </Box>
          )}
          
          {/* Server URL Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box component="form" onSubmit={handleServerSubmit} noValidate sx={{ px: 4, pb: 4 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="serverUrl"
                label="Jellyfin Server URL"
                name="serverUrl"
                autoComplete="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={loading}
                placeholder="http://jellyfin.local:8096"
                variant="outlined"
                sx={{
                  mb: 4,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                  }
                }}
              />
              
              <Box sx={{ mb: 3 }}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading || !serverUrl}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1.05rem',
                    letterSpacing: 1,
                    boxShadow: theme.shadows[3]
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'CONTINUE'}
                </Button>
              </Box>
              
              <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 2 }}>
                Don't have a Jellyfin server? <Link href="https://jellyfin.org/docs/general/administration/installing.html" target="_blank" rel="noopener" color="primary" sx={{ fontWeight: 600 }}>Learn more</Link>
              </Typography>
            </Box>
          </TabPanel>
          
          {/* Login Credentials Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box component="form" onSubmit={handleCredentialsSubmit} noValidate sx={{ px: 4, pb: 4 }}>
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  onClick={handleBack}
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary',
                    '&:hover': { color: 'white' } 
                  }}
                >
                  <BackIcon />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {serverUrl}
                </Typography>
              </Box>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                sx={{ 
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                  }
                }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                        size="large"
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 4,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                  }
                }}
              />
              
              <Box sx={{ mb: 2 }}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading || !username}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1.05rem',
                    letterSpacing: 1,
                    boxShadow: theme.shadows[3]
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'LOG IN'
                  )}
                </Button>
              </Box>
              
              <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 3 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                  <InfoIcon fontSize="small" />
                  <span>Use your Jellyfin server credentials</span>
                </Stack>
              </Typography>
            </Box>
          </TabPanel>
        </Paper>
        
        <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Jellify &copy; {new Date().getFullYear()} | A Spotify-like client for Jellyfin
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default LoginForm 