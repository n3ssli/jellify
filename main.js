const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('path')
const Store = require('electron-store')
const fs = require('fs')

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  return;
}

// Initialize electron-store
const store = new Store()

// Import Discord RPC module
const discordRPC = require('./discord-rpc')

// Handle protocol urls
function handleAppUrl(url) {
  console.log('Received URL:', url)
}

let mainWindow

// Register custom protocol handler
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('jellify', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('jellify')
}

// Check if preload.js exists
const preloadPath = path.join(__dirname, 'preload.js')
console.log('Preload script exists:', fs.existsSync(preloadPath))

// isDev will be true if the app is running with "npm run dev" or "npm start"
const isDev = process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development'

const createWindow = () => {
  console.log('Creating window...')
  console.log('Running in development mode:', isDev)
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false,
      allowRunningInsecureContent: true,
      devTools: true
    },
    backgroundColor: '#121212',
    title: 'Jellify',
    icon: isDev ? path.join(__dirname, 'public/logo.png') : path.join(__dirname, 'logo.png')
  })

  // Hide menu bar completely
  mainWindow.setMenuBarVisibility(false)

  // Disable keyboard shortcuts for DevTools (Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Check for Ctrl+Shift+I or F12
    if ((input.control && input.shift && input.key === 'I') || input.key === 'F12') {
      event.preventDefault();
    }
  });

  // Set Content-Security-Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; connect-src * data: blob:;"]
      }
    })
  })

  // Load the index.html of the app
  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './build/index.html')}`)

  // Handle navigation events
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent navigation to external URLs
    if (!url.startsWith('http://localhost:3000') && !url.startsWith('file://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
  
  // Listen for errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
    // If in development mode and we fail to load, try again after a short delay
    // This helps when the dev server hasn't fully started yet
    if (isDev && url.includes('localhost')) {
      console.log('Retrying to connect to dev server...')
      setTimeout(() => {
        mainWindow?.loadURL(url)
      }, 1000)
    }
  })
  
  // Register success handler
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully')
  })

  // Listen for console messages from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer (${sourceId}:${line}): ${message}`)
  })
  
  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('App is ready')
  createWindow()
  
  // Initialize Discord connection IPC handlers
  discordRPC.registerIpcHandlers();
  
  // Mac-specific: Handle protocol when app is already running
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleAppUrl(url);
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Single instance lock - prevent multiple instances of the app
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    
    // Check if the second instance was launched with a URL
    const url = commandLine.find((arg) => arg.startsWith('jellify://'))
    if (url) {
      handleAppUrl(url)
    }
  }
})

// Handle app quit - clean up Discord connection
app.on('quit', () => {
  try {
    if (discordRPC && discordRPC.isConnected && discordRPC.isConnected()) {
      if (typeof discordRPC.clearActivity === 'function') {
        discordRPC.clearActivity();
      }
    }
  } catch (error) {
    console.error('Error clearing Discord activity on quit:', error);
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC handlers for Jellyfin integration
ipcMain.handle('get-server-url', () => {
  return store.get('jellyfin.serverUrl', '')
})

ipcMain.handle('set-server-url', (event, url) => {
  console.log('IPC: set-server-url called with', url)
  store.set('jellyfin.serverUrl', url)
  return url
})

ipcMain.handle('get-auth-token', () => {
  return store.get('jellyfin.authToken', '')
})

ipcMain.handle('set-auth-token', (event, token) => {
  console.log('IPC: set-auth-token called')
  store.set('jellyfin.authToken', token)
  return token
})

// Simplified handler for Jellyfin authentication through main process
ipcMain.handle('jellyfin-authenticate', async (event, { serverUrl, username, password }) => {
  console.log('IPC: jellyfin-authenticate called')
  
  try {
    // Validate the server URL
    let url = serverUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    
    // Remove trailing slash if present
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Create device-specific identifier for this client
    const deviceId = store.get('deviceId') || `jellify-electron-${Math.random().toString(36).substring(2, 9)}`;
    store.set('deviceId', deviceId);
    
    // Define client info for Jellyfin server
    const DEVICE_NAME = 'Jellify Electron App';
    const CLIENT_NAME = 'Jellify';
    const CLIENT_VERSION = 'Beta';
    
    const axios = require('axios');
    
    // Create authentication headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${deviceId}", Version="${CLIENT_VERSION}"`,
      'Accept': 'application/json'
    };
    
    // Create standard Jellyfin authentication payload
    const payload = {
      Username: username,
      Pw: password
    };
    
    // Attempt authentication with Jellyfin server
    console.log(`Authenticating with Jellyfin server at ${url}`);
    
    try {
      // Test server connectivity first
      await axios.get(`${url}/System/Ping`, { timeout: 5000 });
      console.log('Server ping successful');
    } catch (pingError) {
      console.error('Server ping failed:', pingError.message);
      return {
        success: false,
        error: 'Could not connect to Jellyfin server. Please verify the server URL and ensure the server is running.',
        statusCode: pingError.response?.status || 0
      };
    }
    
    // Attempt authentication
    const response = await axios.post(
      `${url}/Users/AuthenticateByName`,
      payload,
      {
        headers,
        timeout: 10000
      }
    );
    
    // If successful, return the token and user info
    if (response.data.AccessToken) {
      console.log('Authentication successful!');
      return {
        success: true,
        token: response.data.AccessToken,
        userId: response.data.User?.Id
      };
    } else {
      return {
        success: false,
        error: 'Authentication failed: No access token received',
        statusCode: response.status
      };
    }
    
  } catch (error) {
    console.error('Authentication error in main process:', error);
    
    let errorMessage = "Connection failed";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "Connection timed out";
    } else if (error.response) {
      // Handle specific status codes
      switch (error.response.status) {
        case 400:
          errorMessage = "Invalid request format - Server rejected the request";
          break;
        case 401:
          errorMessage = "Invalid username or password";
          break;
        case 404:
          errorMessage = "Endpoint not found - Please check server URL";
          break;
        case 500:
          errorMessage = "Server error - Please try again later";
          break;
        default:
          errorMessage = `Unexpected error (${error.response.status})`;
      }
    } else if (error.request) {
      errorMessage = "No response from server - Check network connection";
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode: error.response?.status
    };
  }
})

// Additional IPC handlers for app-specific functionality
ipcMain.handle('save-user-settings', (event, settings) => {
  console.log('IPC: save-user-settings called')
  store.set('userSettings', settings)
  return settings
})

ipcMain.handle('get-user-settings', () => {
  console.log('IPC: get-user-settings called')
  return store.get('userSettings', {
    theme: 'dark',
    language: 'en',
    audioQuality: 'high'
  })
})

// Check if app was launched via protocol URL on macOS or Linux
if (process.platform !== 'win32') {
  const url = process.argv.find((arg) => arg.startsWith('jellify://'))
  if (url) {
    handleAppUrl(url)
  }
}

// Initialize Discord RPC IPC handlers
// discordRPC.registerIpcHandlers(); 