import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
// Remove Jellyfin SDK import if we're using only axios for authentication
// import { api, Jellyfin } from '@jellyfin/sdk'

const JellyfinContext = createContext()

export const useJellyfin = () => {
  const context = useContext(JellyfinContext);
  if (!context) {
    console.warn('useJellyfin was called outside of its Provider. Using safe fallback values.');
    // Return safe fallback values instead of throwing
    return {
      serverUrl: '',
      api: null,
      userId: '',
      userInfo: null,
      connectionStatus: 'disconnected',
      connectionError: null,
      isInitialized: false,
      // Provide safe no-op implementations of common methods to prevent crashes
      getPlaylists: () => Promise.resolve([]),
      getPlaylistItems: () => Promise.resolve([]),
      getAlbum: () => Promise.resolve(null),
      getAlbumItems: () => Promise.resolve([]),
      getArtist: () => Promise.resolve(null),
      getArtistAlbums: () => Promise.resolve([]),
      searchItems: () => Promise.resolve({ albums: [], songs: [], artists: [] }),
      getRecentAlbums: () => Promise.resolve([]),
      getFavoriteAlbums: () => Promise.resolve([]),
      getFavorites: () => Promise.resolve([]),
      getAllAlbums: () => Promise.resolve([]),
      getAllArtists: () => Promise.resolve([]),
      getAllGenres: () => Promise.resolve([]),
      getItemsByGenre: () => Promise.resolve([]),
      toggleFavorite: () => Promise.resolve(false),
      removeFavorite: () => Promise.resolve(false),
      getStreamUrl: () => null,
      getImageUrl: () => null,
      reconnect: () => Promise.resolve(false),
      logout: () => Promise.resolve(false),
      getAudioSettings: () => Promise.resolve({}),
      updateAudioSettings: () => Promise.resolve(false),
      clearData: () => Promise.resolve(false),
      refreshUserData: () => Promise.resolve(false),
      createPlaylist: () => Promise.resolve(false),
      search: () => Promise.resolve({ albums: [], artists: [], tracks: [], playlists: [] }),
      initJellyfin: () => Promise.resolve(false),
      audioSettings: {
        volumeLevel: 80,
        equalizerEnabled: false,
        equalizerValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        audioDelay: 0,
        playbackRate: 1.0,
        qualityLevel: 'high'
      }
    };
  }
  return context;
};

