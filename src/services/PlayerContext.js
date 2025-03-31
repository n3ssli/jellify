import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useJellyfin } from './JellyfinContext'

const PlayerContext = createContext()

let playerContextRef = null;

export const setPlayerContextRef = (context) => {
  playerContextRef = context;
};

export const getPlayerContextRef = () => {
  return playerContextRef;
};

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    console.warn('usePlayer was called outside of its Provider. Using safe fallback values.')
    return {
      queue: [],
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      muted: false,
      loading: false,
      error: null,
      metadataLoaded: false,
      playPreviousTrack: () => {},
      playNextTrack: () => {},
      play: () => Promise.resolve(),
      pause: () => {},
      seek: () => {},
      setVolume: () => {},
      toggleMute: () => {},
      togglePlayPause: () => {},
      toggleShuffle: () => {},
      toggleRepeat: () => {},
      addToQueue: () => {},
      removeFromQueue: () => {},
      clearQueue: () => {},
      playTrack: () => Promise.resolve(),
      playCollection: () => {},
      playFrom: () => {},
      shuffle: false,
      repeat: 'off',
      equalizer: {
        enabled: false,
        bands: []
      },
      updateEqualizerBand: () => {},
      setEqualizerEnabled: () => {},
      applyEqualizerPreset: () => {},
      crossfadeDuration: 3,
      setCrossfadeDuration: () => {},
      defaultVolume: 0.7,
      setDefaultVolume: () => {}
    }
  }
  return context
}

