import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Slider,
  Switch,
  FormControlLabel,
  Grid
} from '@mui/material'
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Audiotrack as AudiotrackIcon,
  Info as InfoIcon,
  LogoutOutlined as LogoutIcon,
  Wifi as WifiIcon,
  DataUsage as DataIcon,
  Download as DownloadIcon,
  Storage as StorageIcon,
  GraphicEq as EqualizerIcon,
  VolumeUp as VolumeIcon,
  Compare as CompareIcon
} from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'
import { usePlayer } from '../services/PlayerContext'

// Define quality options
const qualityOptions = [
  { value: 'low', label: 'Low (96 kbps)', description: 'Uses less data, lower quality' },
  { value: 'medium', label: 'Medium (256 kbps)', description: 'Balanced quality and data usage' },
  { value: 'high', label: 'High (320 kbps)', description: 'Best quality, uses more data' },
  { value: 'lossless', label: 'Lossless (FLAC)', description: 'Highest quality, highest data usage' }
]

// Define equalizer presets
const equalizerPresets = [
  { name: 'Flat', values: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', values: [7, 5, 3, 1, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', values: [0, 0, 0, 0, 0, 2, 4, 6, 8] },
  { name: 'Bass Reduction', values: [-7, -5, -3, -1, 0, 0, 0, 0, 0] },
  { name: 'Classical', values: [4, 3, 0, 0, 0, -2, -3, -3, -4] },
  { name: 'Rock', values: [4, 3, 2, 0, -1, -1, 0, 2, 3] },
  { name: 'Pop', values: [-1, 0, 1, 2, 3, 2, 1, 0, -1] },
  { name: 'Jazz', values: [3, 2, 1, 2, -1, -1, 0, 1, 2] },
  { name: 'Electronic', values: [4, 3, 0, -2, -3, 0, 1, 3, 4] },
  { name: 'Vocal Boost', values: [-1, -1, 0, 2, 4, 3, 1, 0, -1] }
]

