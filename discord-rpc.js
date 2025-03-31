const DiscordRPC = require('discord-rpc');
const { ipcMain } = require('electron');
const Store = require('electron-store');
const axios = require('axios');
const { exec } = require('child_process');
const os = require('os');

// Create a store for Discord RPC settings
const store = new Store();

// =============================================
// Discord Rich Presence Configuration
// =============================================

// Your Discord application client ID from the Discord Developer Portal
// THIS MUST BE FROM AN APPLICATION SET TO "LISTENING" ACTIVITY TYPE
// https://discord.com/developers/applications
const CLIENT_ID = 'CLIENT_ID'; 

// =============================================
// IMPORTANT: If Discord shows "Playing Jellify" instead of "Listening to Jellify":
// 1. Go to the Discord Developer Portal: https://discord.com/developers/applications
// 2. Select your application
// 3. On the General Information page, find "Activity Type" and set it to "LISTENING"
// 4. Save changes and restart Discord completely
// =============================================

// Helper function to check if Discord is running
function isDiscordRunning() {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = 'tasklist | findstr /i "Discord.exe"';
    } else if (platform === 'darwin') {
      command = 'ps -ax | grep -i "Discord" | grep -v "grep"';
    } else {
      command = 'ps -A | grep -i "discord" | grep -v "grep"';
    }
    
    exec(command, (error, stdout) => {
      const isRunning = !!stdout.trim();
      console.log('Discord is', isRunning ? 'running' : 'not running');
      resolve(isRunning);
    });
  });
}

// RPC client instance
let rpc = null;
let connected = false;
let enabled = store.get('discord.rpcEnabled', true);
let lastActivity = null;
let lastImageUrl = null;

// Album art cache to avoid repeated requests
const albumArtCache = new Map();

// Initialize RPC
async function initRPC() {
  // If RPC is disabled, don't initialize
  if (!enabled) {
    console.log('Discord RPC is disabled, not initializing');
    return;
  }

  console.log('Discord RPC: Initializing...');
  
  // Check if Discord is running first
  const discordRunning = await isDiscordRunning();
  if (!discordRunning) {
    console.log('Discord RPC: Discord is not running, cannot initialize');
    return;
  }

  try {
    // Create new client
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    
    // Register event handlers
    rpc.on('ready', () => {
      console.log('Discord RPC: Connected successfully');
      connected = true;
      
      // If we had a previous activity, restore it
      if (lastActivity) {
        // Reduced logging
        // console.log('Restoring previous activity');
        rpc.setActivity(lastActivity);
      }
      
      // Display an important notice about activity type
      console.log('\n\n----------------------------------------------');
      console.log('IMPORTANT: If Discord shows "Playing Jellify" instead of "Listening to Jellify",');
      console.log('you need to change your application settings:');
      console.log('1. Go to Discord Developer Portal');
      console.log('2. Find your application');
      console.log('3. Set "Activity Type" to "LISTENING"');
      console.log('4. Restart Discord completely');
      console.log('----------------------------------------------\n\n');
    });
    
    // Log errors
    rpc.on('error', (error) => {
      console.error('Discord RPC error:', error);
      connected = false;
    });
    
    // Disconnect handler
    rpc.on('disconnected', () => {
      console.log('Discord RPC: Disconnected');
      connected = false;
      
      // Try to reconnect after a delay if still enabled
      if (enabled) {
        console.log('Discord RPC: Will attempt to reconnect in 10 seconds');
        setTimeout(() => {
          console.log('Discord RPC: Attempting to reconnect...');
          initRPC().catch(console.error);
        }, 10000); // Wait 10 seconds before trying to reconnect
      }
    });
    
    console.log('Discord RPC: Logging in...');
    // Simplify login to just use clientId
    await rpc.login({ clientId: CLIENT_ID }).catch(error => {
      console.error('Discord RPC login error:', error);
      throw error;
    });
    
    console.log('Discord RPC: Initialized with "Listening to" activity type');
  } catch (error) {
    console.error('Failed to initialize Discord RPC:', error);
    connected = false;
    rpc = null;
  }
}