export const PlayerProvider = ({ children }) => {
  const { 
    getStreamUrl, 
    connectionStatus,
    isInitialized,
    api
  } = useJellyfin()
  
  const [queue, setQueue] = useState([])
  const [visibleQueue, setVisibleQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('off') // 'off', 'all', 'one'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  
  const [crossfadeDuration, setCrossfadeDuration] = useState(3)
  const [defaultVolume, setDefaultVolume] = useState(0.7)
  const [crossfadeActive, setCrossfadeActive] = useState(false)
  
  const audioRef = useRef(null)
  const nextAudioRef = useRef(null)  // Reference for next track preloading
  const intervalRef = useRef(null)
  const shuffledQueueRef = useRef([])
  const retryAttemptsRef = useRef(0)
  const maxRetryAttempts = 3
  const initializedRef = useRef(false)
  const playStateRef = useRef({ currentTime: 0 })
  const crossfadeTimeoutRef = useRef(null)
  
  // Web Audio API references for equalizer
  const audioContextRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const analyserNodeRef = useRef(null)
  const gainNodeRef = useRef(null)
  const equalizerNodesRef = useRef([])
  
  // Web Audio API references for crossfading
  const currentSourceNodeRef = useRef(null);
  const nextSourceNodeRef = useRef(null);
  const currentGainNodeRef = useRef(null);
  const nextGainNodeRef = useRef(null);
  const crossfadeIntervalRef = useRef(null);
  
  const [equalizer, setEqualizer] = useState({
    enabled: false,
    bands: [
      { id: 1, frequency: 60, gain: 0, type: 'lowshelf', Q: 1.0 },
      { id: 2, frequency: 170, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 3, frequency: 310, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 4, frequency: 600, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 5, frequency: 1000, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 6, frequency: 3000, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 7, frequency: 6000, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 8, frequency: 12000, gain: 0, type: 'peaking', Q: 1.0 },
      { id: 9, frequency: 16000, gain: 0, type: 'highshelf', Q: 1.0 }
    ]
  });
  
  const currentTrack = queue[currentIndex] || null
  
  const playRequestDebounceRef = useRef(null)
  const playOperationInProgressRef = useRef(false)

  const [playHistory, setPlayHistory] = useState([]);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedCrossfade = localStorage.getItem('jellyfi_crossfade');
      const savedDefaultVolume = localStorage.getItem('jellyfi_default_volume');
      
      if (savedCrossfade) {
        setCrossfadeDuration(parseInt(savedCrossfade, 10) || 3);
      }
      
      if (savedDefaultVolume) {
        const parsedVolume = parseFloat(savedDefaultVolume);
        setDefaultVolume(parsedVolume);
        setVolume(parsedVolume);
      }
    } catch (error) {
      // Silent fail
    }
  }, []);

  // Reset error when changing tracks
  useEffect(() => {
    setError(null)
    retryAttemptsRef.current = 0
    setMetadataLoaded(false)
  }, [currentTrack])

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('jellyfi_crossfade', crossfadeDuration.toString());
      localStorage.setItem('jellyfi_default_volume', defaultVolume.toString());
    } catch (error) {
      // Silent fail
    }
  }, [crossfadeDuration, defaultVolume]);

  // Initialize audio elements and Web Audio API only once
  useEffect(() => {
    if (!initializedRef.current) {
      audioRef.current = new Audio()
      nextAudioRef.current = new Audio()  // Initialize second audio element for gapless playback
      
      try {
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Create audio nodes
        analyserNodeRef.current = audioContextRef.current.createAnalyser();
        gainNodeRef.current = audioContextRef.current.createGain();
        
        // Create MediaElementSource node immediately and store it
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        
        // Set up default equalizer nodes
        setUpEqualizer();
        
        // Initial connection of nodes
        updateAudioGraph(false);
        
        // Load saved equalizer settings if they exist
        const savedSettings = localStorage.getItem('jellyfi_equalizer_settings');
        if (savedSettings) {
          try {
            const parsedSettings = JSON.parse(savedSettings);
            setEqualizer(parsedSettings);
            
            // Apply saved settings to equalizer nodes
            if (parsedSettings.enabled) {
              setTimeout(() => {
                applyEqualizerSettings(parsedSettings.bands);
                // Update audio graph with the loaded enabled state
                updateAudioGraph(parsedSettings.enabled);
              }, 100);
            }
          } catch (e) {
            console.warn('Failed to parse saved equalizer settings:', e);
          }
        }
      } catch (error) {
        console.error('Failed to initialize Web Audio API:', error);
      }
      
      initializedRef.current = true;
      console.log('Audio elements and Web Audio API initialized');
      
      // Use default volume from saved settings
      if (audioRef.current) {
        audioRef.current.volume = defaultVolume;
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.volume = 0;  // Start with volume at 0
        nextAudioRef.current.preload = 'auto';  // Set preload to auto
      }
      
      // Preload metadata
      if (audioRef.current) {
        audioRef.current.preload = 'auto';  // Changed from 'metadata' to 'auto' for better buffering
      }
    }
  }, [defaultVolume]);

  // Set up equalizer filter nodes
  const setUpEqualizer = () => {
    if (!audioContextRef.current) return;
    
    // Clean up existing nodes
    equalizerNodesRef.current.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {
        // Node might already be disconnected
      }
    });
    
    // Create new nodes for each frequency band
    const newNodes = equalizer.bands.map(band => {
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = equalizer.enabled ? band.gain : 0;
      filter.Q.value = band.Q;
      return filter;
    });
    
    // Store nodes for future reference
    equalizerNodesRef.current = newNodes;
    
    // Connect nodes in series: first -> second -> third -> ... -> last
    if (newNodes.length > 0) {
      for (let i = 0; i < newNodes.length - 1; i++) {
        newNodes[i].connect(newNodes[i + 1]);
      }
      
      // Connect last equalizer node to analyzer node
      newNodes[newNodes.length - 1].connect(analyserNodeRef.current);
    }
    
    // Connect analyzer to gain node
    try {
      analyserNodeRef.current.disconnect();
    } catch (e) {
      // Node might already be disconnected
    }
    analyserNodeRef.current.connect(gainNodeRef.current);
    
    // Always connect gain to destination
    try {
      gainNodeRef.current.disconnect();
    } catch (e) {
      // Node might already be disconnected
    }
    gainNodeRef.current.connect(audioContextRef.current.destination);
  };

  // Update audio graph connections based on equalizer state
  const updateAudioGraph = (equalizerEnabled) => {
    if (!audioContextRef.current || !sourceNodeRef.current) return;
    
    try {
      // Disconnect source node from any previous connections
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Node might already be disconnected
      }
      
      if (equalizerEnabled && equalizerNodesRef.current.length > 0) {
        // Connect through equalizer chain: source -> eq -> analyzer -> gain -> destination
        sourceNodeRef.current.connect(equalizerNodesRef.current[0]);
      } else {
        // Bypass equalizer: source -> analyzer -> gain -> destination
        sourceNodeRef.current.connect(analyserNodeRef.current);
      }
      
      // Ensure analyzer is connected to gain node
      try {
        analyserNodeRef.current.disconnect();
      } catch (e) {
        // Node might already be disconnected
      }
      analyserNodeRef.current.connect(gainNodeRef.current);
      
      // Ensure gain node is connected to destination
      try {
        gainNodeRef.current.disconnect();
      } catch (e) {
        // Node might already be disconnected
      }
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      console.log(`Audio graph updated, equalizer ${equalizerEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating audio graph:', error);
    }
  };
  
  // Apply equalizer settings to the filter nodes
  const applyEqualizerSettings = (bands) => {
    if (!audioContextRef.current || !equalizerNodesRef.current.length) return;
    
    // Update each filter node with its corresponding band settings
    bands.forEach((band, index) => {
      if (index < equalizerNodesRef.current.length) {
        const filter = equalizerNodesRef.current[index];
        filter.type = band.type;
        filter.frequency.value = band.frequency;
        filter.gain.value = equalizer.enabled ? band.gain : 0;
        filter.Q.value = band.Q;
      }
    });
  };
  
  // Update a single equalizer band
  const updateEqualizerBand = useCallback((id, gain) => {
    setEqualizer(prev => {
      // Create a new bands array with the updated band
      const newBands = prev.bands.map(band => 
        band.id === id ? { ...band, gain } : band
      );
      
      // Create the new state
      const newState = {
        ...prev,
        bands: newBands
      };
      
      // Save settings to localStorage
      localStorage.setItem('jellyfi_equalizer_settings', JSON.stringify(newState));
      
      // Apply the new settings to the audio
      applyEqualizerSettings(newBands);
      
      return newState;
    });
  }, []);
  
  // Toggle equalizer enabled state
  const setEqualizerEnabled = useCallback((enabled) => {
    setEqualizer(prev => {
      const newState = { ...prev, enabled };
      
      // Save settings to localStorage
      localStorage.setItem('jellyfi_equalizer_settings', JSON.stringify(newState));
      
      // Update audio graph connections based on new enabled state
      updateAudioGraph(enabled);
      
      // If enabling, apply current band settings, if disabling, set all gains to 0
      if (enabled) {
        applyEqualizerSettings(prev.bands);
      } else {
        // Reset all filter nodes to 0 gain but keep the frequency settings
        equalizerNodesRef.current.forEach(node => {
          node.gain.value = 0;
        });
      }
      
      return newState;
    });
  }, []);
  
  // Apply an equalizer preset
  const applyEqualizerPreset = useCallback((preset) => {
    setEqualizer(prev => {
      // Map preset values to existing bands, preserving frequency and type
      const newBands = prev.bands.map((band, index) => {
        // If preset has a value for this band, use it, otherwise keep current gain
        const gain = index < preset.values.length ? preset.values[index] : band.gain;
        return { ...band, gain };
      });
      
      const newState = {
        ...prev,
        bands: newBands,
        enabled: true
      };
      
      // Save settings to localStorage
      localStorage.setItem('jellyfi_equalizer_settings', JSON.stringify(newState));
      
      // Apply the new settings to the audio
      applyEqualizerSettings(newBands);
      
      // Update audio graph connections since we're enabling the equalizer
      updateAudioGraph(true);
      
      return newState;
    });
  }, []);

  // Function to safely get a stream URL only if Jellyfin is initialized
  const safeGetStreamUrl = useCallback((itemId) => {
    if (!isInitialized || !getStreamUrl || connectionStatus !== 'connected') {
      console.warn('Cannot get stream URL - Jellyfin not initialized')
      return null
    }
    return getStreamUrl(itemId)
  }, [getStreamUrl, isInitialized, connectionStatus])

  // Helper function to safely execute operations that involve playback
  const safelyExecutePlaybackOperation = useCallback(async (operation) => {
    // If an operation is already in progress, don't proceed
    if (playOperationInProgressRef.current) {
      console.log('Operation already in progress, skipping request')
      return
    }
    
    playOperationInProgressRef.current = true
    
    try {
      // If currently playing, pause first to prevent "interrupted by new load request" errors
      const wasPlaying = isPlaying
      if (wasPlaying && audioRef.current) {
        audioRef.current.pause()
      }
      
      // Give the audio context time to process the pause
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Execute the operation
      await operation()
      
      // If it was playing before, resume playback
      if (wasPlaying && audioRef.current) {
        // Add a small delay to ensure previous operations are complete
        await new Promise(resolve => setTimeout(resolve, 50))
        
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch (error) {
          console.error('Error resuming playback:', error)
          setIsPlaying(false)
        }
      }
    } finally {
      // Reset the flag
      playOperationInProgressRef.current = false
    }
  }, [isPlaying])

  // Only generate shuffled queue when shuffle state changes or queue content changes
  // Not when simply navigating through tracks
  useEffect(() => {
    if (queue.length <= 1) return;
    
    // Flag to know if we need to generate a new shuffled order
    const needsNewShuffleOrder = (
      // Only shuffle when shuffle is turned on
      shuffle && 
      // Either we have no shuffle order yet, or it's stale compared to current queue
      (shuffledQueueRef.current.length === 0 || 
       shuffledQueueRef.current.length !== queue.length)
    );
    
    // Only update the shuffled queue if needed
    if (needsNewShuffleOrder) {
      console.log('Generating new shuffled queue');
      
      // Create an array of all indices
      const allIndices = Array.from({ length: queue.length }, (_, i) => i);
      
      // Remove the current track from indices to be shuffled
      const remainingIndices = allIndices.filter(i => i !== currentIndex);
      
      // Shuffle the remaining tracks
      for (let i = remainingIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingIndices[i], remainingIndices[j]] = [remainingIndices[j], remainingIndices[i]];
      }
      
      // Create final shuffled array with current track first
      const shuffledIndices = [currentIndex, ...remainingIndices];
      shuffledQueueRef.current = shuffledIndices;
      
      // Clear play history when reshuffling
      setPlayHistory([]);
      
      console.log('New shuffled order:', shuffledIndices.map(i => queue[i]?.Name || 'unknown').join(', '));
    } else if (!shuffle) {
      // Reset to sequential order when shuffle is turned off
      shuffledQueueRef.current = Array.from({ length: queue.length }, (_, i) => i);
      
      // Clear play history when turning shuffle off
      setPlayHistory([]);
    }
    
  }, [shuffle, queue, currentIndex]);
  
  // Updated navigation functions to use the stable shuffled order
  const playNextTrack = useCallback(() => {
    if (playOperationInProgressRef.current || queue.length <= 1) return;
    
    // Add current track to history before moving to next
    setPlayHistory(prev => [...prev, currentIndex]);
    
    // Determine next track based on shuffle mode
    let nextIndex;
    if (shuffle) {
      const currentPosition = shuffledQueueRef.current.indexOf(currentIndex);
      if (currentPosition < shuffledQueueRef.current.length - 1) {
        // Move to next track in shuffled order
        nextIndex = shuffledQueueRef.current[currentPosition + 1];
      } else if (repeat === 'all') {
        // We've reached the end of our shuffled order and need to loop back
        // Generate a completely new shuffle order for the next round
        console.log('End of shuffled queue reached with repeat all - generating new shuffle order');
        
        // Create an array of all indices except current
        const allIndices = Array.from({ length: queue.length }, (_, i) => i);
        
        // Shuffle all tracks thoroughly
        for (let i = allIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }
        
        // Use the first track in the new shuffled order
        nextIndex = allIndices[0];
        
        // Save the new shuffled order
        shuffledQueueRef.current = allIndices;
        
        // Clear play history for the new shuffle round
        setPlayHistory([]);
        
        console.log('New shuffled loop order created, starting with:', queue[nextIndex]?.Name || 'unknown');
    } else {
        // End of queue with no repeat
        nextIndex = currentIndex;
        return; // Don't move if we're at the end and not repeating
      }
    } else {
      // Sequential playback
      if (currentIndex < queue.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeat === 'all') {
        nextIndex = 0; // Loop back to beginning
      } else {
        // End of queue
        nextIndex = currentIndex;
        return; // Don't move if we're at the end and not repeating
      }
    }
    
    // Update the current index
    setCurrentIndex(nextIndex);
  }, [currentIndex, queue.length, shuffle, repeat, queue]);

  const playPreviousTrack = useCallback(() => {
    if (playOperationInProgressRef.current || queue.length <= 1) return;
    
    // If we're more than 3 seconds into a track, restart it instead of going to previous
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    
    // Use play history to go back if available
    if (playHistory.length > 0) {
      // Get the last track from history
      const previousIndex = playHistory[playHistory.length - 1];
      
      // Remove it from history
      setPlayHistory(prev => prev.slice(0, prev.length - 1));
      
      // Set it as current
      setCurrentIndex(previousIndex);
      return;
    }
    
    // Fall back to standard previous behavior if no history
    let prevIndex;
    if (shuffle) {
      const currentPosition = shuffledQueueRef.current.indexOf(currentIndex);
      if (currentPosition > 0) {
        prevIndex = shuffledQueueRef.current[currentPosition - 1];
      } else if (repeat === 'all') {
        // Wrap to end of shuffled queue
        prevIndex = shuffledQueueRef.current[shuffledQueueRef.current.length - 1];
      } else {
        // Stay at first track
        prevIndex = currentIndex;
        return;
      }
    } else {
      // Sequential order
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1;
      } else if (repeat === 'all') {
        prevIndex = queue.length - 1; // Wrap to end
      } else {
        // Stay at first track
        prevIndex = currentIndex;
        return;
      }
    }
    
    setCurrentIndex(prevIndex);
  }, [currentIndex, queue.length, shuffle, repeat, playHistory, audioRef]);
  
  // Get the visible queue in proper order for display
  const getVisibleQueue = useCallback(() => {
    if (shuffle && shuffledQueueRef.current.length > 0) {
      // Return queue in the stable shuffled order
      return shuffledQueueRef.current
        .filter(index => index >= 0 && index < queue.length) // Ensure valid indices
        .map(index => queue[index]);
    }
    // Return regular queue in sequential order
    return [...queue]; // Return a new copy to ensure reference changes
  }, [queue, shuffle]);

  // Use Jellyfin API playback manager when possible
  // This function tries to use native Jellyfin playback when available
  const useNativePlayback = useCallback((action, fallback) => {
    if (!api || !api.playbackManager) {
      // No API available, use fallback implementation
      return fallback();
    }
    
    try {
      switch (action) {
        case 'play':
          if (currentTrack && api.playbackManager.unpause) {
            api.playbackManager.unpause();
            setIsPlaying(true);
            return true;
          }
          break;
        case 'pause':
          if (api.playbackManager.pause) {
            api.playbackManager.pause();
            setIsPlaying(false);
            return true;
          }
          break;
        case 'next':
          if (api.playbackManager.nextTrack) {
            api.playbackManager.nextTrack();
            return true;
          }
          break;
        case 'previous':
          if (api.playbackManager.previousTrack) {
            api.playbackManager.previousTrack();
            return true;
          }
          break;
        case 'toggleShuffle':
          if (api.playbackManager.toggleShuffle) {
            api.playbackManager.toggleShuffle();
            setShuffle(prev => !prev);
            return true;
          }
          break;
        case 'toggleRepeat':
          if (api.playbackManager.toggleRepeatMode) {
            api.playbackManager.toggleRepeatMode();
            setRepeat(prev => {
              if (prev === 'off') return 'all';
              if (prev === 'all') return 'one';
              return 'off';
            });
            return true;
          }
          break;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error using native Jellyfin ${action}:`, error);
      return false;
    }
    
    // If we couldn't use the native method, use the fallback
    return fallback();
  }, [api, currentTrack]);

  // Define updateRichPresence early before any function that uses it
  const updateRichPresence = useCallback(async () => {
    try {
      if (!window.electron?.discord?.updateActivity || !currentTrack) return;
        
      // Check if Discord RPC is enabled
      const enabled = await window.electron?.discord?.isEnabled?.();
      if (!enabled) return;
      
      // Get album art URL
      let imageUrl = null;
      if (currentTrack.Id) {
        // Try to get imageUrl using Jellyfin API if available
        const api = window.jellyfinAPI;
        if (api && api.getImageUrl) {
          imageUrl = api.getImageUrl(currentTrack.Id, 'Primary', 300);
        } else if (window.getImageUrl) {
          // Fallback to global getImageUrl function if available
          imageUrl = window.getImageUrl(currentTrack.Id, 'Primary', 300);
        } else if (currentTrack.imageUrl) {
          // Use imageUrl from track if available
          imageUrl = currentTrack.imageUrl;
        }
      }

      // Extract genre information if available
      let genre = '';
      if (currentTrack.GenreName || currentTrack.GenreNames) {
        genre = currentTrack.GenreName || (currentTrack.GenreNames && currentTrack.GenreNames.join(', '));
      } else if (currentTrack.Genres && Array.isArray(currentTrack.Genres)) {
        genre = currentTrack.Genres.join(', ');
      }
      
      // Prepare track data for Discord RPC
      const trackData = {
        name: currentTrack.Name,
        artist: currentTrack.Artists?.join(', ') || currentTrack.AlbumArtist || 'Unknown Artist',
        album: currentTrack.Album || 'Unknown Album',
        isPlaying: isPlaying,
        duration: duration,
        currentTime: currentTime,
        imageUrl: imageUrl,
        genre: genre
      };
      
      // Update Discord activity with the standard RPC system
      await window.electron?.discord?.updateActivity?.(trackData);
    } catch (error) {
      console.error('Error updating Discord rich presence:', error);
    }
  }, [currentTrack, isPlaying, currentTime, duration]);

  // More reliable play function - only loads if necessary
  const play = useCallback(async () => {
    if (!audioRef.current || !currentTrack) return
    
    try {
      // Resume the AudioContext if it's in suspended state
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Start playback
      await audioRef.current.play()
      setIsPlaying(true)
      
      // Update Discord presence if available
      if (window.electron?.discord?.updateActivity) {
        updateRichPresence();
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setError(`Playback error: ${error.message}`)
      setIsPlaying(false)
    }
  }, [currentTrack, updateRichPresence])

  // Simple pause that doesn't affect currentTime or reset any state
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    try {
      console.log('Pausing audio at position:', audioRef.current.currentTime);
      
      // Simply pause the audio - the browser maintains position
      audioRef.current.pause();
      
      // Update UI state
      setIsPlaying(false);
      
      // Report pause to Jellyfin if API is available
      if (api && api.reportPlaybackProgress && currentTrack && currentTrack.Id) {
        try {
          api.reportPlaybackProgress({
            ItemId: currentTrack.Id,
            PositionTicks: Math.round(audioRef.current.currentTime * 10000000),
            IsPaused: true
          });
        } catch (error) {
          console.error('Error reporting pause to server:', error);
        }
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  }, [api, currentTrack]);

  // Simple toggle for shuffle - pure state change
  const toggleShuffle = useCallback(() => {
    setShuffle(prevShuffle => {
      const newShuffleState = !prevShuffle;
      
      // When turning shuffle on, force re-creation of shuffled queue by resetting
      if (newShuffleState) {
        console.log('Shuffle turned ON - preparing to create new shuffle order');
        // Reset the shuffle queue to force regeneration in the next effect
        shuffledQueueRef.current = [];
      } else {
        console.log('Shuffle turned OFF - resetting to sequential order');
        // When turning off, reset to sequential
        shuffledQueueRef.current = Array.from({ length: queue.length }, (_, i) => i);
      }
      
      return newShuffleState;
    });
  }, [queue.length]);

  // Simple cycle function for repeat - pure state change
  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      switch (prev) {
        case 'off': return 'all';
        case 'all': return 'one';
        case 'one': return 'off';
        default: return 'off';
      }
    });
  }, []);

  // Create a proper togglePlay function that actually toggles - moved after play and pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Load track with improved error handling
  useEffect(() => {
    if (!audioRef.current || !currentTrack || connectionStatus !== 'connected') {
      if (!currentTrack) {
        console.log('No current track to load');
      } else if (connectionStatus !== 'connected') {
        setError('Cannot play track: Server connection unavailable');
      }
      return;
    }
    
    // Track loading state
    let isMounted = true;
    let isLoading = false;
    
    // Store the track ID to compare and avoid reloading the same track
    const currentTrackId = currentTrack.Id;
    
    // Skip loading if we already have this track loaded
    if (audioRef.current._loadedTrackId === currentTrackId) {
      console.log('Track already loaded, skipping reload operation');
      
      // Still need to make sure we're playing if needed
      if (isPlaying && audioRef.current.paused) {
        // Don't use full play() function to avoid reloading
        audioRef.current.play()
          .then(() => {
            // Success
          })
          .catch(err => {
            console.error('Error resuming playback:', err);
            setIsPlaying(false);
          });
      }
      return;
    }
    
    const loadAndPrepareTrack = async () => {
      if (isLoading) return; // Prevent concurrent loads
      
      isLoading = true;
      try {
        setLoading(true);
        setError(null);
        
        // If currently playing, pause first
        if (isPlaying && audioRef.current) {
          // Cancel any pending play requests
          if (playRequestDebounceRef.current) {
            clearTimeout(playRequestDebounceRef.current);
            playRequestDebounceRef.current = null;
          }
          
          audioRef.current.pause();
        }
        
        // Add a small delay to ensure previous operations have completed
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get the audio stream URL
        const streamUrl = await safeGetStreamUrl(currentTrack.Id);
        
        // Check if component is still mounted
        if (!isMounted) return;
        
        if (!streamUrl) {
          setError('Failed to get audio stream URL');
          setLoading(false);
          isLoading = false;
          return;
        }
        
        console.log('Loading new track:', currentTrack.Name);
        
        // Ensure operation is not already in progress
        if (playOperationInProgressRef.current) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Reset audio states
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        
        // Set the source and wait for metadata to load
        audioRef.current.src = streamUrl;
        audioRef.current._loadedTrackId = currentTrackId;
        audioRef.current.load();
        
        // The canplay event will handle actual playback
        isLoading = false;
      } catch (error) {
        console.error('Error loading track:', error);
        if (isMounted) {
          setLoading(false);
          setError('Failed to load track: ' + (error.message || 'Unknown error'));
        }
        isLoading = false;
      }
    };
    
    // Load the track
    loadAndPrepareTrack();
    
    // Set track info in media session if available
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.Name,
        artist: currentTrack.Artists?.join(', ') || currentTrack.AlbumArtist || 'Unknown Artist',
        album: currentTrack.Album || 'Unknown Album',
        artwork: [
          { src: `${currentTrack.imageUrl || ''}`, sizes: '300x300', type: 'image/jpeg' },
        ]
      });
      
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
      navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentTrack, safeGetStreamUrl, isPlaying, connectionStatus, playNextTrack, playPreviousTrack, play, pause]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume
    }
  }, [volume, muted])
  
  // Queue manipulation
  const playTrack = useCallback((track, trackList = null) => {
    setError(null)
    
    if (connectionStatus !== 'connected') {
      setError('Cannot play track: Server connection unavailable')
      return
    }
    
    if (!track) {
      console.error('No track provided to playTrack')
      return
    }
    
    // If a track list is provided, use it as the new queue
    if (trackList && Array.isArray(trackList) && trackList.length > 0) {
      setQueue(trackList)
      
      // Find the index of the track in the new queue
      const newIndex = trackList.findIndex(t => t.Id === track.Id)
      if (newIndex !== -1) {
        setCurrentIndex(newIndex)
      } else if (trackList[0]) {
        // If track is not found in the list, play the first track
        setCurrentIndex(0)
      }
      
      // Reset shuffle order when changing the queue
      if (shuffle) {
        // Force the shuffle effect to create a new order
        shuffledQueueRef.current = []
      }
    } else {
      // If no track list is provided, add the track to the current queue
      // Check if track is already in queue
      const trackIndex = queue.findIndex(t => t.Id === track.Id)
      
      if (trackIndex !== -1) {
        // Track is already in the queue, just play it
        setCurrentIndex(trackIndex)
      } else {
        // Add track to queue and play it
        setQueue(prevQueue => [...prevQueue, track])
        setCurrentIndex(queue.length)
        
        // Reset shuffle order when adding to queue
        if (shuffle) {
          // Force the shuffle effect to create a new order
          shuffledQueueRef.current = []
        }
      }
    }
    
    setIsPlaying(true)
  }, [connectionStatus, queue, shuffle])
  
  // Add to queue function - now with playNext support
  const addToQueue = useCallback((track, playNext = false) => {
    if (!track) {
      console.error('Attempted to add undefined track to queue');
      return;
    }
    
    if (!track.Id) {
      console.error('Attempted to add track without ID to queue:', track);
      return;
    }
    
    console.log(`Adding track "${track.Name}" to queue, playNext=${playNext}`);
    
    setQueue(currentQueue => {
      // Create a copy of the current queue
      const newQueue = [...currentQueue];
      
      // If playNext is true, insert after current track
      if (playNext) {
        // Find the current index in the real queue
        const insertPosition = currentIndex + 1;
        console.log(`Insert position for Play Next: ${insertPosition} (current index: ${currentIndex})`);
        
        // Insert the track right after the current one
        newQueue.splice(insertPosition, 0, track);
        console.log(`Added track "${track.Name}" to play next (position ${insertPosition})`);
        
        // Log the queue structure after insertion for debugging
        console.log('Queue after insertion:', newQueue.map((t, i) => `${i}: ${t?.Name || 'Unknown'} (${t?.Id || 'no-id'})`).join(', '));
        
        // If in shuffle mode, update the shuffled order to include this track next
        if (shuffle && shuffledQueueRef.current.length > 0) {
          // Find current position in shuffled queue
          const currentShufflePosition = shuffledQueueRef.current.indexOf(currentIndex);
          console.log(`Current shuffle position: ${currentShufflePosition}`);
          
          // Create new indices array with proper order
          const newIndices = [];
          
          // Add all indices up to and including current position
          for (let i = 0; i <= currentShufflePosition; i++) {
            newIndices.push(shuffledQueueRef.current[i]);
          }
          
          // Add the new track's index (which is insertPosition)
          newIndices.push(insertPosition);
          
          // Add the rest of the indices
          for (let i = currentShufflePosition + 1; i < shuffledQueueRef.current.length; i++) {
            // Adjust indices that are >= insertPosition
            const oldIndex = shuffledQueueRef.current[i];
            newIndices.push(oldIndex >= insertPosition ? oldIndex + 1 : oldIndex);
          }
          
          // Update the shuffled indices
          shuffledQueueRef.current = newIndices;
          console.log('Updated shuffle order after adding track to play next:', 
              shuffledQueueRef.current.map(i => `${i}: ${newQueue[i]?.Name || 'Unknown'}`).join(', '));
        }
      } else {
        // Add to the end of the queue as before
        newQueue.push(track);
        console.log(`Added track "${track.Name}" to the end of the queue (position ${newQueue.length - 1})`);
        
        // If shuffle is on, add to shuffled queue
        if (shuffle && shuffledQueueRef.current.length > 0) {
          // Add to end of shuffled queue if not empty
          shuffledQueueRef.current.push(newQueue.length - 1);
          console.log('Updated shuffle order after adding track to end');
        }
      }
      
      return newQueue;
    });
  }, [currentIndex, shuffle]);
  
  const clearQueue = useCallback(() => {
    setQueue([])
    setCurrentIndex(0)
    pause()
    setError(null)
  }, [pause])
  
  const removeFromQueue = useCallback((index) => {
    if (index < 0 || index >= queue.length) {
      console.error(`Cannot remove track: Invalid index ${index} (queue length: ${queue.length})`);
      return;
    }
    
    // Get the track being removed for logging
    const trackToRemove = queue[index];
    console.log(`Removing track "${trackToRemove?.Name || 'unknown'}" at index ${index}`);
    
    // Create a new queue without the track at the specified index
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    
    // Update the queue
    setQueue(newQueue);
    
    // Adjust current index if needed
    if (index < currentIndex) {
      // If removing a track before the current one, decrement current index
      setCurrentIndex(currentIndex - 1);
      console.log(`Adjusted currentIndex to ${currentIndex - 1} after removal`);
    } else if (index === currentIndex) {
      // If removing current track, handle special case
      if (newQueue.length === 0) {
        // Queue is now empty, stop playback
        pause();
        console.log('Removed last track, pausing playback');
      } else if (index >= newQueue.length) {
        // We were at the end, move to the new last track
        setCurrentIndex(newQueue.length - 1);
        console.log(`Moved to last track at index ${newQueue.length - 1}`);
      }
      // Otherwise current index stays the same, pointing to the next track
    }
    
    // Update shuffle indices to reflect the queue change
    if (shuffle && shuffledQueueRef.current.length > 0) {
      // Create a new shuffled queue without the removed track's index
      const newShuffledQueue = shuffledQueueRef.current.filter(i => i !== index);
      
      // Adjust all indices that were greater than the removed index
      for (let i = 0; i < newShuffledQueue.length; i++) {
        if (newShuffledQueue[i] > index) {
          newShuffledQueue[i]--;
        }
      }
      
      shuffledQueueRef.current = newShuffledQueue;
      console.log('Updated shuffle indices after removal');
    }
  }, [queue, currentIndex, pause, shuffle]);
  
  // Playback control
  const seekTo = useCallback((time) => {
    if (!audioRef.current) return;
    
    try {
      // Validate the seek position is within bounds
      const validTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
      
      // Directly set the time without pausing
      audioRef.current.currentTime = validTime;
      
      // Update state for UI (not necessary for playback)
      setCurrentTime(validTime);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, []);
  
  const setVolumeLevel = useCallback((level) => {
    try {
      const newVolume = Math.max(0, Math.min(1, level))
      setVolume(newVolume)
    } catch (error) {
      console.error('Error setting volume:', error)
    }
  }, [])
  
  const toggleMute = useCallback(() => {
    setMuted(prev => !prev)
  }, [])

  // Define handleEnded outside the useEffect
  const handleEnded = useCallback(() => {
    console.log('Track ended');
    
    // If repeat one, restart the current track
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error restarting track in repeat one mode:', error);
          });
        }
      }
      return;
    }
    
    // Otherwise move to next track
    playNextTrack();
  }, [repeat, playNextTrack]);

  // Improve audio event handlers to prevent interruptions
  useEffect(() => {
    if (!audioRef.current) return
    
    // Set volume
    audioRef.current.volume = volume
    
    // Add event listeners with improved error handling
    const handleTimeUpdate = () => {
      setCurrentTime(audioRef.current.currentTime)
      
      // Report playback position to Jellyfin if API is available
      if (api && api.reportPlaybackProgress && currentTrack && currentTrack.Id) {
        try {
          // Report progress less frequently (every ~5 seconds) to reduce API calls
          if (Math.floor(audioRef.current.currentTime) % 5 === 0) {
            api.reportPlaybackProgress({
              ItemId: currentTrack.Id,
              PositionTicks: Math.round(audioRef.current.currentTime * 10000000), // Convert to ticks
              IsPaused: !isPlaying
            });
          }
        } catch (error) {
          // Don't show errors for progress reporting
          console.error('Error reporting playback progress:', error);
        }
      }
    }
    
    const handleDurationChange = () => {
      // Make sure duration is a valid number
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== Infinity) {
        console.log('Duration changed to:', audioRef.current.duration);
        setDuration(audioRef.current.duration)
      } else {
        // If we got an invalid duration, don't update it to 0 if we already have a valid value
        if (duration <= 0) {
          setDuration(0)
        }
      }
    }
    
    const handleLoadedMetadata = () => {
      setMetadataLoaded(true)
      // Make sure duration is a valid number
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== Infinity) {
        console.log('Metadata loaded with duration:', audioRef.current.duration);
        setDuration(audioRef.current.duration)
      } else {
        // If track has RunTimeTicks, use that for duration
        if (currentTrack && currentTrack.RunTimeTicks) {
          const durationFromTicks = currentTrack.RunTimeTicks / 10000000;
          console.log('Using duration from track metadata:', durationFromTicks);
          setDuration(durationFromTicks);
        }
      }
      
      // If we're supposed to be playing, ensure we start
      if (isPlaying && !playOperationInProgressRef.current) {
        // If there's already a queued play request, don't create another one
        if (playRequestDebounceRef.current) {
          clearTimeout(playRequestDebounceRef.current)
        }
        
        // Add a small delay to ensure all events have settled
        playRequestDebounceRef.current = setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play()
              .then(() => {
                playRequestDebounceRef.current = null
              })
              .catch(error => {
                console.error('Error playing after metadata loaded:', error)
                setIsPlaying(false)
                setError('Failed to play audio after loading metadata')
                playRequestDebounceRef.current = null
              })
          }
        }, 150) // Slightly longer delay for better stability
      }
    }
    
    const handleCanPlay = () => {
      setLoading(false)
      
      // Check for saved position to restore
      if (playStateRef.current.currentTime > 0) {
        try {
          audioRef.current.currentTime = playStateRef.current.currentTime
          // Reset stored position
          playStateRef.current.currentTime = 0
        } catch (err) {
          console.error('Error restoring playback position:', err)
        }
      }
      
      // If we're supposed to be playing and not in the middle of another operation, start playback
      if (isPlaying && !playOperationInProgressRef.current) {
        // If there's already a queued play request, don't create another one
        if (playRequestDebounceRef.current) {
          clearTimeout(playRequestDebounceRef.current)
        }
        
        // Ensure we're not in another playback operation
        if (!playOperationInProgressRef.current) {
          // Add a small delay to ensure all events have settled
          playRequestDebounceRef.current = setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play()
                .then(() => {
                  playRequestDebounceRef.current = null
                })
                .catch(error => {
                  console.error('Error playing audio:', error)
                  setIsPlaying(false)
                  setError('Failed to play audio. The format may not be supported.')
                  playRequestDebounceRef.current = null
                })
            }
          }, 200) // Even longer delay for better stability
        }
      }
    }
    
    const handleLoadStart = () => {
      setLoading(true)
    }
    
    const handleError = (e) => {
      console.error('Audio playback error:', e)
      setLoading(false)
      
      // Extract meaningful error message
      let errorMessage = 'Audio playback error'
      if (e.target.error) {
        switch (e.target.error.code) {
          case e.target.error.MEDIA_ERR_ABORTED:
            errorMessage = 'Playback aborted by the user'
            break
          case e.target.error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred during playback'
            break
          case e.target.error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error'
            break
          case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported'
            break
          default:
            errorMessage = `Playback error: ${e.target.error.message || 'unknown error'}`
        }
      }
      
      setError(errorMessage)
      
      // Try to recover using Jellyfin API if available
      if (api && api.playbackManager && api.playbackManager.nextTrack && retryAttemptsRef.current >= maxRetryAttempts) {
        try {
          // If we've retried multiple times and failed, try to use Jellyfin to skip to next track
          api.playbackManager.nextTrack();
          return;
        } catch (error) {
          console.error('Error using Jellyfin next track for recovery:', error);
        }
      }
      
      // Try to recover from error by retrying or skipping to next track
      if (retryAttemptsRef.current < maxRetryAttempts) {
        retryAttemptsRef.current++
        
        // Attempt to reload the current audio
        if (currentTrack) {
          const streamUrl = safeGetStreamUrl(currentTrack.Id)
          if (streamUrl) {
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.src = streamUrl
                audioRef.current.load()
                
                if (isPlaying && !playOperationInProgressRef.current) {
                  // If there's already a queued play request, don't create another one
                  if (playRequestDebounceRef.current) {
                    clearTimeout(playRequestDebounceRef.current)
                  }
                  
                  // Add a delay before trying to play again
                  playRequestDebounceRef.current = setTimeout(() => {
                    if (audioRef.current) {
                      audioRef.current.play()
                        .then(() => {
                          playRequestDebounceRef.current = null
                        })
                        .catch(error => {
                          console.error('Retry error:', error)
                          playRequestDebounceRef.current = null
                          // If we've retried max times, give up and try next track
                          if (retryAttemptsRef.current >= maxRetryAttempts) {
                            playNextTrack()
                          }
                        })
                    }
                  }, 400) // Longer delay for retries
                }
              }
            }, 1000) // Wait a second before retrying
          }
        }
      } else {
        // If we've tried multiple times and failed, skip to next track
        playNextTrack()
      }
    }
    
    // Set event listeners
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate)
    audioRef.current.addEventListener('durationchange', handleDurationChange)
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
    audioRef.current.addEventListener('ended', handleEnded)
    audioRef.current.addEventListener('canplay', handleCanPlay)
    audioRef.current.addEventListener('loadstart', handleLoadStart)
    audioRef.current.addEventListener('error', handleError)
    
    // Clean up
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
        audioRef.current.removeEventListener('durationchange', handleDurationChange)
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('canplay', handleCanPlay)
        audioRef.current.removeEventListener('loadstart', handleLoadStart)
        audioRef.current.removeEventListener('error', handleError)
      }
      
      // Clean up any pending play requests
      if (playRequestDebounceRef.current) {
        clearTimeout(playRequestDebounceRef.current)
      }
    }
  }, [volume, isPlaying, safeGetStreamUrl, playNextTrack, repeat, duration, playOperationInProgressRef, api, currentTrack, handleEnded])

  // Preload next track for gapless playback - simplified
  useEffect(() => {
    if (!nextAudioRef.current || !currentTrack || queue.length <= 1 || !isPlaying) return;
    
    // Safely load the next track without affecting current playback
    const loadNextTrack = async () => {
      // Simple index calculation based on repeat and shuffle state
      let nextIndex;
      
      if (shuffle) {
        const currentShuffleIndex = shuffledQueueRef.current.indexOf(currentIndex);
        const nextShuffleIndex = (currentShuffleIndex + 1) % shuffledQueueRef.current.length;
        nextIndex = shuffledQueueRef.current[nextShuffleIndex];
      } else {
        nextIndex = (currentIndex + 1) % queue.length;
      }
      
      // Skip preloading if in repeat one mode
      if (repeat === 'one' || nextIndex === currentIndex) return;
      
      try {
        const nextTrack = queue[nextIndex];
        if (!nextTrack) return;
        
        // Only load if we haven't already loaded this track
        if (!nextAudioRef.current._preloadedTrackId || nextAudioRef.current._preloadedTrackId !== nextTrack.Id) {
          const streamUrl = await safeGetStreamUrl(nextTrack.Id);
          if (streamUrl) {
            // Set properties but don't start loading immediately
            nextAudioRef.current.src = streamUrl;
            nextAudioRef.current._preloadedTrackId = nextTrack.Id;
            nextAudioRef.current.preload = 'auto';
            // Don't call load() immediately as it could impact performance
          }
        }
      } catch (error) {
        console.error('Error in preload logic:', error);
      }
    };
    
    // Debounce the loading with a timeout to avoid performance impact
    const timeoutId = setTimeout(loadNextTrack, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [currentTrack, currentIndex, queue, isPlaying, shuffle, repeat, safeGetStreamUrl]);

  // Start preloading next track when current track is near the end
  useEffect(() => {
    if (!audioRef.current || !isPlaying || !currentTrack || !metadataLoaded) return;
    
    const handleTimeUpdateForPreload = () => {
      // If we're near the end of the track (last 15 seconds), prepare for gapless transition
      if (audioRef.current.duration && 
          audioRef.current.currentTime > 0 && 
          audioRef.current.duration - audioRef.current.currentTime < 15 && 
          audioRef.current.duration - audioRef.current.currentTime > 14) {
        
        console.log('Near end of track, preparing for gapless transition');
        
        // Make sure next track is ready
        if (nextAudioRef.current && nextAudioRef.current.readyState >= 2) {
          console.log('Next track is ready for playback');
          
          // Make sure the next track is ready to play by preloading more if needed
          if (nextAudioRef.current.readyState < 4) {
            nextAudioRef.current.load();
          }
        }
      }
    };
    
    audioRef.current.addEventListener('timeupdate', handleTimeUpdateForPreload);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdateForPreload);
      }
    };
  }, [isPlaying, currentTrack, metadataLoaded]);

  // Set correct duration when current track changes
  useEffect(() => {
    if (currentTrack) {
      // Reset duration to avoid showing previous track's duration
      setDuration(0);
      
      // If track has RunTimeTicks, use that for initial duration
      if (currentTrack.RunTimeTicks) {
        const durationFromTicks = currentTrack.RunTimeTicks / 10000000;
        console.log('Setting initial duration from metadata:', durationFromTicks);
        setDuration(durationFromTicks);
      }
    }
  }, [currentTrack]);

  // Create a dedicated queueManager object to centralize queue operations
  const queueManager = useMemo(() => {
    return {
      // Move a track from one position to another
      moveTrack: (sourceIndex, destIndex) => {
        console.log('Queue Manager: Moving track', {
          source: sourceIndex,
          destination: destIndex,
          sourceTrack: queue[sourceIndex]?.Name,
          destTrack: queue[destIndex]?.Name
        });
        
        setQueue(prevQueue => {
          // Validate indices
          if (sourceIndex < 0 || sourceIndex >= prevQueue.length ||
              destIndex < 0 || destIndex >= prevQueue.length) {
            console.error('Invalid indices for moveTrack:', sourceIndex, destIndex);
            return prevQueue;
          }
          
          // Create a new queue with the track moved
          const result = [...prevQueue];
          const [removed] = result.splice(sourceIndex, 1);
          result.splice(destIndex, 0, removed);
          
          // Report the change
          const trackName = removed?.Name || 'Unknown track';
          console.log(`Queue updated: "${trackName}" moved from ${sourceIndex} to ${destIndex}`);
          
          // If the current track was moved, update currentIndex
          if (sourceIndex === currentIndex) {
            setTimeout(() => setCurrentIndex(destIndex), 0);
          } 
          // Otherwise, adjust currentIndex if necessary
          else if (
            (sourceIndex < currentIndex && destIndex >= currentIndex) || 
            (sourceIndex > currentIndex && destIndex <= currentIndex)
          ) {
            setTimeout(() => {
              if (sourceIndex < currentIndex) {
                setCurrentIndex(prev => prev - 1);
              } else {
                setCurrentIndex(prev => prev + 1);
              }
            }, 0);
          }
          
          // Update shuffle order if shuffle is on
          if (shuffle && shuffledQueueRef.current.length > 0) {
            // Create mapping from track IDs to their indices in the new queue
            const trackIdToIndexMap = {};
            result.forEach((track, idx) => {
              if (track && track.Id) {
                trackIdToIndexMap[track.Id] = idx;
              }
            });
            
            // Update the shuffled queue to reflect the new positions
            const newShuffledQueue = shuffledQueueRef.current.map(idx => {
              const trackId = prevQueue[idx]?.Id;
              return trackId ? trackIdToIndexMap[trackId] : idx;
            });
            
            shuffledQueueRef.current = newShuffledQueue;
          }
          
          return result;
        });
      },
      
      // Move a track one position up
      moveTrackUp: (index) => {
        if (index > 0) {
          queueManager.moveTrack(index, index - 1);
          return true;
        }
        return false;
      },
      
      // Move a track one position down
      moveTrackDown: (index) => {
        if (index < queue.length - 1) {
          queueManager.moveTrack(index, index + 1);
          return true;
        }
        return false;
      },
      
      // Find a track's index by its ID
      findTrackIndex: (trackId) => {
        return queue.findIndex(track => track && track.Id === trackId);
      },
      
      // Direct ID-based track movement (for UI components)
      moveTrackById: (trackId, direction) => {
        const index = queueManager.findTrackIndex(trackId);
        if (index === -1) {
          console.error('Track not found in queue:', trackId);
          return false;
        }
        
        if (direction === 'up') {
          return queueManager.moveTrackUp(index);
        } else if (direction === 'down') {
          return queueManager.moveTrackDown(index);
        }
        
        return false;
      },
      
      // Swap two tracks by their IDs
      swapTracksById: (track1Id, track2Id) => {
        const index1 = queueManager.findTrackIndex(track1Id);
        const index2 = queueManager.findTrackIndex(track2Id);
        
        if (index1 === -1 || index2 === -1) {
          console.error('One or both tracks not found:', { track1Id, track2Id });
          return false;
        }
        
        queueManager.moveTrack(index1, index2);
        return true;
      }
    };
  }, [queue, currentIndex, shuffle, setQueue, setCurrentIndex]);

  // Replace the reorderQueue function with the new queueManager.moveTrack
  const reorderQueue = useCallback((sourceIndex, destinationIndex) => {
    return queueManager.moveTrack(sourceIndex, destinationIndex);
  }, [queueManager]);
  
  // Setup function for updating default volume
  const updateDefaultVolume = useCallback((newVolume) => {
    const validVolume = Math.max(0, Math.min(1, newVolume));
    setDefaultVolume(validVolume);
    setVolume(validVolume);
    
    // Update current audio elements to new volume
    if (audioRef.current && !muted) {
      audioRef.current.volume = validVolume;
    }
    
    // Save to localStorage
    localStorage.setItem('jellyfi_default_volume', validVolume.toString());
  }, [muted]);

  // Setup function for updating crossfade duration
  const updateCrossfadeDuration = useCallback((seconds) => {
    const duration = Math.max(0, Math.min(12, seconds)); // Limit between 0-12 seconds
    setCrossfadeDuration(duration);
    
    // Save to localStorage
    localStorage.setItem('jellyfi_crossfade', duration.toString());
  }, []);
  
  // Completely stop all playback and reset the player state
  // This is used when logging out to ensure no audio continues playing
  const stopAndResetPlayback = useCallback(() => {
    console.log('Stopping all playback and resetting player state');
    
    // Reset crossfade if the function exists
    if (typeof resetCrossfadeNodes === 'function') {
      resetCrossfadeNodes();
    }
    
    // Stop audio playback and clear sources
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current._loadedTrackId = null;
    }
    
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current.currentTime = 0;
      nextAudioRef.current.src = '';
      nextAudioRef.current._preloadedTrackId = null;
    }
    
    // Clean up Web Audio API resources
    if (audioContextRef.current) {
      try {
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }
        
        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
        }
        
        // Clean up equalizer nodes
        if (equalizerNodesRef.current && equalizerNodesRef.current.length) {
          equalizerNodesRef.current.forEach(node => {
            try {
              node.disconnect();
            } catch (e) {
              // Ignore disconnection errors
            }
          });
          equalizerNodesRef.current = [];
        }
        
        if (analyserNodeRef.current) {
          analyserNodeRef.current.disconnect();
          analyserNodeRef.current = null;
        }
        
        // Clean up crossfade nodes
        if (currentGainNodeRef.current) {
          currentGainNodeRef.current.disconnect();
          currentGainNodeRef.current = null;
        }
        
        if (nextGainNodeRef.current) {
          nextGainNodeRef.current.disconnect();
          nextGainNodeRef.current = null;
        }
        
        if (currentSourceNodeRef.current) {
          currentSourceNodeRef.current.disconnect();
          currentSourceNodeRef.current = null;
        }
        
        if (nextSourceNodeRef.current) {
          nextSourceNodeRef.current.disconnect();
          nextSourceNodeRef.current = null;
        }
        
        // Don't close the audioContext as it may be needed again
        // Just reset/suspend it if possible
        if (audioContextRef.current.state !== 'closed') {
          if (audioContextRef.current.suspend) {
            audioContextRef.current.suspend();
          }
        }
      } catch (error) {
        console.error('Error cleaning up Web Audio API resources:', error);
      }
    }
    
    // Clear any pending timeouts or intervals
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset player state
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(false);
    setError(null);
    setMetadataLoaded(false);
    setCrossfadeActive && setCrossfadeActive(false);
    playOperationInProgressRef.current = false;
    
    // Don't reset the queue as it might be needed when playback restarts
    console.log('Player state has been completely reset');
  }, []);

  // Add the new settings to the context value
  const value = {
    currentTrack,
    queue,
    visibleQueue: getVisibleQueue(),
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    loading,
    error,
    metadataLoaded,
    play,
    pause,
    togglePlay,
    seekTo,
    playNext: playNextTrack,
    playPrevious: playPreviousTrack,
    playTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setVolumeLevel,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    reorderQueue,
    moveTrackUp: queueManager.moveTrackUp,
    moveTrackDown: queueManager.moveTrackDown,
    moveTrackById: queueManager.moveTrackById,
    findTrackIndex: queueManager.findTrackIndex,
    queueManager,
    
    // Add equalizer features
    equalizer,
    updateEqualizerBand,
    setEqualizerEnabled,
    applyEqualizerPreset,
    
    // Add crossfade and default volume settings
    crossfadeDuration,
    setCrossfadeDuration: updateCrossfadeDuration,
    defaultVolume,
    setDefaultVolume: updateDefaultVolume,
    
    // Complete player control for when logging out
    stopAndResetPlayback,
    
    // Add a direct way to modify the queue - much simpler and more reliable
    directSwapTracks: (trackId1, trackId2) => {
      try {
        return queueManager.directSwapTracks(trackId1, trackId2);
      } catch (error) {
        console.error('Error swapping tracks in queue:', error);
        return false;
      }
    }
  }
  
  // Update visibleQueue when queue or shuffle changes
  useEffect(() => {
    setVisibleQueue(getVisibleQueue());
  }, [queue, shuffle, getVisibleQueue]);
  
  // Handle crossfade
  useEffect(() => {
    if (!audioRef.current || !nextAudioRef.current || !isPlaying || !currentTrack || 
        crossfadeDuration <= 0 || repeat === 'one') return;
    
    let audioSourcesCreated = false;
    
    const setupCrossfadeNodes = () => {
      if (audioSourcesCreated) {
        console.log('Audio sources already created, cleaning up first');
        resetCrossfadeNodes();
      }
      
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
          console.error('Could not create AudioContext:', error);
          return false;
        }
      }
      
      try {
        const ctx = audioContextRef.current;
        
        // Create gain nodes for smooth volume control
        currentGainNodeRef.current = ctx.createGain();
        nextGainNodeRef.current = ctx.createGain();
        
        // Set initial gain values
        currentGainNodeRef.current.gain.value = audioRef.current.volume;
        nextGainNodeRef.current.gain.value = 0;
        
        // Create source nodes from audio elements only if they don't already exist
        try {
          currentSourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
          nextSourceNodeRef.current = ctx.createMediaElementSource(nextAudioRef.current);
          audioSourcesCreated = true;
        } catch (error) {
          // Handle the case where source nodes may already exist
          console.warn('Could not create MediaElementSource, will try to reuse existing:', error);
          // If we couldn't create new sources, crossfade can't work with Web Audio
          return false;
        }
        
        // Connect the audio graph
        try {
          // Current track: source -> gain -> destination
          currentSourceNodeRef.current.connect(currentGainNodeRef.current);
          currentGainNodeRef.current.connect(ctx.destination);
          
          // Next track: source -> gain -> destination
          nextSourceNodeRef.current.connect(nextGainNodeRef.current);
          nextGainNodeRef.current.connect(ctx.destination);
        } catch (error) {
          console.error('Error connecting audio nodes:', error);
          resetCrossfadeNodes();
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error setting up crossfade nodes:', error);
        return false;
      }
    };
    
    const handleTimeUpdateForCrossfade = () => {
      // If we're near the end of the track (at crossfade point), start the crossfade
      if (!audioRef.current || !audioRef.current.duration) return;
      
      const timeRemaining = audioRef.current.duration - audioRef.current.currentTime;
      
      if (timeRemaining <= crossfadeDuration && 
          timeRemaining > 0 && 
          !crossfadeActive && 
          crossfadeDuration > 0) {
        
        // Determine the next track index
        let nextIndex;
        if (shuffle) {
          const currentShuffleIndex = shuffledQueueRef.current.indexOf(currentIndex);
          const nextShuffleIndex = (currentShuffleIndex + 1) % shuffledQueueRef.current.length;
          nextIndex = shuffledQueueRef.current[nextShuffleIndex];
          } else {
          nextIndex = (currentIndex + 1) % queue.length;
        }
        
        // Do not crossfade if we're at the end and not repeating
        if (currentIndex === queue.length - 1 && repeat !== 'all' && !shuffle) {
          return;
        }
        
        // Get next track
        const nextTrack = queue[nextIndex];
        if (!nextTrack) return;
        
        // Start crossfade
        console.log(`Starting ${crossfadeDuration}s crossfade to next track:`, nextTrack.Name);
        setCrossfadeActive(true);
        
        // Begin the Spotify-style crossfade
        spotifyCrossfade(nextTrack, nextIndex, timeRemaining);
      }
    };
    
    // Spotify-style crossfade implementation
    const spotifyCrossfade = (nextTrack, nextIndex, timeRemaining) => {
      console.log('Using Spotify-style crossfade');
      
      // Calculate actual duration (capped by remaining time)
      const actualDuration = Math.min(crossfadeDuration, timeRemaining);
      if (actualDuration <= 0) {
        setCrossfadeActive(false);
        return;
      }
      
      // Prepare the next track
      const streamUrl = safeGetStreamUrl(nextTrack.Id);
      if (!streamUrl) {
        console.error('Cannot get stream URL for next track');
        setCrossfadeActive(false);
        return;
      }
      
      // Set up next audio element - critical to set volume to 0 before loading
      nextAudioRef.current.volume = 0;
      nextAudioRef.current.src = streamUrl;
      nextAudioRef.current._preloadedTrackId = nextTrack.Id;
      nextAudioRef.current.currentTime = 0;
      nextAudioRef.current.preload = 'auto';
      
      // Variables for the crossfade
      const currentVolume = audioRef.current.volume;
      const startTime = Date.now();
      const endTime = startTime + (actualDuration * 1000);
      
      // Use exponential curve for more natural-sounding crossfade
      // x = progress (0-1), result = transformed value for better sound
      const easeInOutExpo = x => {
        return x === 0
          ? 0
          : x === 1
          ? 1
          : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2
          : (2 - Math.pow(2, -20 * x + 10)) / 2;
      };
      
      // Once the next track is ready to play, start the crossfade
      const startCrossfade = () => {
        // Start playing the next track (at volume 0)
        const playPromise = nextAudioRef.current.play();
        
        if (playPromise === undefined) {
          console.error('Play promise undefined in crossfade');
          setCrossfadeActive(false);
          return;
        }
        
        playPromise.then(() => {
          console.log('Next track playback started, beginning volume transition');
          
          // Create interval for smooth volume transitions
          // Running at 60fps for smooth transitions
          const fadeInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            const duration = endTime - startTime;
            
            // Calculate progress (0 to 1)
            let progress = Math.min(elapsed / duration, 1);
            
            // Apply easing for smoother fade
            const easedProgress = easeInOutExpo(progress);
            
            // Update volumes - ensure we don't go below 0 or above currentVolume
            if (audioRef.current) {
              audioRef.current.volume = Math.max(0, currentVolume * (1 - easedProgress));
            }
            
            if (nextAudioRef.current) {
              nextAudioRef.current.volume = Math.min(currentVolume, currentVolume * easedProgress);
            }
            
            // When crossfade is complete
            if (progress >= 1) {
              clearInterval(fadeInterval);
              
              // Perform the track switch WITHOUT resetting anything
              performTrackSwitch(nextIndex);
            }
          }, 1000/60); // ~16.7ms for 60fps
          
          // Store the interval ID for cleanup
          crossfadeIntervalRef.current = fadeInterval;
        }).catch(error => {
          console.error('Error starting crossfade:', error);
          setCrossfadeActive(false);
        });
      };
      
      // We'll track loading state to ensure smooth playback
      const loadHandler = () => {
        nextAudioRef.current.removeEventListener('canplaythrough', loadHandler);
        
        // Only proceed if we're still in crossfade mode (could have been cancelled)
        if (!crossfadeActive) return;
        
        console.log('Next track loaded and ready for playback');
        startCrossfade();
      };
      
      // Listen for when the track is ready to play
      nextAudioRef.current.addEventListener('canplaythrough', loadHandler);
      
      // Fallback in case the event doesn't fire
      const fallbackTimeout = setTimeout(() => {
        if (crossfadeActive && nextAudioRef.current.paused) {
          nextAudioRef.current.removeEventListener('canplaythrough', loadHandler);
          console.log('Fallback timeout triggered, starting crossfade anyway');
          startCrossfade();
        }
      }, Math.min(timeRemaining * 500, 1000)); // Max 1 second wait
      
      // Store the timeout for cleanup
      crossfadeTimeoutRef.current = fallbackTimeout;
    };
    
    // Perform the track switch without interrupting playback
    const performTrackSwitch = (nextIndex) => {
      console.log('Completing crossfade transition to track:', nextIndex);
      
      // Add current track to history before changing
      setPlayHistory(prev => [...prev, currentIndex]);
      
      // The next track is already playing - just update our state
      setCurrentIndex(nextIndex);
      setCrossfadeActive(false);
      
      // Clean up any active intervals/timeouts
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
      
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      
      // CRITICAL: Swap the audio refs to match our mental model
      // This lets the next track continue playing as the "current" track
      const tempAudio = audioRef.current;
      audioRef.current = nextAudioRef.current;
      nextAudioRef.current = tempAudio;
      
      // Reset the old track (now in nextAudioRef) for future use
      nextAudioRef.current.pause();
      nextAudioRef.current.currentTime = 0;
      nextAudioRef.current.volume = 0;
      nextAudioRef.current.src = '';
      nextAudioRef.current._preloadedTrackId = null;
    };
    
    // Set up the timeupdate event handler
    audioRef.current.addEventListener('timeupdate', handleTimeUpdateForCrossfade);
    
    // Clean up
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdateForCrossfade);
      }
      
      // Clear any pending timeouts and intervals
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentTrack, currentIndex, queue, shuffle, repeat, crossfadeDuration, crossfadeActive, safeGetStreamUrl, defaultVolume]);

  // Reset all audio nodes and clean up crossfade
  const resetCrossfadeNodes = () => {
    try {
      // Clear any pending timeouts and intervals
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
      
      // Disconnect and clean up nodes if they exist
      if (currentGainNodeRef.current) {
        currentGainNodeRef.current.disconnect();
        currentGainNodeRef.current = null;
      }
      
      if (nextGainNodeRef.current) {
        nextGainNodeRef.current.disconnect();
        nextGainNodeRef.current = null;
      }
      
      if (currentSourceNodeRef.current) {
        currentSourceNodeRef.current.disconnect();
        currentSourceNodeRef.current = null;
      }
      
      if (nextSourceNodeRef.current) {
        nextSourceNodeRef.current.disconnect();
        nextSourceNodeRef.current = null;
      }
      
      // Reset crossfade state
      setCrossfadeActive(false);
    } catch (error) {
      console.error('Error resetting crossfade nodes:', error);
    }
  };
  
  // This gets called when manually changing tracks
  const resetAudioPlayback = () => {
    // Clean up any active crossfades
    resetCrossfadeNodes();
    
    // Reset both audio elements
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current.currentTime = 0;
      nextAudioRef.current.src = '';
      nextAudioRef.current._preloadedTrackId = null;
    }
  };

  // Expose the player context value as a global object for integration with other services
  useEffect(() => {
    // Expose the player service globally for other services to use (like JellyfinContext for logout)
    window.playerService = value;
    
    // Set the context reference for the standalone reorderQueue function
    setPlayerContextRef(value);
    
    return () => {
      // Clean up when provider unmounts
      delete window.playerService;
      setPlayerContextRef(null);
    };
  }, [value]);
  
  // Update the global queue manager reference in useEffect
  useEffect(() => {
    // Update the global reference to the queue manager
    updateQueueManagerRef(queueManager);
    
    // Expose the player service globally for other services to use
    window.playerService = value;
    
    return () => {
      // Clean up when provider unmounts
      updateQueueManagerRef(null);
      delete window.playerService;
    };
  }, [queueManager, value]);

  // Add a reference for the Discord RPC update interval
  const discordRpcIntervalRef = useRef(null);

  // Effect for updating Discord Rich Presence when track changes or when playback starts/stops
  useEffect(() => {
    // Clear any existing interval
    if (discordRpcIntervalRef.current) {
      clearInterval(discordRpcIntervalRef.current);
      discordRpcIntervalRef.current = null;
    }

    // Only set up RPC if we have a current track
    if (!currentTrack) {
      // Clear Discord activity if supported
      window.electron.discord?.clearActivity?.().catch(err => 
        console.error('Error clearing Discord activity:', err)
      );
      return;
    }

    // Initial update
    updateRichPresence();

    // Set up interval to update Discord rich presence every 5 seconds if playing
    // This ensures the progress bar and timestamps stay updated
    if (isPlaying) {
      discordRpcIntervalRef.current = setInterval(updateRichPresence, 5000);
    }

    // Clean up interval on unmount or when track/playback state changes
    return () => {
      if (discordRpcIntervalRef.current) {
        clearInterval(discordRpcIntervalRef.current);
        discordRpcIntervalRef.current = null;
      }
    };
  }, [currentTrack, isPlaying, currentTime, duration, updateRichPresence]);
  
  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
} 

// Simple global reference to the context
let _queueManager = null;

// Export a function to update the reference
export const updateQueueManagerRef = (manager) => {
  _queueManager = manager;
};

// Export a function to reorder queue items directly
export const reorderQueue = (sourceIndex, destinationIndex) => {
  if (_queueManager && _queueManager.moveTrack) {
    return _queueManager.moveTrack(sourceIndex, destinationIndex);
  }
  return false;
};