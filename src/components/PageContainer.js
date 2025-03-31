import React from 'react';
import { Box } from '@mui/material';
import useCustomScrollbarStyle from '../hooks/useCustomScrollbarStyle';

/**
 * A page container component that applies consistent styling and custom scrollbars
 * to all pages in the application.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {Object} props.sx - Additional MUI sx styling to apply
 * @returns {JSX.Element} Styled page container
 */
const PageContainer = ({ children, sx = {} }) => {
  const scrollbarStyle = useCustomScrollbarStyle();
  
  return (
    <Box 
      sx={{ 
        p: 0,
        pt: 0,
        pl: 0,
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        ...scrollbarStyle,
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default PageContainer; 