// Function to fetch and convert album art to Discord-compatible URL
async function getAlbumArtUrl(trackData) {
  // If no image URL is provided, return default logo
  if (!trackData.imageUrl) {
    return 'logo';
  }

  // Check if we've already processed this image URL
  if (albumArtCache.has(trackData.imageUrl)) {
    return albumArtCache.get(trackData.imageUrl);
  }

  try {
        // Check if the track has genre information
    if (trackData.genre) {
      const genre = trackData.genre.toLowerCase();
      
      // Return appropriate genre icon if available
      if (genre.includes('rock')) {
        albumArtCache.set(trackData.imageUrl, 'rock');
        return 'rock';
      }
      if (genre.includes('pop')) {
        albumArtCache.set(trackData.imageUrl, 'pop');
        return 'pop';  
      }
      if (genre.includes('electronic') || 
          genre.includes('techno') || 
          genre.includes('house') || 
          genre.includes('edm')) {
        albumArtCache.set(trackData.imageUrl, 'electronic');
        return 'electronic';
      }
      if (genre.includes('classical')) {
        albumArtCache.set(trackData.imageUrl, 'classical');
        return 'classical';
      }
      if (genre.includes('jazz')) {
        albumArtCache.set(trackData.imageUrl, 'jazz');
        return 'jazz';
      }
      if (genre.includes('hip-hop') || genre.includes('rap')) {
        albumArtCache.set(trackData.imageUrl, 'hip-hop');
        return 'hip-hop';
      }
      if (genre.includes('ambient') || genre.includes('chill')) {
        albumArtCache.set(trackData.imageUrl, 'ambient');
        return 'ambient';
      }
    }
    
    // Try to detect genre from album or artist name
    const albumAndArtist = `${trackData.album || ''} ${trackData.artist || ''}`.toLowerCase();
    
    if (albumAndArtist.includes('rock') || 
        albumAndArtist.includes('metal') || 
        albumAndArtist.includes('punk')) {
      albumArtCache.set(trackData.imageUrl, 'rock');
      return 'rock';
    }
    
    if (albumAndArtist.includes('pop') || albumAndArtist.includes('chart')) {
      albumArtCache.set(trackData.imageUrl, 'pop');
      return 'pop';
    }
    
    if (albumAndArtist.includes('electronic') || 
        albumAndArtist.includes('techno') || 
        albumAndArtist.includes('house') || 
        albumAndArtist.includes('dj') ||
        albumAndArtist.includes('edm')) {
      albumArtCache.set(trackData.imageUrl, 'electronic');
      return 'electronic';
    }
    
    if (albumAndArtist.includes('classical') || 
        albumAndArtist.includes('symphony') || 
        albumAndArtist.includes('orchestra')) {
      albumArtCache.set(trackData.imageUrl, 'classical');
      return 'classical';
    }
    
    if (albumAndArtist.includes('jazz') || albumAndArtist.includes('blues')) {
      albumArtCache.set(trackData.imageUrl, 'jazz');
      return 'jazz';
    }
    
    if (albumAndArtist.includes('hip-hop') || 
        albumAndArtist.includes('rap') || 
        albumAndArtist.includes('r&b')) {
      albumArtCache.set(trackData.imageUrl, 'hip-hop');
      return 'hip-hop';
    }
    
    if (albumAndArtist.includes('ambient') || 
        albumAndArtist.includes('chill') || 
        albumAndArtist.includes('relax')) {
      albumArtCache.set(trackData.imageUrl, 'ambient');
      return 'ambient';
    }
    
    // If no genre detected, cache the default logo
    albumArtCache.set(trackData.imageUrl, 'logo');
    return 'logo';
  } catch (error) {
    console.error('Error processing album art for Discord:', error);
    return 'logo';
  }
}