const Settings = () => {
  const { 
    userInfo, 
    connectionStatus,
    isInitialized,
    logout,
    refreshUserData,
    serverUrl
  } = useJellyfin()
  
  const {
    equalizer,
    updateEqualizerBand,
    setEqualizerEnabled,
    applyEqualizerPreset,
    defaultVolume,
    setDefaultVolume,
    crossfadeDuration,
    setCrossfadeDuration
  } = usePlayer()
  
  // Audio quality settings
  const [audioQuality, setAudioQuality] = useState({
    wifiStreamingQuality: 'high',
    dataStreamingQuality: 'medium',
    downloadQuality: 'high',
    normalization: true,
    discordRPC: true
  })
  
  // Temporary settings that will be applied when saved
  const [tempSettings, setTempSettings] = useState({
    defaultVolume: defaultVolume,
    crossfadeDuration: crossfadeDuration,
    equalizer: {
      enabled: equalizer.enabled,
      bands: equalizer.bands.map(band => ({...band}))
    }
  });
  
  // UI states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmLogoutDialogOpen, setConfirmLogoutDialogOpen] = useState(false)
  const [settingsChanged, setSettingsChanged] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  
  // Initialize temporary settings from current settings
  useEffect(() => {
    setTempSettings({
      defaultVolume: defaultVolume,
      crossfadeDuration: crossfadeDuration,
      equalizer: {
        enabled: equalizer.enabled,
        bands: equalizer.bands.map(band => ({...band}))
      }
    });
  }, [defaultVolume, crossfadeDuration, equalizer]);
  
  // Load user configuration settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!isInitialized || connectionStatus !== 'connected' || !userInfo) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Try to load from localStorage first
        const savedSettings = localStorage.getItem('jellyfi_audio_settings')
        let initialSettings;
        
        if (savedSettings) {
          try {
            initialSettings = JSON.parse(savedSettings)
            console.log('Loaded saved settings from localStorage:', initialSettings)
          } catch (e) {
            console.warn('Failed to parse saved settings:', e)
          }
        }
        
        // Use saved settings or fallback to defaults
        const settings = initialSettings || {
          wifiStreamingQuality: 'high',
          dataStreamingQuality: 'medium',
          downloadQuality: 'high',
          normalization: true,
          discordRPC: true
        }
        
        setAudioQuality(settings)
        
        // Store original settings to compare against
        localStorage.setItem('jellyfi_original_settings', JSON.stringify(settings))
        setSettingsChanged(false)
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    loadSettings()
  }, [isInitialized, connectionStatus, userInfo])
  
  // Track settings changes
  useEffect(() => {
    if (loading) return; // Don't check while loading
    
    // Check for audio quality changes
    let hasQualityChanges = false;
    const originalSettings = localStorage.getItem('jellyfi_original_settings');
    if (originalSettings) {
      try {
        const parsed = JSON.parse(originalSettings);
        hasQualityChanges = 
          parsed.wifiStreamingQuality !== audioQuality.wifiStreamingQuality ||
          parsed.dataStreamingQuality !== audioQuality.dataStreamingQuality ||
          parsed.downloadQuality !== audioQuality.downloadQuality ||
          parsed.normalization !== audioQuality.normalization ||
          parsed.discordRPC !== audioQuality.discordRPC;
      } catch (e) {
        hasQualityChanges = true;
      }
    } else {
      hasQualityChanges = true;
    }
    
    // Check for player settings changes
    const hasPlayerChanges = 
      tempSettings.defaultVolume !== defaultVolume ||
      tempSettings.crossfadeDuration !== crossfadeDuration ||
      tempSettings.equalizer.enabled !== equalizer.enabled ||
      tempSettings.equalizer.bands.some((band, index) => 
        band.gain !== equalizer.bands[index]?.gain
      );
    
    // Set overall changes state
    setSettingsChanged(hasQualityChanges || hasPlayerChanges);
  }, [audioQuality, tempSettings, defaultVolume, crossfadeDuration, equalizer, loading])
  
  // Handle form field changes
  const handleQualityChange = (field, value) => {
    setAudioQuality(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Save settings to Jellyfin
  const handleSave = async () => {
    if (!isInitialized || connectionStatus !== 'connected') {
      setError('Cannot save settings: Server connection unavailable')
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 4000)
      return
    }
    
    setSaving(true)
    setError(null)
    setSuccessMessage('')
    
    try {
      // In a real implementation, this would call the Jellyfin API
      // For now, we're just simulating a successful save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Save audio quality settings
      localStorage.setItem('jellyfi_audio_settings', JSON.stringify(audioQuality))
      localStorage.setItem('jellyfi_original_settings', JSON.stringify(audioQuality))
      
      // Apply and save player settings
      setDefaultVolume(tempSettings.defaultVolume);
      setCrossfadeDuration(tempSettings.crossfadeDuration);
      
      // Apply equalizer settings
      setEqualizerEnabled(tempSettings.equalizer.enabled);
      tempSettings.equalizer.bands.forEach(band => {
        updateEqualizerBand(band.id, band.gain);
      });
      
      // Apply Discord RPC settings
      window.electron.discord.setEnabled(audioQuality.discordRPC);
      
      setSuccessMessage('Settings saved successfully!')
      setSettingsChanged(false)
      setShowNotification(true)
      
      // Clear notification after a delay
      setTimeout(() => {
        setShowNotification(false)
      }, 4000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings. Please try again.')
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 4000)
    } finally {
      setSaving(false)
    }
  }
  
  // Handle refresh user data
  const handleRefreshUserData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await refreshUserData()
      setSuccessMessage('User data refreshed successfully!')
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (err) {
      console.error('Error refreshing user data:', err)
      setError('Failed to refresh user data. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle logout dialog
  const openLogoutDialog = () => {
    setConfirmLogoutDialogOpen(true)
  }
  
  const closeLogoutDialog = () => {
    setConfirmLogoutDialogOpen(false)
  }
  
  // Handle logout
  const handleLogout = async () => {
    closeLogoutDialog()
    
    try {
      await logout()
      // Logout handled by the JellyfinContext
    } catch (err) {
      console.error('Error logging out:', err)
      setError('Failed to log out. Please try again.')
    }
  }
  
  // Find selected quality option details
  const getQualityDetails = (value) => {
    return qualityOptions.find(option => option.value === value) || qualityOptions[0]
  }
  
  // Handle temporary equalizer band change
  const handleEqualizerBandChange = (id, value) => {
    setTempSettings(prev => {
      const newBands = prev.equalizer.bands.map(band => 
        band.id === id ? { ...band, gain: value } : band
      );
      
      return {
        ...prev,
        equalizer: {
          ...prev.equalizer,
          bands: newBands
        }
      };
    });
  }
  
  // Handle temporary equalizer toggle
  const handleEqualizerToggle = (event) => {
    setTempSettings(prev => ({
      ...prev,
      equalizer: {
        ...prev.equalizer,
        enabled: event.target.checked
      }
    }));
  }
  
  // Handle temporary preset selection
  const handlePresetSelect = (preset) => {
    setTempSettings(prev => {
      // Apply preset values to temporary bands
      const newBands = prev.equalizer.bands.map((band, index) => {
        // If preset has a value for this band, use it, otherwise keep current gain
        const gain = index < preset.values.length ? preset.values[index] : band.gain;
        return { ...band, gain };
      });
      
      return {
        ...prev,
        equalizer: {
          bands: newBands,
          enabled: true
        }
      };
    });
  }
  
  // Handle temporary default volume change
  const handleDefaultVolumeChange = (event, newValue) => {
    setTempSettings(prev => ({
      ...prev,
      defaultVolume: newValue
    }));
  }
  
  // Handle temporary crossfade duration change
  const handleCrossfadeDurationChange = (event, newValue) => {
    setTempSettings(prev => ({
      ...prev,
      crossfadeDuration: newValue
    }));
  }

  // Format crossfade duration for display
  const formatCrossfadeDuration = (seconds) => {
    if (seconds === 0) return "Off";
    return `${seconds} sec${seconds === 1 ? '' : 's'}`;
  }
  
  // Format volume for display
  const formatVolume = (value) => {
    return `${Math.round(value * 100)}%`;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto', pb: 10 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, color: 'white', fontWeight: 700 }}>
        Audio Settings
      </Typography>
      
      {/* Status messages - fixed position notification */}
      {showNotification && (error || successMessage) && (
        <Box 
          sx={{ 
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 300,
            maxWidth: '80%',
            zIndex: 2000,
            transition: 'all 0.3s ease-in-out',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          <Alert 
            severity={error ? "error" : "success"} 
            variant="filled"
            sx={{ 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              '& .MuiAlert-icon': {
                fontSize: '1.5rem'
              }
            }}
            onClose={() => setShowNotification(false)}
          >
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {error || successMessage}
            </Typography>
          </Alert>
        </Box>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress sx={{ color: '#1DB954' }} />
          </Box>
        ) : (
        <>
          {/* Playback Settings */}
          <Paper 
            sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: 'rgba(40,40,40,0.7)', 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AudiotrackIcon sx={{ mr: 1.5, color: '#1DB954', fontSize: 28 }} />
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                Playback Settings
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4, opacity: 0.1 }} />
            
            <Grid container spacing={4}>
              {/* Default Volume */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <VolumeIcon sx={{ color: '#1DB954', mr: 1.5 }} />
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                      Default Volume
                    </Typography>
                  </Box>
                  
                  <Box sx={{ px: 1 }}>
                    <Slider
                      value={tempSettings.defaultVolume}
                      onChange={handleDefaultVolumeChange}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={formatVolume}
                      sx={{
                        color: '#1DB954',
                        '& .MuiSlider-thumb': {
                          width: 16,
                          height: 16,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>
                      Sets the default volume level when starting playback
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {/* Crossfade */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CompareIcon sx={{ color: '#1DB954', mr: 1.5 }} />
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                      Crossfade
                    </Typography>
                  </Box>
                  
                  <Box sx={{ px: 1 }}>
                    <Slider
                      value={tempSettings.crossfadeDuration}
                      onChange={handleCrossfadeDurationChange}
                      min={0}
                      max={12}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      valueLabelFormat={formatCrossfadeDuration}
                      sx={{
                        color: '#1DB954',
                        '& .MuiSlider-thumb': {
                          width: 16,
                          height: 16,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>
                      {tempSettings.crossfadeDuration === 0 
                        ? "Crossfade is turned off" 
                        : `Fades between songs over ${tempSettings.crossfadeDuration} second${tempSettings.crossfadeDuration === 1 ? '' : 's'}`}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
            
            {/* Discord RPC Settings */}
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                  Discord Rich Presence
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  p: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.08)'
                  }
                }}
                onClick={() => {
                  const newValue = !audioQuality.discordRPC;
                  handleQualityChange('discordRPC', newValue);
                  window.electron.discord.setEnabled(newValue);
                }}
              >
                <Box 
                  sx={{ 
                    width: 42,
                    height: 24,
                    borderRadius: 12,
                    bgcolor: audioQuality.discordRPC ? 'rgba(29,185,84,0.5)' : 'rgba(255,255,255,0.2)',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: 2,
                      left: audioQuality.discordRPC ? 'calc(100% - 22px)' : '2px',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: audioQuality.discordRPC ? '#1DB954' : '#f1f1f1',
                      transition: 'all 0.2s'
                    }}
                  />
                </Box>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {audioQuality.discordRPC ? 'On' : 'Off'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                    Show currently playing track on your Discord profile
                  </Typography>
                </Box>
              </Box>
              
              {/* Troubleshooting button */}
              <Box sx={{ mt: 2 }}>
                <Button 
                  size="small"
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const isRunning = await window.electron.discord?.isRunning?.();
                      const isEnabled = await window.electron.discord?.isEnabled?.();
                      const isConnected = await window.electron.discord?.isConnected?.();
                      
                      let message = '';
                      if (!isRunning) {
                        message = 'Discord is not running. Please start Discord and try again.';
                      } else if (!isEnabled) {
                        message = 'Discord RPC is disabled. Enable it using the toggle above.';
                      } else if (!isConnected) {
                        message = 'Discord is running but not connected. Try restarting Discord.';
                      } else {
                        message = 'Discord RPC appears to be working. If you still don\'t see activity, check the documentation.';
                      }
                      
                      setError(null);
                      setSuccessMessage(message);
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 10000);
                    } catch (error) {
                      console.error('Error checking Discord status:', error);
                      setSuccessMessage(null);
                      setError('Failed to check Discord status: ' + error.message);
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 10000);
                    }
                  }}
                  sx={{ 
                    fontSize: '0.75rem',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  Troubleshoot Discord Integration
                </Button>
              </Box>
            </Box>
          </Paper>
          
          {/* Equalizer Section */}
          <Paper 
            sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: 'rgba(40,40,40,0.7)', 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EqualizerIcon sx={{ mr: 1.5, color: '#1DB954', fontSize: 28 }} />
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                  Equalizer
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={tempSettings.equalizer.enabled}
                    onChange={handleEqualizerToggle}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#1DB954',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#1DB954',
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {tempSettings.equalizer.enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                }
                sx={{ mr: 0 }}
              />
            </Box>
            
            <Divider sx={{ mb: 4, opacity: 0.1 }} />
            
            {/* Equalizer Presets */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                Presets
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {equalizerPresets.map((preset, index) => (
                  <Chip
                    key={index}
                    label={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(29,185,84,0.3)',
                      },
                      '&.MuiChip-root': {
                        borderRadius: 2,
                        py: 0.5,
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            {/* Equalizer Sliders */}
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                height: 220,
                position: 'relative',
                opacity: tempSettings.equalizer.enabled ? 1 : 0.6,
                transition: 'opacity 0.3s ease'
              }}
            >
              {/* Background grid lines */}
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                  pointerEvents: 'none'
                }}
              >
                {/* Horizontal grid lines */}
                {[-12, -9, -6, -3, 0, 3, 6, 9, 12].map((line, idx) => (
                  <Box 
                    key={`line-${idx}`}
                    sx={{ 
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '1px',
                      backgroundColor: line === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                      top: `${50 + (line * -3.5)}%` // Convert dB to position
                    }}
                  />
                ))}
              </Box>
              
              {/* Equalizer bands */}
              {tempSettings.equalizer.bands.map((band, index) => (
                <Box 
                  key={band.id} 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    flex: 1,
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <Slider
                    orientation="vertical"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={band.gain}
                    onChange={(_, value) => handleEqualizerBandChange(band.id, value)}
                    sx={{
                      height: 150,
                      width: 2,
                      padding: '13px 13px',
                      '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        backgroundColor: '#1DB954',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#1DB954',
                        border: 'none',
                        width: 4
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        width: 4
                      }
                    }}
                    disabled={!tempSettings.equalizer.enabled}
                  />
                  <Typography variant="caption" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
                    {band.frequency < 1000 ? band.frequency : `${band.frequency/1000}K`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                    {band.gain > 0 ? `+${band.gain}` : band.gain}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Note: Equalizer settings apply to all songs and require the Web Audio API.
              </Typography>
            </Box>
          </Paper>
          
          {/* Quality Settings */}
          <Paper 
            sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: 'rgba(40,40,40,0.7)', 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AudiotrackIcon sx={{ mr: 1.5, color: '#1DB954', fontSize: 28 }} />
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                Audio Quality
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4, opacity: 0.1 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WifiIcon sx={{ color: '#1DB954', mr: 1.5 }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    WiFi Streaming
                  </Typography>
                </Box>
                
                <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                  <InputLabel id="wifi-quality-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>Quality</InputLabel>
                  <Select
                    labelId="wifi-quality-label"
                    value={audioQuality.wifiStreamingQuality}
                    onChange={(e) => handleQualityChange('wifiStreamingQuality', e.target.value)}
                    label="Quality"
                    sx={{
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '.MuiSvgIcon-root': {
                        color: 'rgba(255,255,255,0.7)',
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#333',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            },
                            '&.Mui-selected': {
                              bgcolor: 'rgba(29,185,84,0.2)'
                            }
                          }
                        }
                      }
                    }}
                  >
                    {qualityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>
                  {getQualityDetails(audioQuality.wifiStreamingQuality).description}
                </Typography>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DataIcon sx={{ color: '#1DB954', mr: 1.5 }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    Cellular Data Streaming
                </Typography>
                </Box>
                
                <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                  <InputLabel id="data-quality-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>Quality</InputLabel>
                  <Select
                    labelId="data-quality-label"
                    value={audioQuality.dataStreamingQuality}
                    onChange={(e) => handleQualityChange('dataStreamingQuality', e.target.value)}
                    label="Quality"
                    sx={{ 
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '.MuiSvgIcon-root': {
                        color: 'rgba(255,255,255,0.7)',
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#333',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            },
                            '&.Mui-selected': {
                              bgcolor: 'rgba(29,185,84,0.2)'
                            }
                          }
                        }
                      }
                    }}
                  >
                    {qualityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>
                  {getQualityDetails(audioQuality.dataStreamingQuality).description}
                </Typography>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DownloadIcon sx={{ color: '#1DB954', mr: 1.5 }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    Download Quality
                  </Typography>
                </Box>
                
                <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                  <InputLabel id="download-quality-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>Quality</InputLabel>
                  <Select
                    labelId="download-quality-label"
                    value={audioQuality.downloadQuality}
                    onChange={(e) => handleQualityChange('downloadQuality', e.target.value)}
                    label="Quality"
                    sx={{ 
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '.MuiSvgIcon-root': {
                        color: 'rgba(255,255,255,0.7)',
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#333',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            },
                            '&.Mui-selected': {
                              bgcolor: 'rgba(29,185,84,0.2)'
                            }
                          }
                        }
                      }
                    }}
                  >
                    {qualityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>
                  {getQualityDetails(audioQuality.downloadQuality).description}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mt: 1, ml: 1 }}>
                  Higher quality downloads use more storage space.
                </Typography>
              </Box>
              
              {/* Audio Normalization Option */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AudiotrackIcon sx={{ color: '#1DB954', mr: 1.5 }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    Audio Normalization
                  </Typography>
                </Box>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 2,
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onClick={() => handleQualityChange('normalization', !audioQuality.normalization)}
                >
                  <Box 
                    sx={{ 
                      width: 42,
                      height: 24,
                      borderRadius: 12,
                      bgcolor: audioQuality.normalization ? 'rgba(29,185,84,0.5)' : 'rgba(255,255,255,0.2)',
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: 2,
                        left: audioQuality.normalization ? 'calc(100% - 22px)' : '2px',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: audioQuality.normalization ? '#1DB954' : '#f1f1f1',
                        transition: 'all 0.2s'
                      }}
                    />
                  </Box>
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      {audioQuality.normalization ? 'On' : 'Off'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                      Adjust volume levels for consistent playback across all tracks
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
          
          {/* User session information */}
          <Paper 
            sx={{ 
              p: 4, 
              bgcolor: 'rgba(40,40,40,0.7)', 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <InfoIcon sx={{ mr: 1.5, color: '#1DB954', fontSize: 28 }} />
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                Account & Application
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4, opacity: 0.1 }} />
            
            <List>
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={handleRefreshUserData}
                  sx={{ 
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <RefreshIcon sx={{ color: '#1DB954' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Refresh User Data" 
                    secondary="Update playlists, favorites, and user information"
                    primaryTypographyProps={{ color: 'white', fontWeight: 600 }}
                    secondaryTypographyProps={{ color: 'rgba(255,255,255,0.6)' }}
                  />
                </ListItemButton>
              </ListItem>
              
              <Divider sx={{ my: 2, opacity: 0.1 }} />
              
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={openLogoutDialog}
                  sx={{ 
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon sx={{ color: '#ff5252' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Log Out" 
                    secondary="Sign out from your Jellyfin account"
                    primaryTypographyProps={{ color: 'white', fontWeight: 600 }}
                    secondaryTypographyProps={{ color: 'rgba(255,255,255,0.6)' }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>
          
          {/* Application info */}
          <Card sx={{ 
            p: 4, 
            mb: 20, /* Reduced margin but still enough to prevent overlap */
            mt: 4,
            bgcolor: 'rgba(40,40,40,0.7)', 
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            position: 'relative', /* Position relative to ensure proper stacking */
            zIndex: 1 /* Ensure it's above other elements */
          }}>
            <CardContent sx={{ p: 0 }}>
              <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                About Jellify
              </Typography>
              
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                A modern music player for Jellyfin with Spotify-inspired UI
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StorageIcon sx={{ color: '#1DB954', mr: 1.5, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Server: {' '}
                    <Chip 
                      label={
                        // Try to extract server name from different sources
                        userInfo?.ServerName || 
                        (serverUrl ? new URL(serverUrl).hostname : null) || 
                        (userInfo?.ServerAddress ? new URL(userInfo.ServerAddress).hostname : null) || 
                        'Unknown'
                      } 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(29,185,84,0.2)', 
                        color: '#1DB954',
                        fontWeight: 600,
                        ml: 1
                      }} 
                    />
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Connection Status: {' '}
                    <Chip 
                      label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'} 
                      size="small" 
                      sx={{ 
                        bgcolor: connectionStatus === 'connected' ? 'rgba(29,185,84,0.2)' : 'rgba(255,82,82,0.2)', 
                        color: connectionStatus === 'connected' ? '#1DB954' : '#ff5252',
                        fontWeight: 600,
                        ml: 1
                      }} 
                    />
                  </Typography>
                </Box>
              
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Version: {' '}
                    <Chip 
                      label="0.9.0-beta" 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(29,185,84,0.2)', 
                        color: '#1DB954',
                        fontWeight: 600,
                        ml: 1
                      }} 
                    />
                  </Typography>
                </Box>
                
                {userInfo?.ServerAddress && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      URL: {userInfo.ServerAddress}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Permanent Save Button */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', mb: 10 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || !settingsChanged}
              sx={{ 
                borderRadius: 28, 
                px: 5,
                py: 1.8,
                fontWeight: 600,
                fontSize: '1rem',
                bgcolor: '#1DB954',
                '&:hover': {
                  bgcolor: '#1ed760'
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)'
                },
                minWidth: 200,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transform: settingsChanged ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            >
              {saving ? 'Saving...' : settingsChanged ? 'Save Settings' : 'No Changes'}
            </Button>
          </Box>
        </>
      )}
      
      {/* Add version at the bottom */}
      <Box sx={{ 
        mt: 4, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        opacity: 0.7 
      }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Jellify <Chip 
            label="Beta" 
            size="small" 
            sx={{ 
              height: 20, 
              fontSize: '0.65rem', 
              backgroundColor: '#1DB954', 
              ml: 1,
              color: 'black',
              fontWeight: 'bold' 
            }} 
          />
        </Typography>
      </Box>
      
      {/* Logout Confirmation Dialog */}
      <Dialog
        open={confirmLogoutDialogOpen}
        onClose={closeLogoutDialog}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(50,50,50,0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: 'white'
          }
        }}
      >
        <DialogTitle id="logout-dialog-title" sx={{ fontWeight: 700 }}>
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to log out of your Jellyfin account?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={closeLogoutDialog}
            sx={{ 
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLogout} 
            variant="contained"
            sx={{ 
              bgcolor: '#ff5252',
              '&:hover': {
                bgcolor: '#ff6e6e'
              }
            }}
          >
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Settings 