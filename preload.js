const { contextBridge, ipcRenderer } = require('electron')

// Log when the preload script is running
console.log('Preload script is running')

// Expose protected methods that allow the renderer process to communicate with
// the main process via IPC
contextBridge.exposeInMainWorld('electron', {
  // Jellyfin server configuration
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  setAuthToken: (token) => ipcRenderer.invoke('set-auth-token', token),
  
  // Clear credentials methods
  clearServerUrl: () => ipcRenderer.invoke('set-server-url', ''),
  clearAuthToken: () => ipcRenderer.invoke('set-auth-token', ''),
  
  // Add new authentication method
  authenticateJellyfin: (serverUrl, username, password) => 
    ipcRenderer.invoke('jellyfin-authenticate', { serverUrl, username, password }),
  
  // User settings
  getUserSettings: () => ipcRenderer.invoke('get-user-settings'),
  saveUserSettings: (settings) => ipcRenderer.invoke('save-user-settings', settings),
  
  // Media control methods
  playerControl: {
    play: () => ipcRenderer.send('media-play'),
    pause: () => ipcRenderer.send('media-pause'),
    next: () => ipcRenderer.send('media-next'),
    previous: () => ipcRenderer.send('media-previous'),
    setVolume: (volume) => ipcRenderer.send('media-set-volume', volume),
    seekTo: (position) => ipcRenderer.send('media-seek', position)
  },

  // Discord RPC functionality
  discord: {
    // Update Discord activity
    updateActivity: (trackData) => ipcRenderer.invoke('discord-update-activity', trackData),
    // Clear Discord activity
    clearActivity: () => ipcRenderer.invoke('discord-clear-activity'),
    // Check if Discord RPC is enabled
    isEnabled: () => ipcRenderer.invoke('discord-is-enabled'),
    // Set Discord RPC enabled state
    setEnabled: (enabled) => ipcRenderer.invoke('discord-set-enabled', enabled),
    // Check if connected to Discord
    isConnected: () => ipcRenderer.invoke('discord-is-connected'),
    // Check if Discord is running
    isRunning: () => ipcRenderer.invoke('discord-is-running')
  },

  // Add a simple test method to confirm the API is working
  isElectron: true,
  ping: () => "pong"
}) 