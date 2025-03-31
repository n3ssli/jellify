import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  alpha,
  Skeleton,
  TextField,
  InputAdornment,
  Collapse,
  Fade,
  Checkbox
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  MoreHoriz as MoreIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Add as AddIcon,
  QueueMusic as QueueIcon,
  Person as PersonIcon,
  Album as AlbumIcon,
  AccessTime as ClockIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  PlaylistAdd as PlaylistAddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../services/PlayerContext'
import { useApp } from '../services/AppContext'
import { formatTime } from '../utils/formatTime'
import QuickAddToPlaylistMenu from './QuickAddToPlaylistMenu'

const TrackList = forwardRef(({ 
  tracks, 
  loading = false, 
  showHeader = true, 
  showArtist = true, 
  showAlbum = true, 
  showNumber = true, 
  showDateAdded = false, 
  selectionMode = false,
  selectedTracks = [],
  onTrackSelect = null,
  onRowClick 
}, ref) => {
  const navigate = useNavigate()
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = usePlayer()
  const { onAddToPlaylist } = useApp()
  
  const [hoveredRow, setHoveredRow] = useState(null)
  const [menuPosition, setMenuPosition] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  
  useImperativeHandle(ref, () => ({
    toggleSearch: () => {
      toggleSearch();
    }
  }));
  
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    
    const query = searchQuery.toLowerCase().trim();
    return tracks.filter(track => {
      if (!track) return false;
      
      const name = track.Name?.toLowerCase() || '';
      const artist = track.AlbumArtist?.toLowerCase() || '';
      const album = track.Album?.toLowerCase() || '';
      
      return name.includes(query) || 
             artist.includes(query) || 
             album.includes(query);
    });
  }, [tracks, searchQuery]);
  
  const handleRowMouseEnter = (index) => {
    setHoveredRow(index)
  }
  
  const handleRowMouseLeave = () => {
    setHoveredRow(null)
  }
  
  const handleMenuOpen = (event, track) => {
    if (!track || !track.Id) {
      console.error('Attempted to open menu for invalid track:', track);
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    setMenuPosition({
      left: event.clientX, 
      top: event.clientY
    });
    setSelectedTrack(track);
  }
  
  const handleMenuClose = () => {
    setMenuPosition(null)
    setSelectedTrack(null)
  }
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  }
  
  const clearSearch = () => {
    setSearchQuery('');
    setShowSearch(false);
  }
  
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setTimeout(() => {
        const searchField = document.getElementById('track-search-field');
        if (searchField) searchField.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }
  
  const handleRowClick = (track, index) => {
    if (!track || !track.Id) return;
    
    if (selectionMode) {
      if (onTrackSelect) {
        onTrackSelect(track.Id);
      }
    } else if (onRowClick) {
      onRowClick(track, index);
    } else {
      handlePlayTrack(track, index);
    }
  }
  
  const handlePlayTrack = (track, index) => {
    if (!track || !track.Id) {
      console.error('Attempted to play invalid track:', track);
      return;
    }
    
    if (currentTrack && currentTrack.Id === track.Id) {
      togglePlay();
    } else {
      console.log('Playing track from list:', track.Name);
      playTrack(track, tracks);
    }
  }
  
  const handleAddToQueue = () => {
    if (!selectedTrack || !selectedTrack.Id) {
      console.error('Attempted to add invalid track to queue:', selectedTrack);
      handleMenuClose();
      return;
    }
    
    console.log('Adding to queue:', selectedTrack.Name);
    addToQueue(selectedTrack, false);
    handleMenuClose();
  };
  
  const handlePlayNext = () => {
    if (!selectedTrack || !selectedTrack.Id) {
      console.error('Attempted to play next with invalid track:', selectedTrack);
      handleMenuClose();
      return;
    }
    
    console.log('Playing next:', selectedTrack.Name);
    addToQueue(selectedTrack, true);
    handleMenuClose();
  };
  
  const handleGoToArtist = () => {
    if (!selectedTrack || !selectedTrack.ArtistItems || !selectedTrack.ArtistItems.length) return;
    
    navigate(`/artist/${selectedTrack.ArtistItems[0].Id}`);
    handleMenuClose();
  }
  
  const handleGoToAlbum = () => {
    if (!selectedTrack || !selectedTrack.AlbumId) return;
    
    navigate(`/album/${selectedTrack.AlbumId}`);
    handleMenuClose();
  }
  
  const isCurrentTrack = (track) => {
    return currentTrack && track && currentTrack.Id === track.Id;
  }
  
  const isTrackSelected = (trackId) => {
    return selectedTracks.includes(trackId);
  }
  
  const formatDateAdded = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const addedDate = new Date(date);
    const diffTime = Math.abs(now - addedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  };
  
  const renderSkeletonRows = () => {
    return Array(10).fill(0).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell width={50}>
          <Skeleton variant="text" width={20} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width="80%" />
        </TableCell>
        {showArtist && (
          <TableCell>
            <Skeleton variant="text" width="70%" />
          </TableCell>
        )}
        {showAlbum && (
          <TableCell>
            <Skeleton variant="text" width="60%" />
          </TableCell>
        )}
        <TableCell width={120}>
          <Skeleton variant="text" width={50} />
        </TableCell>
      </TableRow>
    ))
  }
  
  const handleAddToPlaylist = () => {
    if (!selectedTrack || !selectedTrack.Id) {
      console.error('Attempted to add invalid track to playlist:', selectedTrack);
      handleMenuClose();
      return;
    }
    
    console.log('Opening add to playlist menu for:', selectedTrack.Name);
    if (onAddToPlaylist) {
      onAddToPlaylist(selectedTrack);
    }
    
    handleMenuClose();
  };
  
  const handlePlaylistMenuClose = () => {
    setPlaylistMenuOpen(false);
  };
  
  const getArtistDisplay = (track) => {
    if (!track) return '';
    
    if (track.Artists && track.Artists.length > 0) {
      return track.Artists.join(', ');
    }
    
    if (track.ArtistItems && track.ArtistItems.length > 0) {
      return track.ArtistItems.map(artist => artist.Name).join(', ');
    }
    
    if (track.AlbumArtist) {
      return track.AlbumArtist;
    }
    
    return 'Unknown Artist';
  }
  
  return (
    <Box sx={{ position: 'relative' }}>
      <Collapse in={showSearch} timeout={300}>
        <Box sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 2 }}>
          <TextField
            id="track-search-field"
            fullWidth
            placeholder="Search in tracks..."
            value={searchQuery}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            autoComplete="off"
            sx={{
              backgroundColor: alpha('#000', 0.3),
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { 
                  borderColor: alpha('#fff', 0.1),
                  borderRadius: 1
                },
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ opacity: 0.7 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    edge="end" 
                    onClick={clearSearch}
                    size="small"
                  >
                    <ClearIcon sx={{ opacity: 0.7 }} />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Collapse>
      
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 650 }} size="small">
          {showHeader && (
            <TableHead 
              sx={{
                '& th': { 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <TableRow>
                {selectionMode && (
                  <TableCell padding="checkbox" sx={{ width: 50 }}>
                  </TableCell>
                )}
                {showNumber && (
                  <TableCell width={50}>#</TableCell>
                )}
                <TableCell>Title</TableCell>
                {showArtist && (
                  <TableCell>Artist</TableCell>
                )}
                {showAlbum && (
                  <TableCell>Album</TableCell>
                )}
                {showDateAdded && (
                  <TableCell>Date Added</TableCell>
                )}
                <TableCell sx={{ textAlign: 'right' }}>
                  <ClockIcon fontSize="small" />
                </TableCell>
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : filteredTracks.length > 0 ? (
              filteredTracks.map((track, index) => {
                if (!track || !track.Id) return null;
                
                const isHovered = hoveredRow === index;
                const isCurrent = isCurrentTrack(track);
                const isSelected = selectionMode && isTrackSelected(track.Id);
                
                return (
                  <TableRow
                    key={track.Id}
                    hover
                    onClick={() => handleRowClick(track, index)}
                    onMouseEnter={() => handleRowMouseEnter(index)}
                    onMouseLeave={handleRowMouseLeave}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: isCurrent 
                        ? alpha('#1DB954', 0.1) 
                        : isSelected 
                          ? alpha('#3f51b5', 0.1)
                          : 'transparent',
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: isCurrent 
                          ? alpha('#1DB954', 0.15)
                          : isSelected 
                            ? alpha('#3f51b5', 0.15)
                            : alpha('#fff', 0.05),
                        transform: 'none'
                      },
                      '& td': {
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '12px 16px',
                        transition: 'color 0.2s ease'
                      }
                    }}
                  >
                    {selectionMode && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTrackSelect) onTrackSelect(track.Id);
                          }}
                          color="primary"
                          sx={{
                            color: isSelected ? '#1DB954' : 'rgba(255, 255, 255, 0.5)',
                            '&.Mui-checked': {
                              color: '#1DB954',
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    {showNumber && (
                      <TableCell
                        sx={{
                          color: isCurrent ? '#1DB954' : 'inherit',
                          fontWeight: isCurrent ? 700 : 400
                        }}
                      >
                        {isHovered ? (
                          <IconButton
                            size="small"
                            sx={{ width: 24, height: 24, p: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track, index);
                            }}
                          >
                            {isCurrent && isPlaying ? (
                              <Fade in={true}>
                                <Box sx={{ width: 12, height: 12, bgcolor: '#1DB954', borderRadius: '50%' }} />
                              </Fade>
                            ) : (
                              <PlayIcon fontSize="small" />
                            )}
                          </IconButton>
                        ) : (
                          isCurrent && isPlaying ? (
                            <Fade in={true}>
                              <Box sx={{ width: 12, height: 12, bgcolor: '#1DB954', borderRadius: '50%' }} />
                            </Fade>
                          ) : (
                            track.IndexNumber || index + 1
                          )
                        )}
                      </TableCell>
                    )}
                    <TableCell
                      sx={{
                        color: isCurrent ? '#1DB954' : 'inherit',
                        fontWeight: isCurrent ? 700 : 400
                      }}
                    >
                      <Typography 
                        noWrap 
                        variant="body2"
                        sx={{ 
                          transition: 'color 0.2s ease',
                          fontSize: '0.875rem',
                          lineHeight: '1.2',
                          transform: 'none'
                        }}
                      >
                        {track.Name}
                      </Typography>
                    </TableCell>
                    {showArtist && (
                      <TableCell
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            color: 'rgba(255, 255, 255, 0.9)',
                            transform: 'none'
                          }
                        }}
                      >
                        <Typography 
                          noWrap 
                          variant="body2"
                          sx={{ 
                            transition: 'color 0.2s ease',
                            fontSize: '0.875rem',
                            lineHeight: '1.2',
                            transform: 'none'
                          }}
                        >
                          {getArtistDisplay(track)}
                        </Typography>
                      </TableCell>
                    )}
                    {showAlbum && (
                      <TableCell
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            color: 'rgba(255, 255, 255, 0.9)',
                            transform: 'none'
                          }
                        }}
                      >
                        <Typography 
                          noWrap 
                          variant="body2"
                          sx={{ 
                            transition: 'color 0.2s ease',
                            fontSize: '0.875rem',
                            lineHeight: '1.2',
                            transform: 'none'
                          }}
                        >
                          {track.Album || 'Unknown Album'}
                        </Typography>
                      </TableCell>
                    )}
                    {showDateAdded && (
                      <TableCell
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <Typography noWrap variant="body2">
                          {formatDateAdded(track.DateCreated)}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell 
                      sx={{ 
                        textAlign: 'right',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}
                    >
                      {isHovered && !selectionMode ? (
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleMenuOpen(e, track)}
                          sx={{ 
                            p: 0,
                            width: 24,
                            height: 24,
                            transform: 'none'
                          }}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Typography 
                          variant="body2"
                          sx={{ 
                            transition: 'color 0.2s ease',
                            fontSize: '0.875rem',
                            lineHeight: '1.2',
                            transform: 'none'
                          }}
                        >
                          {formatTime(track.RunTimeTicks)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={showAlbum ? 5 : 4} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchQuery.trim() ? 'No tracks found matching your search' : 'No tracks found'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={menuPosition || { top: 0, left: 0 }}
        open={Boolean(menuPosition)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 220,
            bgcolor: '#1f1f1f',
            boxShadow: '0 4px 16px rgba(0,0,0,.2)',
            '& .MuiMenuItem-root': {
              fontSize: '0.9rem',
              py: 1
            }
          }
        }}
      >
        <MenuItem onClick={handleAddToQueue}>
          <ListItemIcon>
            <QueueIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add to Queue</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePlayNext}>
          <ListItemIcon>
            <PlayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Play Next</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAddToPlaylist}>
          <ListItemIcon>
            <PlaylistAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add to Playlist</ListItemText>
        </MenuItem>
        {selectedTrack && selectedTrack.ArtistItems && selectedTrack.ArtistItems.length > 0 && (
          <MenuItem onClick={handleGoToArtist}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Go to Artist</ListItemText>
          </MenuItem>
        )}
        {selectedTrack && selectedTrack.AlbumId && (
          <MenuItem onClick={handleGoToAlbum}>
            <ListItemIcon>
              <AlbumIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Go to Album</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
})

export default TrackList 