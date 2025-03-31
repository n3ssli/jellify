import React, { createContext, useContext } from 'react'

// Default context values
const defaultValues = {
  createPlaylistOpen: false,
  onCreatePlaylist: () => {},
  onCreatePlaylistClose: () => {},
  addToPlaylistOpen: false,
  onAddToPlaylist: () => {},
  onAddToPlaylistClose: () => {},
  selectedTrack: null,
}

const AppContext = createContext(defaultValues)

// Custom hook to use AppContext
export const useApp = () => useContext(AppContext)

// AppProvider component
export const AppProvider = ({ 
  children,
  createPlaylistOpen,
  onCreatePlaylist,
  onCreatePlaylistClose,
  addToPlaylistOpen,
  onAddToPlaylist,
  onAddToPlaylistClose,
  selectedTrack,
}) => {
  // Create a value object with our props and fallbacks for missing ones
  const value = {
    createPlaylistOpen,
    onCreatePlaylist,
    onCreatePlaylistClose,
    addToPlaylistOpen,
    onAddToPlaylist,
    onAddToPlaylistClose,
    selectedTrack,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
} 