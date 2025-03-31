import React, { useState } from 'react'
import {
  Alert,
  Snackbar,
  Button,
  CircularProgress,
  Box,
  Typography
} from '@mui/material'
import { useJellyfin } from '../services/JellyfinContext'

// This component displays server connection status and errors
const ConnectionStatus = () => {
  const { connectionStatus, connectionError, reconnect } = useJellyfin()

  // Only show when there's an error or when reconnecting
  if (connectionStatus !== 'error' && connectionStatus !== 'reconnecting') {
    return null
  }

  // Show a snackbar for reconnecting status
  if (connectionStatus === 'reconnecting') {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          icon={<CircularProgress size={20} />} 
          severity="info"
          sx={{ width: '100%' }}
        >
          Connecting to Jellyfin server...
        </Alert>
      </Snackbar>
    )
  }

  // Show a more prominent alert for errors
  if (connectionStatus === 'error') {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error"
          sx={{ width: '100%' }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => reconnect()}
            >
              Retry
            </Button>
          }
        >
          {connectionError || 'Error connecting to Jellyfin server'}
        </Alert>
      </Snackbar>
    )
  }

  return null
}

// This component is a full-screen error for critical connection issues
export const ConnectionErrorScreen = ({ onRetryFailed }) => {
  const { connectionStatus, connectionError, reconnect, logout } = useJellyfin()
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  if (connectionStatus !== 'error') {
    return null
  }

  const handleReconnect = async () => {
    setIsRetrying(true)
    try {
      const success = await reconnect()
      if (!success) {
        setRetryCount(prev => prev + 1)
        if (retryCount >= 2 && onRetryFailed) {
          // After 3 failed attempts, go back to login screen
          onRetryFailed('Max retry attempts reached, returning to login screen')
        }
      }
    } catch (error) {
      console.error('Reconnect error:', error)
      if (onRetryFailed) {
        onRetryFailed(error.message || 'Reconnection failed')
      }
    } finally {
      setIsRetrying(false)
    }
  }

  const handleSignOut = () => {
    if (onRetryFailed) {
      onRetryFailed('User requested to return to login screen')
    }
    logout()
    // Force redirect to login page
    window.location.href = '/?forceLogin=true'
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Connection Error
      </Typography>
      
      <Typography variant="body1" paragraph>
        {connectionError || 'Unable to connect to Jellyfin server'}
      </Typography>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleReconnect}
          disabled={isRetrying}
          startIcon={isRetrying ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isRetrying ? 'Connecting...' : 'Reconnect'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={handleSignOut}
        >
          Back to Login
        </Button>
      </Box>
    </Box>
  )
}

export default ConnectionStatus 