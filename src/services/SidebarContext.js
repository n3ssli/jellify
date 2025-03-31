import React, { createContext, useContext, useState } from 'react'

const SidebarContext = createContext()

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    console.warn('useSidebar was called outside of its Provider. Using safe fallback values.')
    return {
      isOpen: true,
      isQueueOpen: false,
      toggleQueueSidebar: () => {},
      openQueueSidebar: () => {},
      closeQueueSidebar: () => {}
    }
  }
  return context
}

export const SidebarProvider = ({ children }) => {
  const isOpen = true
  const [isQueueOpen, setIsQueueOpen] = useState(false)

  const toggleQueueSidebar = () => {
    setIsQueueOpen(prev => !prev)
  }
  
  const openQueueSidebar = () => {
    setIsQueueOpen(true)
  }
  
  const closeQueueSidebar = () => {
    setIsQueueOpen(false)
  }

  return (
    <SidebarContext.Provider 
      value={{ 
        isOpen,
        isQueueOpen,
        toggleQueueSidebar,
        openQueueSidebar,
        closeQueueSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
} 