// Create a text-based progress bar
function createProgressBar(percentage) {
  const barLength = 10;
  const filledLength = Math.floor((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;
  
  // Use Unicode block characters for a more visually appealing progress bar
  const filled = '█'.repeat(filledLength);
  const empty = '▒'.repeat(emptyLength);
  
  return `${filled}${empty} ${percentage}%`;
}

// Update presence with track info
async function updatePresence(trackData) {
  if (!enabled) {
    return false;
  }
  
  if (!rpc || !connected) {
    return false;
  }
  
  
  try {
    const now = Date.now();
    
    // Format time 
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate current and total time
    const currentTimeFormatted = formatTime(trackData.currentTime || 0);
    const totalTimeFormatted = formatTime(trackData.duration || 0);
    
    // Create time display 
    const timeDisplay = `${currentTimeFormatted} / ${totalTimeFormatted}`;
    
    // Calculate 
    const elapsed = Math.floor(trackData.currentTime || 0);
    const total = Math.floor(trackData.duration || 0);
    
    // Calculate 
    const progressPercent = total > 0 ? Math.min(100, Math.floor((elapsed / total) * 100)) : 0;
    
    const progressBar = createProgressBar(progressPercent);
    
    // Activity object 
    const activity = {
      type: 2, 
      details: trackData.name || 'Unknown track',
      state: `by ${trackData.artist || 'Unknown artist'}`,
      assets: {
        large_image: 'logo', // Our app logo as the main image
        large_text: trackData.album || 'Jellify Music Player',
        small_image: trackData.isPlaying ? 'playing' : 'paused',
        small_text: trackData.isPlaying ? 'Playing' : 'Paused'
      },

      instance: false,
      buttons: [
        { label: `${progressBar} ${currentTimeFormatted} / ${totalTimeFormatted}`, url: 'https://jellify.app' }
      ]
    };
    
    // Save 
    lastActivity = activity;
    
    await rpc.setActivity(activity);
    
    if (Math.random() < 0.05) { 
      console.log('Discord RPC updated with "Listening to" activity');
    }
    return true;
  } catch (error) {
    console.error('Failed to update Discord presence:', error);
    return false;
  }
}

// Clear presence
async function clearPresence() {
  if (!rpc || !connected) return;
  
  try {
    await rpc.clearActivity();
    lastActivity = null;
    lastImageUrl = null;
  } catch (error) {
    console.error('Failed to clear Discord presence:', error);
  }
}

// Set enabled state
function setEnabled(value) {
  enabled = !!value;
  store.set('discord.rpcEnabled', enabled);
  
  if (enabled && !rpc) {
    // Initialize RPC if it was disabled and is now enabled
    initRPC();
  } else if (!enabled && rpc) {
    // Clear presence and disconnect if it was enabled and is now disabled
    clearPresence();
    
    // Disconnect if connected
    if (connected) {
      rpc.destroy().catch(console.error);
    }
    
    rpc = null;
    connected = false;
  }
  
  return enabled;
}

// Register IPC handlers for Discord RPC
function registerIpcHandlers() {
  // Handle requests to update Discord presence
  ipcMain.handle('discord-update-activity', async (event, trackData) => {
    return updatePresence(trackData);
  });
  
  // Handle requests to clear Discord presence
  ipcMain.handle('discord-clear-activity', async () => {
    return clearPresence();
  });
  
  // Handle requests to enable/disable Discord RPC
  ipcMain.handle('discord-set-enabled', async (event, enabled) => {
    const wasEnabled = setEnabled(enabled);
    
    // Initialize RPC if enabling
    if (enabled && !connected) {
      await initRPC();
    }
    
    return wasEnabled;
  });
  
  // Check if Discord RPC is enabled
  ipcMain.handle('discord-is-enabled', () => {
    return enabled;
  });
  
  // Check if Discord RPC is connected
  ipcMain.handle('discord-is-connected', () => {
    return connected && enabled;
  });
  
  // Check if Discord is running
  ipcMain.handle('discord-is-running', async () => {
    return await isDiscordRunning();
  });
}

// Initialize Discord RPC on module load
initRPC().catch(console.error);

// Export functions
module.exports = {
  initRPC,
  updatePresence,
  clearPresence,
  setEnabled,
  registerIpcHandlers,
  isConnected: () => connected && enabled,
  isDiscordRunning
}; 
