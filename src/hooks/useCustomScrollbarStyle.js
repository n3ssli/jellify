import { useMemo } from 'react';

/**
 * Hook to provide consistent custom scrollbar styles across the application
 * @returns {Object} MUI sx style object for custom scrollbar
 */
const useCustomScrollbarStyle = () => {
  const scrollbarStyle = useMemo(() => ({
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: '6px',
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
  }), []);

  return scrollbarStyle;
};

export default useCustomScrollbarStyle; 