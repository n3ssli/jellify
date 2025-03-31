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
  Collapse,
  IconButton,
  InputAdornment,
  Tooltip,
  Divider,
  Link
} from '@mui/material'
import { 
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  HelpOutline as HelpIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { Jellyfin } from '@jellyfin/sdk'
import axios from 'axios'

const ServerSetup = ({ onConfigured }) => {
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [connectionStep, setConnectionStep] = useState('initial') // 'initial', 'connecting', 'validating', 'authenticating', 'success'
  const [statusMessage, setStatusMessage] = useState('')
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword)
  }
  
  const handleConnect = async (e) => {
    e.preventDefault()
    
    // Clear previous errors
    setError('')
    setLoading(true)
    setConnectionStep('connecting')
    setStatusMessage('Initializing connection...')
    
    // Validate input
    if (!serverUrl) {
      setError('Server URL is required')
      setLoading(false)
      setConnectionStep('initial')
      return
    }
    
    if (!username || !password) {
      setError('Username and password are required')
      setLoading(false)
      setConnectionStep('initial')
      return
    }
    
    // Normalize server URL (ensure it has http/https protocol and no trailing slash)
    let normalizedUrl = serverUrl.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl
    }
    
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1)
    }
    
    try {
      // Initialize connection
      setConnectionStep('connecting')
      setStatusMessage('Connecting to Jellyfin server...')
      
      // Authenticate with Jellyfin server
      setConnectionStep('authenticating')
      setStatusMessage('Authenticating with Jellyfin server...')
      
      const result = await window.electron.authenticateJellyfin(normalizedUrl, username, password)
      
      if (result.success) {
        // Authentication successful
        setConnectionStep('success')
        setStatusMessage('Connection successful!')
        
        // Save the server URL and auth token
        await window.electron.setServerUrl(normalizedUrl)
        await window.electron.setAuthToken(result.token)
        
        // Short delay before proceeding to give visual feedback
        setTimeout(() => {
          onConfigured()
        }, 1000)
      } else {
        // Authentication failed
        console.error('Authentication failed:', result.error)
        setError(result.error || 'Authentication failed')
        setConnectionStep('initial')
      }
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message || 'An unknown error occurred')
      setConnectionStep('initial')
    } finally {
      setLoading(false)
    }
  }
  
  // Helper to get status color
  const getStatusColor = () => {
    switch (connectionStep) {
      case 'success': return 'success.main'
      case 'initial': return 'text.secondary'
      default: return 'primary.main'
    }
  }
  
  return (
    <Container maxWidth="sm" sx={{
      pb: 4,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <img src="/logo.png" alt="Logo" style={{ width: '180px', marginBottom: '20px' }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Jellify
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Connect to your Jellyfin server to start listening
        </Typography>
      </Box>
      
      <Collapse in={!!error}>
        <Alert 
          severity="error"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError('')}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      </Collapse>
      
      {connectionStep !== 'initial' && connectionStep !== 'success' && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography 
            variant="body2" 
            color={getStatusColor()}
          >
            {statusMessage}
          </Typography>
        </Box>
      )}
      
      <Box component="form" onSubmit={handleConnect} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="serverUrl"
          label="Jellyfin Server URL"
          name="serverUrl"
          placeholder="http://your-jellyfin-server:8096"
          autoFocus
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Enter the URL of your Jellyfin server, including the port if needed">
                  <HelpIcon color="action" fontSize="small" />
                </Tooltip>
              </InputAdornment>
            )
          }}
          sx={{ mb: 2 }}
        />
        
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
          sx={{ mb: 2 }}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
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
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ mb: 3 }}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={loading}
          sx={{
            py: 1.5,
            fontWeight: 600,
            fontSize: '1rem',
            position: 'relative'
          }}
        >
          {loading ? 'Connecting...' : 'Connect to Server'}
          {loading && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px'
              }}
            />
          )}
        </Button>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InfoIcon fontSize="small" sx={{ mr: 1 }} />
            Don't have a Jellyfin server?
          </Typography>
          <Link 
            href="https://jellyfin.org/docs/general/installation/" 
            target="_blank"
            rel="noopener"
            underline="hover"
            sx={{ mt: 1, display: 'inline-block' }}
          >
            Learn how to set one up
          </Link>
        </Box>
      </Box>
    </Container>
  )
}

export default ServerSetup 