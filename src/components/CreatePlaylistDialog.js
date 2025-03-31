import React from 'react';

// Global initialization flag to ensure we only set up event handlers once
let isDialogInitialized = false;

// Create a consistent global event handler to preserve between renders
if (typeof window !== 'undefined' && !isDialogInitialized) {
  // Add global stylesheet for animations and effects
  const styleId = 'native-playlist-dialog-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideLeft {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.5); }
        70% { box-shadow: 0 0 0 12px rgba(29, 185, 84, 0); }
        100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
      }
      @keyframes shine {
        0% { background-position: -100px; }
        60%, 100% { background-position: 320px; }
      }
      @keyframes checkmarkDraw {
        0% { stroke-dashoffset: 24; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-6px) rotate(1deg); }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes musicNoteFloat {
        0% { opacity: 0.7; transform: translate(0, 0) rotate(0deg); }
        25% { opacity: 0.8; }
        50% { opacity: 0.5; }
        75% { opacity: 0.8; }
        100% { opacity: 0.7; transform: translate(10px, -15px) rotate(10deg); }
      }
      
      /* For accessibility - focus styles */
      .native-playlist-button:focus-visible {
        outline: 2px solid #1ED760;
        outline-offset: 2px;
      }
      
      /* Hide scrollbar but allow scrolling */
      .native-playlist-scroll {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .native-playlist-scroll::-webkit-scrollbar {
        display: none;
      }
      
      /* Define a modern font for the dialog */
      .native-playlist-font {
        font-family: 'Circular', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif;
        letter-spacing: -0.025em;
      }
      
      .native-suggestion-chip {
        background-color: #1DB954;
        border-radius: 16px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        color: white;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(29, 185, 84, 0.2);
        font-family: 'Circular', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif;
        letter-spacing: -0.01em;
      }
      
      .native-suggestion-chip:hover {
        background-color: #1ED760;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
      }
      
      .music-icon {
        animation: musicNoteFloat 8s infinite alternate ease-in-out;
        opacity: 0.7;
        position: absolute;
      }
      .music-icon:nth-child(1) { animation-delay: 0s; }
      .music-icon:nth-child(2) { animation-delay: 2s; }
      .music-icon:nth-child(3) { animation-delay: 4s; }
      .music-icon:nth-child(4) { animation-delay: 3s; }
    `;
    document.head.appendChild(style);
  }

  // Set up a single global function to handle opening the dialog
  window.openNativeCreatePlaylistDialog = () => {
    // Create or get container
    let dialogContainer = document.getElementById('native-playlist-dialog-container');
    if (!dialogContainer) {
      dialogContainer = document.createElement('div');
      dialogContainer.id = 'native-playlist-dialog-container';
      document.body.appendChild(dialogContainer);
    }

    // Function to create playlist using Jellyfin API
    const createPlaylistInJellyfin = async (name) => {
      try {
        console.log('Creating new playlist:', name);
        
        // Use the global jellyfinService object that's exposed by JellyfinContext
        if (!window.jellyfinService) {
          throw new Error('Jellyfin service not available');
        }
        
        // Check if the API is connected
        if (window.jellyfinService.connectionStatus !== 'connected') {
          throw new Error('Not connected to Jellyfin server');
        }
        
        // Get the user information
        const userInfo = window.jellyfinService.userInfo;
        if (!userInfo || !userInfo.Id) {
          throw new Error('User information not available');
        }
        
        // Get the API instance
        const api = window.jellyfinService.api;
        if (!api) {
          throw new Error('Jellyfin API not available');
        }
        
        // Create playlist using Jellyfin API
        const response = await api.post('/Playlists', {
          Name: name,
          MediaType: 'Audio',
          UserId: userInfo.Id
        });
        
        if (!response || !response.data || !response.data.Id) {
          throw new Error('Failed to create playlist - no ID returned');
        }
        
        console.log('Playlist created successfully:', response.data);
        
        // Refresh playlists list by dispatching custom event
        document.dispatchEvent(new CustomEvent('REFRESH_PLAYLISTS_EVENT'));
        
        return response.data;
      } catch (error) {
        console.error('Error creating playlist:', error);
        if (error.response) {
          console.error('API response error:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        }
        throw error;
      }
    };

    // Array of playlist name suggestions
    const playlistSuggestions = [
      "Workout Mix", 
      "Chill Vibes", 
      "Party Anthems", 
      "Focus & Study",
      "Driving Playlist", 
      "Morning Coffee", 
      "Weekend Mood", 
      "Throwbacks",
      "Indie Discoveries", 
      "Evening Relaxation"
    ];

    // Create dialog HTML
    dialogContainer.innerHTML = `
      <div class="native-playlist-dialog-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.35s cubic-bezier(0.19, 1, 0.22, 1);
        backdrop-filter: blur(10px);
      ">
        <div class="native-playlist-dialog native-playlist-scroll native-playlist-font" style="
          background-color: #1a1a1a;
          color: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
          width: 90%;
          max-width: 520px;
          min-height: 500px;
          max-height: 92vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          animation: scaleIn 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          transform-origin: center;
          background-image: 
            radial-gradient(circle at top right, rgba(29, 185, 84, 0.08), transparent 65%),
            linear-gradient(to bottom, rgba(29, 185, 84, 0.05), rgba(0, 0, 0, 0) 60%);
          position: relative;
          font-family: 'Circular', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif;
        ">
          <!-- Music Icon Decorations -->
          <div style="
            position: absolute;
            top: 15px;
            right: 60px;
            width: 80px;
            height: 80px;
            pointer-events: none;
            opacity: 0.8;
          ">
            <svg class="music-icon" width="22" height="22" viewBox="0 0 24 24" fill="#1DB954" style="top: 10px; right: 20px;">
              <path d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <svg class="music-icon" width="18" height="18" viewBox="0 0 24 24" fill="#1ED760" style="top: 0; right: 0;">
              <path d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <svg class="music-icon" width="16" height="16" viewBox="0 0 24 24" fill="#1DB954" style="top: 15px; right: 5px;">
              <path d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <svg class="music-icon" width="14" height="14" viewBox="0 0 24 24" fill="#1ED760" style="top: 5px; right: 35px;">
              <path d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
          
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 28px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 3px;
              background: linear-gradient(to right, rgba(29, 185, 84, 0.7), rgba(29, 185, 84, 0.2));
              opacity: 0.7;
            "></div>
            <h2 style="
              font-size: 1.5rem;
              font-weight: 800;
              margin: 0;
              background: linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0.75));
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
              letter-spacing: -0.5px;
            ">Create New Playlist</h2>
            <button id="native-close-dialog" class="native-playlist-button" style="
              background: transparent;
              border: none;
              color: rgba(255, 255, 255, 0.7);
              cursor: pointer;
              font-size: 24px;
              padding: 0;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              transition: all 0.2s ease;
              z-index: 5;
            " aria-label="Close dialog">×</button>
          </div>
          
          <div style="
            padding: 28px 28px 24px;
            background-color: rgba(0, 0, 0, 0.15);
            animation: slideUp 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          ">
            <div style="animation: slideUp 0.5s ease-out;">
              <label style="
                display: block;
                margin-bottom: 10px;
                font-weight: 600;
                font-size: 15px;
                color: rgba(255, 255, 255, 0.9);
                letter-spacing: 0.2px;
              " for="native-playlist-name">Playlist Name</label>
              <div style="position: relative;">
                <input
                  type="text"
                  id="native-playlist-name"
                  placeholder="My Awesome Playlist"
                  style="
                    width: 100%;
                    padding: 16px 18px;
                    border-radius: 10px;
                    background-color: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 16px;
                    font-weight: 500;
                    box-sizing: border-box;
                    transition: all 0.25s ease;
                    outline: none;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    font-family: 'Circular', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif;
                    letter-spacing: -0.01em;
                  "
                  autofocus
                />
                <div id="native-playlist-name-loader" style="
                  position: absolute;
                  right: 12px;
                  top: 50%;
                  transform: translateY(-50%);
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 2px solid transparent;
                  border-top-color: #1DB954;
                  animation: spin 0.8s linear infinite;
                  opacity: 0;
                  display: none;
                "></div>
              </div>
              
              <!-- Playlist name suggestions -->
              <div style="
                margin-top: 20px;
                animation: slideUp 0.6s ease-out;
              ">
                <div style="
                  font-size: 14px;
                  font-weight: 600;
                  color: rgba(255, 255, 255, 0.8);
                  margin-bottom: 12px;
                ">Suggestions:</div>
                <div style="
                  display: flex;
                  flex-wrap: wrap;
                  gap: 10px;
                  max-width: 100%;
                " id="suggestion-chips">
                  ${playlistSuggestions.map(suggestion => `
                    <div class="native-suggestion-chip" data-name="${suggestion}">
                      <strong>${suggestion}</strong>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div style="
                margin-top: 24px;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
              ">Give your playlist a memorable name or click a suggestion above.</div>
            </div>
          </div>
          
          <div style="
            display: flex;
            justify-content: center;
            padding: 24px 28px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            background-color: rgba(0, 0, 0, 0.2);
          ">
            <button id="native-create-button" class="native-playlist-button" style="
              padding: 14px 50px;
              border-radius: 32px;
              font-weight: 900;
              cursor: pointer;
              background-color: #1DB954;
              color: white;
              border: none;
              font-size: 16px;
              opacity: 0.5;
              transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
              box-shadow: 0 4px 12px rgba(29, 185, 84, 0.15);
              position: relative;
              overflow: hidden;
              min-width: 180px;
              font-family: 'Circular', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif;
              letter-spacing: -0.01em;
            " disabled aria-label="Create playlist">
              <span id="native-create-button-text" style="font-weight: 900; letter-spacing: 0.02em;">Create</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Get references to DOM elements
    const closeButton = document.getElementById('native-close-dialog');
    const createButton = document.getElementById('native-create-button');
    const createButtonText = document.getElementById('native-create-button-text');
    const nameInput = document.getElementById('native-playlist-name');
    const nameTrimmer = () => nameInput.value.trim();
    const nameLoader = document.getElementById('native-playlist-name-loader');
    const suggestionChips = document.querySelectorAll('.native-suggestion-chip');
    const overlay = document.querySelector('.native-playlist-dialog-overlay');
    const dialog = document.querySelector('.native-playlist-dialog');
    
    // Hook up the suggestion chips
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const name = chip.getAttribute('data-name');
        nameInput.value = name;
        
        // Show loader briefly to indicate selection
        nameLoader.style.display = 'block';
        nameLoader.style.opacity = '1';
        
        setTimeout(() => {
          nameLoader.style.opacity = '0';
          setTimeout(() => {
            nameLoader.style.display = 'none';
          }, 200);
        }, 400);
        
        // Update create button state
        updateCreateButtonState();
        
        // Focus the input after selecting a chip
        nameInput.focus();
      });
    });
    
    // Simulate a loading state when typing
    nameInput.addEventListener('input', () => {
      // Show loader for a brief moment to simulate checking availability
      nameLoader.style.display = 'block';
      nameLoader.style.opacity = '1';
      
      // Hide loader after a delay
      clearTimeout(nameInput.loaderTimeout);
      nameInput.loaderTimeout = setTimeout(() => {
        nameLoader.style.opacity = '0';
        setTimeout(() => {
          nameLoader.style.display = 'none';
        }, 200);
      }, 800);
      
      // Update create button state
      updateCreateButtonState();
    });
    
    // Function to update create button state
    function updateCreateButtonState() {
      if (nameTrimmer()) {
        createButton.removeAttribute('disabled');
        createButton.style.opacity = '1';
        
        // Add shine effect
        createButton.style.background = `linear-gradient(90deg, #1DB954, #1ed760, #1DB954)`;
        createButton.style.backgroundSize = '300% 100%';
        createButton.style.animation = 'shine 2s ease infinite';
      } else {
        createButton.setAttribute('disabled', true);
        createButton.style.opacity = '0.5';
        createButton.style.background = '#1DB954';
        createButton.style.animation = 'none';
      }
    }
    
    // Add hover effects
    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      closeButton.style.color = 'white';
      closeButton.style.transform = 'scale(1.1)';
    };
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.color = 'rgba(255, 255, 255, 0.7)';
      closeButton.style.transform = 'scale(1)';
    };
    
    // Add focus effects for input
    nameInput.onfocus = () => {
      nameInput.style.borderColor = 'rgba(29, 185, 84, 0.5)';
      nameInput.style.boxShadow = '0 0 0 1px rgba(29, 185, 84, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)';
      nameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
    };
    nameInput.onblur = () => {
      nameInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      nameInput.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      nameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    };
    
    // Add hover effect for create button when enabled
    createButton.onmouseenter = () => {
      if (!createButton.disabled) {
        createButton.style.transform = 'translateY(-2px)';
        createButton.style.boxShadow = '0 8px 16px rgba(29, 185, 84, 0.3)';
      }
    };
    createButton.onmouseleave = () => {
      createButton.style.transform = 'translateY(0)';
      createButton.style.boxShadow = '0 4px 12px rgba(29, 185, 84, 0.15)';
    };

    // Animated close function
    const closeDialog = () => {
      const container = document.querySelector('.native-playlist-dialog');
      const overlay = document.querySelector('.native-playlist-dialog-overlay');
      
      // Add exit animations
      container.style.animation = 'scaleIn 0.25s cubic-bezier(0.19, 1, 0.22, 1) reverse';
      overlay.style.animation = 'fadeIn 0.25s cubic-bezier(0.19, 1, 0.22, 1) reverse';
      
      // Remove after animation completes
      setTimeout(() => {
        const dialogContainer = document.getElementById('native-playlist-dialog-container');
        if (dialogContainer) {
          dialogContainer.remove();
        }
      }, 250);
    };

    // Attach close handlers
    closeButton.onclick = closeDialog;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });

    // Create button with success animation
    createButton.onclick = () => {
      const name = nameTrimmer();
      if (!name) return;
      
      // Disable button and show loading state
      createButton.disabled = true;
      createButtonText.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" fill="none" stroke-dasharray="30 60" />
          </svg>
          Creating...
        </span>
      `;
      
      // Actually create the playlist
      createPlaylistInJellyfin(name)
        .then(() => {
          // Show success state
          createButton.style.backgroundColor = '#1ED760';
          createButton.style.boxShadow = '0 0 0 2px rgba(30, 215, 96, 0.5)';
          createButton.style.animation = 'pulse 1.5s infinite';
          
          createButtonText.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px; font-weight: 900; letter-spacing: 0.02em;">
              Created
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M5 12l5 5L20 7" stroke-dasharray="24" stroke-dashoffset="24" style="animation: checkmarkDraw 0.4s ease forwards;" />
              </svg>
            </span>
          `;
          
          // Close dialog after showing success
          setTimeout(closeDialog, 1200);
        })
        .catch(error => {
          // Show error state
          createButton.style.backgroundColor = '#e53935';
          createButton.style.boxShadow = 'none';
          createButton.style.animation = 'none';
          
          const errorMessage = error.message || 'Failed to create playlist';
          
          createButtonText.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              Error: ${errorMessage.substring(0, 30)}${errorMessage.length > 30 ? '...' : ''}
            </span>
          `;
          
          // Enable the button again after a delay
          setTimeout(() => {
            createButton.disabled = false;
            createButton.style.backgroundColor = '#1DB954';
            createButtonText.innerHTML = `<span style="font-weight: 900; letter-spacing: 0.02em;">Create</span>`;
            updateCreateButtonState();
          }, 3000);
        });
    };

    // Keyboard accessibility
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDialog();
      }
      
      if (e.key === 'Enter' && e.target === nameInput && nameTrimmer() && !createButton.disabled) {
        createButton.click();
      }
    });
    
    // Focus trap for accessibility
    const focusableElements = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });

    // Focus the input with a slight delay for smoother UX
    setTimeout(() => {
      nameInput.focus();
    }, 400);
  };

  // Helper function to close the dialog
  function closeNativeDialog() {
    const container = document.querySelector('.native-playlist-dialog');
    const overlay = document.querySelector('.native-playlist-dialog-overlay');
    
    if (container && overlay) {
      // Add exit animations
      container.style.animation = 'scaleIn 0.25s cubic-bezier(0.19, 1, 0.22, 1) reverse';
      overlay.style.animation = 'fadeIn 0.25s cubic-bezier(0.19, 1, 0.22, 1) reverse';
      
      // Remove after animation completes
      setTimeout(() => {
        const dialogContainer = document.getElementById('native-playlist-dialog-container');
        if (dialogContainer) {
          dialogContainer.remove();
        }
      }, 250);
    } else {
      // Fallback if elements not found
      const dialogContainer = document.getElementById('native-playlist-dialog-container');
      if (dialogContainer) {
        dialogContainer.remove();
      }
    }
  }

  // Ensure dialog is closed if page is unloaded
  window.addEventListener('beforeunload', () => {
    closeNativeDialog();
  });

  // Set initialization flag to prevent re-registering global handlers
  isDialogInitialized = true;
}

/**
 * This component doesn't render anything, it just hooks up the global open dialog
 * function to the open prop.
 */
export default function CreatePlaylistDialog({ open, onClose }) {
  // When the component mounts or open changes
  React.useEffect(() => {
    if (open && typeof window !== 'undefined') {
      // Just call the global function to open dialog
      window.openNativeCreatePlaylistDialog();
    }
    
    // Return a cleanup function
    return () => {
      if (open) {
        // Call onClose to make sure the parent knows the dialog is closed
        onClose();
      }
    };
  }, [open, onClose]);
  
  // Component renders nothing
  return null;
} 