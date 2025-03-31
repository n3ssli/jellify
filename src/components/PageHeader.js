import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable page header component with title and optional back button
 */
const PageHeader = ({ 
  title, 
  subtitle, 
  showBackButton = false, 
  backButtonAction = null,
  children,
  sx = {}
}) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (backButtonAction) {
      backButtonAction();
    } else {
      navigate(-1);
    }
  };
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3,
        p: 2,
        ...sx
      }}
    >
      {showBackButton && (
        <IconButton 
          onClick={handleBack} 
          sx={{ 
            mr: 2,
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary'
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      )}
      
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h5" component="h1" fontWeight={700}>
          {title}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      
      {children}
    </Box>
  );
};

export default PageHeader; 