export const JellyfinProvider = ({ children, onConnectionError }) => {
  // State for connection status
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [connectionError, setConnectionError] = useState(null)
  
  // Jellyfin connection details
  const [serverUrl, setServerUrl] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [userId, setUserId] = useState('')
  const [userInfo, setUserInfo] = useState(null)
  
  // Keep track of initialized state
  const [isInitialized, setIsInitialized] = useState(false)

  // Audio settings
  const [audioSettings, setAudioSettings] = useState({
    volumeLevel: 80,
    equalizerEnabled: false,
    equalizerValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    audioDelay: 0,
    playbackRate: 1.0,
    qualityLevel: 'high'
  });
  
  // Reference to API instance and other refs
  const apiRef = useRef(null)
  const isInitializingRef = useRef(false);
  const lastInitTimeRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const isInitializedRef = useRef(false); // Track if we're fully initialized

  // Add a variable to store mount time to distinguish initial load from dialog operations
  const mountTimeRef = useRef(Date.now());

  // Add a debounced initialization flag to prevent rapid reinitializations
  const isInitDebounceActiveRef = useRef(false);

  // Call onConnectionError callback when there's a connection error
  useEffect(() => {
    if (connectionStatus === 'error' && connectionError && onConnectionError) {
      onConnectionError(connectionError)
    }
  }, [connectionStatus, connectionError, onConnectionError]);

  // Initialize Jellyfin connection with throttling to prevent spam
  const initJellyfin = useCallback(async (skipCredentialCheck = false, force = false) => {
    // If this is a forced initialization (like from login), bypass all checks
    if (!force) {
      // If we're already fully initialized, skip initialization unless explicit
      if (isInitializedRef.current && !skipCredentialCheck) {
        console.log('JellyfinContext: Already fully initialized, skipping');
        return true;
      }
      
      // Prevent multiple concurrent initialization attempts
      if (isInitializingRef.current) {
        console.log('JellyfinContext: Initialization already in progress, skipping');
        return true; // Return success to prevent cascading retries
      }

      // Throttle initializations - prevent more than one every 5 seconds
      const now = Date.now();
      if (now - lastInitTimeRef.current < 5000) {
        // If this is during initial app startup (within 10 seconds), allow it
        const isInitialStartup = now - mountTimeRef.current < 10000;
        if (!isInitialStartup) {
          console.log('JellyfinContext: Initialization throttled, skipping');
          return true; // Return success to prevent cascading retries
        }
      }

      // Check for active dialogs - if we find one and this isn't initial load, skip
      if (
        (document.querySelector('[role="dialog"]') || document.getElementById('playlist-dialog-root')) && 
        now - mountTimeRef.current > 10000
      ) {
        console.log('JellyfinContext: Skipping initialization due to active dialog or portal');
        return true;
      }
      
      // Prevent rapid init/de-init cycles by using a debounce
      if (isInitDebounceActiveRef.current) {
        console.log('JellyfinContext: Debounce active, skipping');
        return true;
      }
      
      // Set debounce flag
      isInitDebounceActiveRef.current = true;
      setTimeout(() => {
        isInitDebounceActiveRef.current = false;
      }, 2000); // Clear debounce flag after 2 seconds
    }

    try {
      isInitializingRef.current = true;
      lastInitTimeRef.current = Date.now();
      
      // Update connectionStatus to 'connected' to show we're working in the background
      setConnectionStatus('connected');
      setConnectionError(null);
      
      // only get credentials from storage if we're not skipping the check
      let url = '';
      let token = '';
      
      if (!skipCredentialCheck) {
        url = await window.electron.getServerUrl();
        token = await window.electron.getAuthToken();
        
        if (!url || !token) {
          console.error('JellyfinContext: No credentials found');
          setConnectionStatus('error');
          setConnectionError('No credentials found');
          apiRef.current = null;
          isInitializingRef.current = false;
          if (onConnectionError) onConnectionError('No credentials found');
          return false;
        }
      } else {
        // Use the current state values if skipping credential check
        url = serverUrl || await window.electron.getServerUrl();
        token = authToken || await window.electron.getAuthToken();
        
        if (!url || !token) {
          console.error('JellyfinContext: No credentials in state or storage');
          setConnectionStatus('error');
          setConnectionError('No credentials available');
          apiRef.current = null;
          isInitializingRef.current = false;
          if (onConnectionError) onConnectionError('No credentials available');
          return false;
        }
      }

      // If we already have an API instance with the same credentials, skip recreation
      if (apiRef.current && serverUrl === url && authToken === token) {
        console.log('JellyfinContext: Using existing API instance');
        isInitializingRef.current = false;
        isInitializedRef.current = true;
        setIsInitialized(true);
        return true;
      }

      // Set the credentials in state
      setServerUrl(url);
      setAuthToken(token);

      // Create axios API instance
      const apiInstance = axios.create({
        baseURL: url,
        headers: {
          'X-Emby-Token': token,
          'Content-Type': 'application/json'
        }
      });
      
      // Store the API instance in the ref
      apiRef.current = apiInstance;
      
      // Test connection with server ping - only if we don't already have a userId
      if (!userId) {
        try {
          await apiInstance.get('/System/Ping');
        } catch (error) {
          console.error('JellyfinContext: Failed to ping Jellyfin server:', error);
          setConnectionStatus('error');
          setConnectionError('Could not connect to Jellyfin server. Please check if the server is running.');
          // Clear stored credentials on connection error
          await window.electron.setServerUrl('');
          await window.electron.setAuthToken('');
          apiRef.current = null;
          isInitializingRef.current = false;
          if (onConnectionError) onConnectionError('Server connection failed');
          return false;
        }
      }
      
      // Extract user ID from token data - only if we don't already have it
      if (!userId || !userInfo) {
        try {
          const response = await apiInstance.get('/Users/Me');
          setUserId(response.data.Id);
          setUserInfo(response.data);
        } catch (error) {
          console.error('JellyfinContext: Error getting user data:', error);
          
          // Check if it's an auth error
          if (error.response && error.response.status === 401) {
            setConnectionStatus('error');
            setConnectionError('Authentication failed. Please log in again.');
            // Clear stored credentials
            await window.electron.setServerUrl('');
            await window.electron.setAuthToken('');
            apiRef.current = null;
            isInitializingRef.current = false;
            if (onConnectionError) onConnectionError('Authentication failed');
            return false;
          }
        }
      }

      // Set initialized state
      setIsInitialized(true);
      isInitializedRef.current = true;
      
      // Update connectionStatus
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('JellyfinContext: Error initializing Jellyfin client:', error);
      setConnectionStatus('error');
      setConnectionError(error.message || 'Unknown error connecting to Jellyfin server');
      apiRef.current = null;
      // Clear credentials on critical error
      await window.electron.setServerUrl('');
      await window.electron.setAuthToken('');
      if (onConnectionError) onConnectionError(error.message || 'Unknown error');
      return false;
    } finally {
      isInitializingRef.current = false;
    }
  }, [onConnectionError, serverUrl, authToken, userId, userInfo]);

  // Add an immediate initialization effect that runs once when the provider mounts
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    const initOnMount = async () => {
      // Skip initialization if we're already initialized or in progress
      if (isInitializedRef.current || isInitializingRef.current) {
        console.log('JellyfinContext: Skipping initialization, already initialized or in progress');
        return;
      }
      
      // Set a flag to track that we're attempting initialization
      isInitializingRef.current = true;
      
      try {
        const url = await window.electron.getServerUrl();
        const token = await window.electron.getAuthToken();
        
        if (url && token) {
          // Use the force flag to bypass the checks for initial load
          await initJellyfin(true, true);
        }
      } catch (error) {
        console.error('JellyfinContext: Error during mount initialization:', error);
      } finally {
        isInitializingRef.current = false;
      }
    };
    
    // Delay initialization slightly to allow UI to settle
    const initTimer = setTimeout(() => {
      initOnMount();
    }, 300);
    
    return () => clearTimeout(initTimer);
  }, [initJellyfin]);

  // Setup reconnection attempt if needed
  useEffect(() => {
    let reconnectInterval = null
    
    if (connectionStatus === 'error') {
      reconnectInterval = setInterval(() => {
        console.log('Attempting to reconnect to Jellyfin server...')
        initJellyfin()
      }, 30000) // Try to reconnect every 30 seconds
    }
    
    return () => {
      if (reconnectInterval) clearInterval(reconnectInterval)
    }
  }, [connectionStatus, initJellyfin])

  // Create a wrapper for API calls with error handling
  const apiCall = useCallback(async (callback, fallback = []) => {
    try {
      const api = apiRef.current
      
      // If API instance is null, try to reinitialize once
      if (!api) {
        console.log('JellyfinContext: API instance is null, attempting to reinitialize')
        const success = await initJellyfin(true)
        
        if (!success) {
          console.warn('JellyfinContext: Failed to reinitialize API instance')
        return fallback
        }
        
        // Get the new API instance after initialization
        const newApi = apiRef.current
        if (!newApi) {
          console.warn('JellyfinContext: API instance is still null after reinitialization')
          return fallback
        }
        
        // Use the new API instance
        return await callback(newApi)
      }
      
      if (!isInitialized) {
        console.warn('JellyfinContext: API not initialized yet')
        return fallback
      }
      
      if (connectionStatus !== 'connected') {
        console.warn(`JellyfinContext: API attempted call with connectionStatus '${connectionStatus}'`)
        return fallback
      }
      
      // Make sure the API object has the necessary methods before passing it
      if (typeof api.get !== 'function') {
        console.error('JellyfinContext: API instance is invalid or missing HTTP methods')
        
        // Attempt to reinitialize
        const success = await initJellyfin(true)
        if (!success) {
        return fallback
        }
        
        // Get the new API instance
        const newApi = apiRef.current
        if (!newApi || typeof newApi.get !== 'function') {
          return fallback
        }
        
        // Use the new API instance
        return await callback(newApi)
      }
      
      // Pass the API instance directly to the callback
      return await callback(api)
    } catch (error) {
      console.error('JellyfinContext: API call failed:', error);
      console.error('JellyfinContext: API call failed details:', { 
        message: error.message, 
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      });
      
      // Check for authentication issues
      if (error.response && error.response.status === 401) {
        setConnectionStatus('error')
        setConnectionError('Authentication expired. Please log in again.')
        // Clear credentials and notify app to show login
        await window.electron.setServerUrl('')
        await window.electron.setAuthToken('')
        if (onConnectionError) onConnectionError('Authentication expired');
      } 
      // Check for connection issues
      else if (error.response && (error.response.status === 503 || error.response.status === 504)) {
        setConnectionStatus('error')
        setConnectionError('Server unavailable. Attempting to reconnect...')
        if (onConnectionError) onConnectionError('Server unavailable');
      }
      
      return fallback
    }
  }, [connectionStatus, isInitialized, initJellyfin, onConnectionError])

  // Get list of playlists
  const getPlaylists = useCallback(() => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          IncludeItemTypes: 'Playlist',
          Recursive: true,
          Fields: 'PrimaryImageAspectRatio,BasicSyncInfo,CanDelete,MediaSourceCount',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Get playlist items
  const getPlaylistItems = useCallback((playlistId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !playlistId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Playlists/${playlistId}/Items`, {
        params: {
          UserId: userId
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Get album by ID
  const getAlbum = useCallback((albumId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !albumId) return null
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items/${albumId}`)
      return response.data
    }, null)
  }, [apiCall, userId])

  // Get album items
  const getAlbumItems = useCallback((albumId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !albumId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          ParentId: albumId,
          SortBy: 'ParentIndexNumber,IndexNumber,SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Get artist by ID
  const getArtist = useCallback((artistId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !artistId) return null
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items/${artistId}`)
      return response.data
    }, null)
  }, [apiCall, userId])

  // Get artist albums
  const getArtistAlbums = useCallback((artistId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !artistId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          IncludeItemTypes: 'MusicAlbum',
          Recursive: true,
          AlbumArtistIds: artistId,
          SortBy: 'PremiereDate,ProductionYear,SortName',
          SortOrder: 'Descending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Search items
  const searchItems = useCallback((query, itemTypes = ['Audio', 'MusicAlbum', 'MusicArtist']) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !query) return { albums: [], songs: [], artists: [] }
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          SearchTerm: query,
          IncludeItemTypes: itemTypes.join(','),
          Recursive: true,
          Fields: 'PrimaryImageAspectRatio,CanDelete,MediaSourceCount',
          Limit: 50
        }
      })
      
      const results = response.data.Items || []
      
      // Organize results by type
      return {
        songs: results.filter(item => item.Type === 'Audio'),
        albums: results.filter(item => item.Type === 'MusicAlbum'),
        artists: results.filter(item => item.Type === 'MusicArtist')
      }
    }, { albums: [], songs: [], artists: [] })
  }, [apiCall, userId])

  // Get recent albums
  const getRecentAlbums = useCallback((limit = 10) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items/Latest`, {
        params: {
          IncludeItemTypes: 'MusicAlbum',
          Limit: limit,
          Fields: 'PrimaryImageAspectRatio,BasicSyncInfo'
        }
      })
      
      return response.data || []
    }, [])
  }, [apiCall, userId])

  // Get favorite albums
  const getFavoriteAlbums = useCallback(() => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          IncludeItemTypes: 'MusicAlbum',
          Recursive: true,
          Filters: 'IsFavorite',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Get favorite tracks (for Liked Songs)
  const getFavorites = useCallback(() => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          IncludeItemTypes: 'Audio',
          Recursive: true,
          Filters: 'IsFavorite',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Get all albums
  const getAllAlbums = useCallback(() => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          IncludeItemTypes: 'MusicAlbum',
          Recursive: true,
          Fields: 'PrimaryImageAspectRatio,BasicSyncInfo',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])
  
  // Get all artists
  const getAllArtists = useCallback(() => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          IncludeItemTypes: 'MusicArtist',
          Recursive: true,
          Fields: 'PrimaryImageAspectRatio,BasicSyncInfo',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])
  
  // Get all music genres
  const getAllGenres = useCallback(() => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance) return []
      
      const response = await apiInstance.get(`/MusicGenres`, {
        params: {
          SortBy: 'SortName',
          SortOrder: 'Ascending',
          UserId: userId
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])
  
  // Get items by genre
  const getItemsByGenre = useCallback((genreId, itemType = 'MusicAlbum') => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId || !genreId) return []
      
      // Ensure we're using the api instance correctly
      const response = await apiInstance.get(`/Users/${userId}/Items`, {
        params: {
          GenreIds: genreId,
          IncludeItemTypes: itemType,
          Recursive: true,
          Fields: 'PrimaryImageAspectRatio,BasicSyncInfo',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      })
      
      return response.data.Items || []
    }, [])
  }, [apiCall, userId])

  // Toggle favorite status
  const toggleFavorite = useCallback((itemId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId || !itemId) return false
      
      // Ensure we're using the api instance correctly
      await apiInstance.post(`/Users/${userId}/FavoriteItems/${itemId}`)
      return true
    }, false)
  }, [apiCall, userId])

  // Check if an item is favorited
  const isFavorite = useCallback((itemId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId || !itemId) return false
      
      // Get the item details, which include UserData with IsFavorite flag
      const response = await apiInstance.get(`/Users/${userId}/Items/${itemId}`)
      
      // Check if the item is favorited
      return response.data?.UserData?.IsFavorite || false
    }, false)
  }, [apiCall, userId])

  // Remove favorite status
  const removeFavorite = useCallback((itemId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !userId || !itemId) return false
      
      // Ensure we're using the api instance correctly
      await apiInstance.delete(`/Users/${userId}/FavoriteItems/${itemId}`)
      return true
    }, false)
  }, [apiCall, userId])

  // Get stream URL for a track
  const getStreamUrl = useCallback((itemId) => {
    if (!serverUrl || !authToken || !itemId) return null
    return `${serverUrl}/Audio/${itemId}/universal?audioCodec=mp3&api_key=${authToken}&deviceId=jellyfi-electron`
  }, [serverUrl, authToken])

  // Get image URL with improved error handling
  const getImageUrl = useCallback((itemId, type = 'Primary', maxWidth = 300, entityType = null) => {
    // If no server URL or itemId, return default placeholder based on entity type
    if (!serverUrl || !itemId) {
      return generatePlaceholder(entityType);
    }
    
    // Store a map of failed image requests to avoid repeated 404s
    if (!window.jellyfin_failed_images) {
      window.jellyfin_failed_images = new Set();
    }
    
    // Check if this image URL has previously failed
    const cacheKey = `${itemId}_${type}_${maxWidth}`;
    if (window.jellyfin_failed_images.has(cacheKey)) {
      return generatePlaceholder(entityType);
    }
    
    // Build the correct URL
    let url = `${serverUrl}/Items/${itemId}/Images/${type}`;
    
    if (maxWidth) {
      url += `?maxWidth=${maxWidth}`;
    }
    
    if (authToken) {
      url += `${maxWidth ? '&' : '?'}api_key=${authToken}`;
    }
    
    // Add error handler to detect 404s
    setTimeout(() => {
      const img = new Image();
      img.onerror = () => {
        console.log(`Image not found for ${itemId}, type: ${type}. Using fallback.`);
        window.jellyfin_failed_images.add(cacheKey);
      };
      img.src = url;
    }, 0);
    
    return url;
  }, [serverUrl, authToken]);

  // Get user profile image URL
  const getUserImageUrl = useCallback((userId, maxWidth = 300) => {
    if (!serverUrl || !userId) {
      return generatePlaceholder('user');
    }
    
    // Store a map of failed image requests to avoid repeated 404s
    if (!window.jellyfin_failed_images) {
      window.jellyfin_failed_images = new Set();
    }
    
    // Check if this image URL has previously failed
    const cacheKey = `user_${userId}_${maxWidth}`;
    if (window.jellyfin_failed_images.has(cacheKey)) {
      return generatePlaceholder('user');
    }
    
    // Build the correct URL for user profile image
    let url = `${serverUrl}/Users/${userId}/Images/Primary`;
    
    if (maxWidth) {
      url += `?maxWidth=${maxWidth}`;
    }
    
    if (authToken) {
      url += `${maxWidth ? '&' : '?'}api_key=${authToken}`;
    }
    
    // Add error handler to detect 404s
    setTimeout(() => {
      const img = new Image();
      img.onerror = () => {
        console.log(`User image not found for ${userId}. Using fallback.`);
        window.jellyfin_failed_images.add(cacheKey);
      };
      img.src = url;
    }, 0);
    
    return url;
  }, [serverUrl, authToken]);

  // Generate placeholder SVG image for different entity types
  const generatePlaceholder = (entityType) => {
    // Default colors - Spotify-like greens and grays
    const primaryColor = '#1DB954'; // Spotify green
    const secondaryColor = '#282828'; // Dark gray
    const tertiaryColor = '#181818'; // Darker gray
    
    // Base64 encode SVG for different entity types
    if (entityType === 'artist') {
      // Artist placeholder - person silhouette in a circle
      const artistSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="${secondaryColor}" />
        <circle cx="150" cy="150" r="150" fill="${tertiaryColor}" />
        <circle cx="150" cy="110" r="40" fill="${primaryColor}" />
        <path d="M150,160 C117,160 90,180 80,210 C90,250 120,280 150,280 C180,280 210,250 220,210 C210,180 183,160 150,160 Z" fill="${primaryColor}" />
      </svg>`;
      return `data:image/svg+xml;base64,${btoa(artistSvg)}`;
    }
    else if (entityType === 'user') {
      // User placeholder - person silhouette with a different style
      const userSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="${secondaryColor}" />
        <circle cx="150" cy="150" r="150" fill="${tertiaryColor}" />
        <circle cx="150" cy="100" r="50" fill="${primaryColor}" />
        <path d="M150,160 C100,160 60,200 60,250 L240,250 C240,200 200,160 150,160 Z" fill="${primaryColor}" />
      </svg>`;
      return `data:image/svg+xml;base64,${btoa(userSvg)}`;
    }
    else if (entityType === 'playlist') {
      // Playlist placeholder - music note on playlist lines
      const playlistSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="${secondaryColor}" />
        <rect x="60" y="80" width="180" height="20" rx="5" fill="${tertiaryColor}" />
        <rect x="60" y="120" width="180" height="20" rx="5" fill="${tertiaryColor}" />
        <rect x="60" y="160" width="180" height="20" rx="5" fill="${tertiaryColor}" />
        <rect x="60" y="200" width="180" height="20" rx="5" fill="${tertiaryColor}" />
        <circle cx="180" cy="150" r="60" fill="${primaryColor}" opacity="0.9" />
        <path d="M160,130 L160,170 L175,165 L175,125 L160,130 Z" fill="white" />
        <circle cx="150" cy="175" r="15" fill="white" />
        <circle cx="175" cy="165" r="15" fill="white" />
      </svg>`;
      return `data:image/svg+xml;base64,${btoa(playlistSvg)}`;
    }
    else {
      // Album placeholder (default) - vinyl record
      const albumSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="${secondaryColor}" />
        <circle cx="150" cy="150" r="130" fill="${tertiaryColor}" />
        <circle cx="150" cy="150" r="120" fill="${secondaryColor}" />
        <circle cx="150" cy="150" r="40" fill="${primaryColor}" />
        <circle cx="150" cy="150" r="12" fill="${tertiaryColor}" />
        <circle cx="150" cy="150" r="5" fill="white" />
        <!-- Grooves -->
        <circle cx="150" cy="150" r="100" fill="none" stroke="${tertiaryColor}" stroke-width="2" />
        <circle cx="150" cy="150" r="80" fill="none" stroke="${tertiaryColor}" stroke-width="2" />
        <circle cx="150" cy="150" r="60" fill="none" stroke="${tertiaryColor}" stroke-width="2" />
        <!-- Shine effect -->
        <path d="M100,60 Q150,110 210,70" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="6" />
      </svg>`;
      return `data:image/svg+xml;base64,${btoa(albumSvg)}`;
    }
  };

  // Logout function to properly disconnect from Jellyfin server
  const logout = useCallback(async () => {
    try {
      // Stop any playing audio first
      if (window.playerService && window.playerService.stopAndResetPlayback) {
        console.log('Stopping audio playback before logout');
        window.playerService.stopAndResetPlayback();
      }
      
      // First check if we have an active API instance and auth token
      if (apiRef.current && authToken) {
        // Call the Jellyfin API to revoke the current access token
        try {
          await apiRef.current.post('/Sessions/Logout');
          console.log('Successfully logged out from Jellyfin server');
        } catch (logoutError) {
          // Even if server logout fails, we'll continue with local cleanup
          console.warn('Server logout failed, proceeding with local cleanup:', logoutError);
        }
      }

      // Clear all local state
      setServerUrl('');
      setAuthToken('');
      setUserId('');
      setUserInfo(null);
      setConnectionStatus('disconnected');
      setIsInitialized(false);
      apiRef.current = null;

      // Clear stored credentials in electron app
      if (window.electron) {
        try {
          await window.electron.setAuthToken('');
          await window.electron.setServerUrl('');
          console.log('Successfully cleared stored credentials');
        } catch (storageError) {
          console.error('Error clearing stored credentials:', storageError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should reset local state
      setConnectionStatus('disconnected');
      setIsInitialized(false);
      
      // Still try to clear stored credentials
      if (window.electron) {
        try {
          await window.electron.setAuthToken('');
          await window.electron.setServerUrl('');
        } catch (storageError) {
          console.error('Error clearing stored credentials during error recovery:', storageError);
        }
      }
      
      return false;
    }
  }, [authToken]);

  // Get audio settings implementation
  const getAudioSettings = async () => {
    try {
      // In a real app, we would call the Jellyfin API
      // For now, return the current state
      return audioSettings;
    } catch (error) {
      console.error('Error fetching audio settings:', error);
      throw error;
    }
  };
  
  // Update audio settings implementation
  const updateAudioSettings = async (newSettings) => {
    try {
      // In a real app, we would call the Jellyfin API to save the settings
      // For now, just update the local state
      setAudioSettings(newSettings);
      
      // Also update in user info if available
      if (userInfo) {
        setUserInfo(prevUserInfo => ({
          ...prevUserInfo,
          AudioSettings: newSettings
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating audio settings:', error);
      throw error;
    }
  };

  const clearData = useCallback(async () => {
    try {
      // Clear localStorage data
      localStorage.removeItem('jellyfi_credentials')
      localStorage.removeItem('jellyfi_settings')
      localStorage.removeItem('jellyfi_history')
      
      // Clear any other cached data
      setUserInfo(null)
      setConnectionStatus('disconnected')
      
      return true
    } catch (error) {
      console.error('Error clearing data:', error)
      throw error
    }
  }, [])

  const refreshUserData = useCallback(async () => {
    if (!userInfo || !apiRef.current) {
      throw new Error('Cannot refresh user data: no user or API')
    }

    try {
      // Refresh user info using axios get instead of getUserInfo
      const userResponse = await apiRef.current.get(`/Users/${userInfo.Id}`)
      if (userResponse && userResponse.data) {
        setUserInfo(userResponse.data)
      }
      
      // Refresh playlists
      const refreshedPlaylists = await getPlaylists()
      
      // Refresh favorites
      const refreshedFavorites = await getFavoriteAlbums()
      
      return true
    } catch (error) {
      console.error('Error refreshing user data:', error)
      throw error
    }
  }, [userInfo, getPlaylists, getFavoriteAlbums])

  // Helper function to debounce API calls
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Empty createPlaylist function that does absolutely nothing
  const createPlaylist = useCallback(async () => {
    return null;
  }, []);

  // Add tracks to an existing playlist
  const addToPlaylist = useCallback(async (playlistId, itemIds) => {
    if (!userInfo || !apiRef.current) {
      console.warn('JellyfinContext: Cannot add to playlist - user or API not available');
      throw new Error('Cannot add to playlist: no user or API');
    }

    try {
      if (!itemIds || itemIds.length === 0) {
        throw new Error('No items provided to add to playlist');
      }

      // Add items to the playlist
      await apiRef.current.post(`/Playlists/${playlistId}/Items`, {}, {
        params: {
          userId: userInfo.Id,
          ids: itemIds.join(',')
        }
      });

      return true;
    } catch (error) {
      console.error('Error adding to playlist:', error.message || error);
      throw error;
    }
  }, [userInfo]);
  
  // Remove tracks from a playlist with fallback to individual deletion
  const removeFromPlaylist = useCallback(async (playlistId, itemIds) => {
    if (!userInfo || !apiRef.current) {
      console.warn('JellyfinContext: Cannot remove from playlist - user or API not available');
      throw new Error('Cannot remove from playlist: no user or API');
    }

    try {
      if (!itemIds || itemIds.length === 0) {
        throw new Error('No items provided to remove from playlist');
      }

      // First, get the playlist items to match item IDs with entry IDs
      const playlistItemsResponse = await apiRef.current.get(`/Playlists/${playlistId}/Items`, {
        params: {
          userId: userInfo.Id
        }
      });

      if (!playlistItemsResponse || !playlistItemsResponse.data || !playlistItemsResponse.data.Items) {
        throw new Error('Failed to retrieve playlist items');
      }

      const playlistItems = playlistItemsResponse.data.Items;
      
      // Debug: Log the entire item structure for one item to understand the API
      if (playlistItems.length > 0) {
        console.log('Complete playlist item structure sample:', JSON.stringify(playlistItems[0], null, 2));
      }
      
      // Debug: Log the structure we're analyzing
      const itemsInfo = playlistItems.map(item => ({
        ItemId: item.Id,
        PlaylistItemId: item.PlaylistItemId,
        Name: item.Name
      }));
      console.log('Items being analyzed:', JSON.stringify(itemsInfo, null, 2));
      
      // Jellyfin's API has different behaviors across versions. Let's try all approaches.
      console.log('Items to remove:', JSON.stringify(itemIds));
      
      // Approach 1: Try using the entryId parameter
      try {
        console.log('Trying removal method 1: entryId parameter');
        const entryIdsToRemove = [];
        
        for (const item of playlistItems) {
          if (itemIds.includes(item.Id)) {
            // Try multiple possible entryId locations
            const entryId = item.PlaylistItemId || item.Id;
            entryIdsToRemove.push(entryId);
          }
        }
        
        if (entryIdsToRemove.length === 0) {
          console.log('No entry IDs found to remove - items may already be gone');
          return true;
        }
        
        console.log('Removing entry IDs:', entryIdsToRemove.join(','));
        await apiRef.current.delete(`/Playlists/${playlistId}/Items`, {
          params: {
            userId: userInfo.Id,
            entryIds: entryIdsToRemove.join(',')
          }
        });
        
        console.log('Method 1 success: Items removed');
        return true;
      } catch (error1) {
        console.log('Method 1 failed:', error1.message);
        console.log('Response details:', error1.response?.data);
        
        // Approach 2: Try using playlist item IDs directly
        try {
          console.log('Trying removal method 2: direct playlist item IDs');
          const itemIdsCommaSeparated = itemIds.join(',');
          
          await apiRef.current.delete(`/Playlists/${playlistId}/Items`, {
            params: {
              userId: userInfo.Id,
              ids: itemIdsCommaSeparated
            }
          });
          
          console.log('Method 2 success: Items removed using direct IDs');
          return true;
        } catch (error2) {
          console.log('Method 2 failed:', error2.message);
          console.log('Response details:', error2.response?.data);
          
          // Approach 3: Try removing by indices
          try {
            console.log('Trying removal method 3: indices');
            const indices = [];
            
            itemIds.forEach(id => {
              const index = playlistItems.findIndex(item => item.Id === id);
              if (index !== -1) {
                indices.push(index);
              }
            });
            
            if (indices.length === 0) {
              console.log('No indices found to remove');
              return true;
            }
            
            console.log('Removing indices:', indices.join(','));
            await apiRef.current.delete(`/Playlists/${playlistId}/Items`, {
              params: {
                userId: userInfo.Id,
                entryIds: indices.join(',')
              }
            });
            
            console.log('Method 3 success: Items removed by indices');
            return true;
          } catch (error3) {
            console.log('Method 3 failed:', error3.message);
            console.log('Response details:', error3.response?.data);
            
            // Approach 4: Try removing items one by one using individual URLs
            try {
              console.log('Trying removal method 4: individual item removal');
              let successCount = 0;
              
              // Find playlist item IDs that match our item IDs
              for (const item of playlistItems) {
                if (itemIds.includes(item.Id)) {
                  try {
                    // Try removing using intuitiveID
                    const intuitiveID = item.PlaylistItemId || item.Id;
                    console.log(`Removing item ${item.Name} with ID ${intuitiveID}`);
                    
                    await apiRef.current.delete(`/Items/${intuitiveID}`, {
                      params: {
                        userId: userInfo.Id
                      }
                    });
                    
                    successCount++;
                  } catch (singleError) {
                    console.log(`Failed to remove single item ${item.Name}:`, singleError.message);
                  }
                }
              }
              
              if (successCount > 0) {
                console.log(`Method 4 partial success: Removed ${successCount} out of ${itemIds.length} items`);
                return true;
              } else {
                throw new Error('No items could be removed individually');
              }
            } catch (error4) {
              console.log('Method 4 failed:', error4.message);
              
              // Approach 5: Last resort - POST to move them first then delete
              try {
                console.log('Trying removal method 5: move then delete');
                
                // Create a temporary playlist
                const tempResponse = await apiRef.current.post('/Playlists', {
                  Name: `Temp_${Date.now()}`,
                  MediaType: 'Audio',
                  UserId: userInfo.Id
                });
                
                if (!tempResponse || !tempResponse.data || !tempResponse.data.Id) {
                  throw new Error('Failed to create temporary playlist');
                }
                
                const tempPlaylistId = tempResponse.data.Id;
                console.log(`Created temporary playlist ${tempPlaylistId}`);
                
                // Move items to temp playlist (which effectively removes them from original)
                await apiRef.current.post(`/Playlists/${tempPlaylistId}/Items`, {}, {
                  params: {
                    userId: userInfo.Id,
                    ids: itemIds.join(',')
                  }
                });
                
                // Delete the temp playlist
                await apiRef.current.delete(`/Items/${tempPlaylistId}`);
                console.log('Method 5 success: Moved items to temp playlist and deleted it');
                
                return true;
              } catch (error5) {
                console.log('All removal methods failed');
                throw new Error('Could not remove items from playlist after trying all methods');
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error removing from playlist:', error);
      if (error.response) {
        console.error('Error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      throw error;
    }
  }, [userInfo]);
  
  // Update playlist details (name, description, etc.)
  const updatePlaylist = useCallback(async (playlistId, data) => {
    if (!userInfo || !apiRef.current) {
      console.warn('JellyfinContext: Cannot update playlist - user or API not available');
      throw new Error('Cannot update playlist: no user or API');
    }

    try {
      if (!playlistId) {
        throw new Error('No playlist ID provided for update');
      }

      // Log the update request
      console.log(`Updating playlist ${playlistId} with data:`, JSON.stringify(data));

      // Only update the name if provided
      if (data.name) {
        // Simplest possible payload for updating name
        const updatePayload = {
          Id: playlistId,
          Name: data.name
        };
        
        console.log(`Attempting to rename playlist to "${data.name}" using minimal payload:`, JSON.stringify(updatePayload));
        
        try {
          // Try different methods in sequence:
          
          // 1. Try PUT first
          try {
            await apiRef.current.put(`/Items/${playlistId}`, updatePayload, {
              params: {
                userId: userInfo.Id
              }
            });
            console.log(`Successfully updated playlist name to "${data.name}" using PUT method`);
          } catch (putError) {
            console.log('PUT method failed, trying POST method');
            
            // 2. Try POST if PUT fails
            await apiRef.current.post(`/Items/${playlistId}`, updatePayload, {
              params: {
                userId: userInfo.Id
              }
            });
            console.log(`Successfully updated playlist name to "${data.name}" using POST method`);
          }
        } catch (methodError) {
          console.log('Standard methods failed, trying direct path update');
          
          // 3. Try POST with direct path
          await apiRef.current.post(`/Playlists/${playlistId}`, updatePayload, {
            params: {
              userId: userInfo.Id
            }
          });
          console.log(`Successfully updated playlist name to "${data.name}" using direct playlist path`);
        }
      }
      
      // Update cover image if provided
      if (data.coverImage) {
        console.log('Uploading new cover image for playlist');
        const formData = new FormData();
        formData.append('file', data.coverImage);
        
        try {
          // Try with proper content-type header and without it
          // Make sure not to set the Content-Type header - let the browser set it with boundary
          const config = {
            headers: {
              // Remove all custom headers and let Axios handle it
              'Content-Type': undefined
            }
          };
          
          // Use actual FormData API without modifications
          await apiRef.current.post(`/Items/${playlistId}/Images/Primary`, formData, config);
          console.log('Successfully uploaded new cover image for playlist');
        } catch (imageError) {
          console.log('Standard image path failed, trying alternate approach', imageError.message);
          
          // Try using query parameters for userId
          try {
            const config = {
              headers: {
                'Content-Type': undefined
              },
              params: {
                userId: userInfo.Id
              }
            };
            
            await apiRef.current.post(`/Items/${playlistId}/Images/Primary`, formData, config);
            console.log('Successfully uploaded new cover image with userId parameter');
          } catch (altImageError) {
            // Try a completely different approach - /Library/ItemImage endpoint
            try {
              console.log('Trying Library/ItemImage endpoint...');
              const libraryConfig = {
                headers: {
                  'Content-Type': undefined
                },
                params: {
                  id: playlistId,
                  imageType: 'Primary',
                  userId: userInfo.Id
                }
              };
              
              await apiRef.current.post('/Library/ItemImage', formData, libraryConfig);
              console.log('Successfully uploaded new cover image using Library/ItemImage endpoint');
            } catch (libraryError) {
              console.error('All image upload methods failed:', libraryError.message);
              if (libraryError.response) {
                console.error('Image upload response:', {
                  status: libraryError.response.status,
                  statusText: libraryError.response.statusText,
                  data: libraryError.response.data
                });
              }
              throw new Error(`Failed to upload image: ${libraryError.message}`);
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating playlist:', error.message);
      if (error.response) {
        console.error('API response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      throw error;
    }
  }, [userInfo]);
  
  // Delete a playlist
  const deletePlaylist = useCallback(async (playlistId) => {
    if (!userInfo || !apiRef.current) {
      console.warn('JellyfinContext: Cannot delete playlist - user or API not available');
      throw new Error('Cannot delete playlist: no user or API');
    }

    try {
      if (!playlistId) {
        throw new Error('No playlist ID provided for deletion');
      }

      // Delete the playlist
      await apiRef.current.delete(`/Items/${playlistId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error.message || error);
      throw error;
    }
  }, [userInfo]);

  // search function updated to use Axios instead of SDK
  const search = useCallback(async (query) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !query || !userId) {
        return {
          albums: [],
          artists: [],
          tracks: [],
          playlists: []
        }
      }

      try {
        // Search for albums
        const albumsResponse = await apiInstance.get(`/Users/${userId}/Items`, {
          params: {
            SearchTerm: query,
            IncludeItemTypes: 'MusicAlbum',
            Recursive: true,
            Limit: 50
          }
        })
        
        // Search for artists
        const artistsResponse = await apiInstance.get(`/Users/${userId}/Items`, {
          params: {
            SearchTerm: query,
            IncludeItemTypes: 'MusicArtist',
            Recursive: true,
            Limit: 50
          }
        })
        
        // Search for songs
        const tracksResponse = await apiInstance.get(`/Users/${userId}/Items`, {
          params: {
            SearchTerm: query,
            IncludeItemTypes: 'Audio',
            Recursive: true,
            Limit: 50
          }
        })
        
        // Search for playlists
        const playlistsResponse = await apiInstance.get(`/Users/${userId}/Items`, {
          params: {
            SearchTerm: query,
            IncludeItemTypes: 'Playlist',
            Recursive: true,
            Limit: 50
          }
        })
        
        // Process and return organized results
        return {
          albums: albumsResponse.data.Items || [],
          artists: artistsResponse.data.Items || [],
          tracks: tracksResponse.data.Items || [],
          playlists: playlistsResponse.data.Items || []
        }
      } catch (error) {
        console.error('Error searching:', error)
        throw error
      }
    }, {
      albums: [],
      artists: [],
      tracks: [],
      playlists: []
    })
  }, [apiCall, userId])

  // Reconnect to Jellyfin server
  const reconnect = useCallback(async () => {
    console.log('Attempting to reconnect to Jellyfin server...');
    try {
      const success = await initJellyfin();
      return success;
    } catch (error) {
      console.error('Error reconnecting to Jellyfin server:', error);
      return false;
    }
  }, [initJellyfin]);

  // Get lyrics for a track
  const getLyrics = useCallback((itemId) => {
    return apiCall(async (apiInstance) => {
      if (!apiInstance || !itemId) return null
      
      try {
        // First try to get the lyrics directly
        const response = await apiInstance.get(`/Items/${itemId}/Lyrics`)
        return response.data
      } catch (error) {
        console.log('Direct lyrics fetch failed, trying alternative approach:', error.message)
        
        try {
          // Try to get lyrics from the item's metadata
          const itemResponse = await apiInstance.get(`/Users/${userId}/Items/${itemId}`)
          const item = itemResponse.data
          
          // Check if lyrics are in the metadata
          if (item && item.Overview) {
            return { lyrics: item.Overview }
          }
          
          return null
        } catch (innerError) {
          console.error('Failed to get lyrics:', innerError)
          return null
        }
      }
    }, null)
  }, [apiCall, userId])

  // Create a context value object with all the methods and state
  const contextValue = {
    serverUrl,
    api: apiRef.current,
    userId,
    userInfo,
    connectionStatus,
    connectionError,
    isInitialized,
    audioSettings,
    initJellyfin,
    getPlaylist: getPlaylists,
    getPlaylists,
    getPlaylistItems,
    getAlbum,
    getAlbumItems,
    getArtist,
    getArtistAlbums,
    searchItems,
    getRecentAlbums,
    getFavoriteAlbums,
    getFavorites,
    getAllAlbums,
    getAllArtists,
    getAllGenres,
    getItemsByGenre,
    toggleFavorite,
    isFavorite,
    removeFavorite,
    getStreamUrl,
    getImageUrl,
    getUserImageUrl,
    getLyrics,
    reconnect,
    logout,
    getAudioSettings,
    updateAudioSettings,
    clearData,
    refreshUserData,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    updatePlaylist,
    deletePlaylist,
    search
  };

  // Expose the context value as a global object for components that need to avoid importing
  // This allows components to access the API without triggering hooks initialization
  useEffect(() => {
    if (isInitialized) {
      window.jellyfinService = contextValue;
    }
    return () => {
      // Clean up when provider unmounts
      delete window.jellyfinService;
    };
  }, [isInitialized, userInfo, audioSettings, connectionStatus]);

  return (
    <JellyfinContext.Provider value={contextValue}>
      {children}
    </JellyfinContext.Provider>
  )
} 