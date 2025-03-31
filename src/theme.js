import { createTheme } from '@mui/material/styles'

// Spotify-like theme with dark colors
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954', // Spotify green
      light: '#1ED760',
      dark: '#1AA34A',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#535353', // Spotify gray
      light: '#B3B3B3',
      dark: '#212121',
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#121212', // Spotify dark background
      paper: '#181818',   // Spotify card background
      paper2: '#282828',  // Spotify card background (hover)
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
      disabled: '#686868'
    },
    divider: '#292929'
  },
  typography: {
    fontFamily: "'Circular Std', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 700
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 700
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400
    },
    body2: {
      fontSize: '0.75rem',
      fontWeight: 400
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 4
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#121212'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#535353',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#B3B3B3'
            }
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          padding: '8px 24px',
          fontWeight: 600
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1ED760',
            transform: 'scale(1.04)'
          },
          transition: 'all 0.1s ease-in-out'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#181818',
          transition: 'background-color 0.3s ease, transform 0.3s ease',
          '&:hover': {
            backgroundColor: '#282828',
            transform: 'translateY(-4px)'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#B3B3B3',
          '&:hover': {
            color: '#FFFFFF',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#000000',
          borderRight: 'none'
        }
      }
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&.Mui-selected': {
            backgroundColor: '#282828',
            '&:hover': {
              backgroundColor: '#282828'
            }
          }
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 2
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '8px 16px'
        },
        head: {
          color: '#B3B3B3',
          fontSize: '0.75rem',
          fontWeight: 400,
          textTransform: 'none'
        },
        body: {
          color: '#FFFFFF',
          fontSize: '0.875rem'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        },
        head: {
          '&:hover': {
            backgroundColor: 'transparent'
          }
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
          color: '#1DB954'
        },
        thumb: {
          width: 12,
          height: 12,
          '&:hover, &.Mui-active': {
            boxShadow: '0px 0px 0px 8px rgba(29, 185, 84, 0.16)'
          }
        },
        rail: {
          opacity: 0.3
        },
        track: {
          border: 'none'
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#282828',
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
          borderRadius: 4
        },
        list: {
          padding: '4px 0'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '8px 16px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          },
          '& .MuiListItemIcon-root': {
            color: '#B3B3B3'
          }
        }
      }
    }
  }
})

export default theme 