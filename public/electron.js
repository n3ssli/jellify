const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Determine if we are in production or development
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, isDev ? '../preload.js' : './preload.js')
    }
  });

  // Load the app
  if (isDev) {
    // In development, load from the dev server
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load from the build folder
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, './index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, applications keep their menu bar active until the user quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (mainWindow === null) {
    createWindow();
  }
});

// Import additional application logic if main.js exists in the directory above
const mainJsPath = isDev ? './main.js' : '../main.js';
try {
  if (fs.existsSync(path.join(__dirname, mainJsPath))) {
    require(mainJsPath);
  }
} catch (error) {
  console.error('Error loading main.js:', error);
}

// This file is just a bridge to ensure electron-builder can find the entry point
// The actual app logic is in main.js at the project root 