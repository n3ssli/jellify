import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Grid,
  Paper,
  Chip,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tab,
  Tabs,
  CircularProgress,
  Container,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  Album as AlbumIcon,
  QueueMusic as PlaylistIcon,
  AccessTime as RecentIcon,
  Favorite as FavoriteIcon,
  Admin as AdminIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJellyfin } from '../services/JellyfinContext';
import PageContainer from '../components/PageContainer';
import { formatRelativeTime } from '../utils/formatTime';

const Profile = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { userInfo, getPlaylists, getUserImageUrl, getFavorites } = useJellyfin();
  
  const [tabValue, setTabValue] = useState(0);
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch playlists
        const userPlaylists = await getPlaylists();
        setPlaylists(userPlaylists || []);
        
        // Fetch liked songs
        const favorites = await getFavorites();
        setLikedSongs(favorites || []);
        
        // Fetch recently played tracks
        if (window.jellyfinService && window.jellyfinService.api) {
          try {
            const recentItems = await window.jellyfinService.api.get(`/Users/${userInfo.Id}/Items`, {
              params: {
                Limit: 20,
                Recursive: true,
                SortBy: 'DatePlayed',
                SortOrder: 'Descending',
                IncludeItemTypes: 'Audio',
                Filters: 'IsPlayed'
              }
            });
            
            if (recentItems && recentItems.data && recentItems.data.Items) {
              setRecentlyPlayed(recentItems.data.Items);
            }
          } catch (error) {
            console.error('Error fetching recently played:', error);
            setRecentlyPlayed([]);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userInfo && userInfo.Id) {
      fetchUserData();
    }
  }, [userInfo, getPlaylists, getFavorites]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Format date joined
  const formatDateJoined = (date) => {
    if (!date) return 'Member since recently';
    
    try {
      const dateObj = new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Member since recently';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting join date:', error);
      return 'Member since recently';
    }
  };
  
  // Navigate to playlist
  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };
  
  // Navigate to album
  const handleAlbumClick = (albumId) => {
    navigate(`/album/${albumId}`);
  };
  
  // Navigate to artist
  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };
  
  // Check if user is admin
  const isAdmin = userInfo && userInfo.Policy && userInfo.Policy.IsAdministrator;
  
  // Format last activity date
  const formatLastActivity = (date) => {
    if (!date) return 'Active recently';
    
    try {
      // Handle potentially invalid date strings
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Active recently';
      }
      
      return formatRelativeTime(dateObj);
    } catch (error) {
      console.error('Error formatting last activity date:', error);
      return 'Active recently';
    }
  };
  
  if (!userInfo) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <Box sx={{ mb: 6 }}>
        {/* User header section */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 3,
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
            mb: 4
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                src={getUserImageUrl(userInfo.Id)}
                alt={userInfo.Name}
                sx={{ 
                  width: 120, 
                  height: 120,
                  border: `3px solid ${theme.palette.primary.main}`,
                  boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.5)}`
                }}
              >
                {userInfo.Name.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <Typography variant="h4" fontWeight={700}>{userInfo.Name}</Typography>
                {isAdmin && (
                  <Chip 
                    label="Admin" 
                    color="primary" 
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 3, color: 'text.secondary', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon fontSize="small" />
                  <Typography variant="body2">
                    {formatDateJoined(userInfo.DateCreated) === 'Member since recently' 
                      ? 'Member since recently' 
                      : `Joined ${formatDateJoined(userInfo.DateCreated)}`}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HistoryIcon fontSize="small" />
                  <Typography variant="body2">
                    {formatLastActivity(userInfo.LastActivityDate) === 'Active recently' 
                      ? 'Active recently' 
                      : `Last active ${formatLastActivity(userInfo.LastActivityDate)}`}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PlaylistIcon fontSize="small" />
                  <Typography variant="body2">
                    {playlists.length} Playlists
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FavoriteIcon fontSize="small" />
                  <Typography variant="body2">
                    {likedSongs.length} Liked Songs
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Playlists" />
            <Tab label="Recently Played" />
            <Tab label="Liked Songs" />
          </Tabs>
        </Box>
        
        {/* Tab content */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Playlists tab */}
            {tabValue === 0 && (
              <>
                {playlists.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <PlaylistIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No playlists found</Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      sx={{ mt: 2 }}
                      onClick={() => window.jellyfinService.onCreatePlaylist && window.jellyfinService.onCreatePlaylist()}
                    >
                      Create a Playlist
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {playlists.map((playlist) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={playlist.Id}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            backgroundColor: 'rgba(30, 30, 30, 0.7)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            '&:hover': {
                              transform: 'scale(1.04)',
                              backgroundColor: 'rgba(40, 40, 40, 0.8)',
                              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                              '& .playlist-play-button': {
                                opacity: 1,
                                transform: 'translateY(0) scale(1)',
                              }
                            }
                          }}
                          onClick={() => handlePlaylistClick(playlist.Id)}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              sx={{
                                height: 180,
                                objectFit: 'cover',
                              }}
                              image={getUserImageUrl(playlist.Id, 'Primary', 300, 'playlist')}
                              alt={playlist.Name}
                            />
                            <Box 
                              className="playlist-play-button"
                              sx={{
                                position: 'absolute',
                                bottom: -20,
                                right: 12,
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.primary.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                                opacity: 0,
                                transform: 'translateY(8px) scale(0.8)',
                                transition: 'all 0.3s',
                                zIndex: 2,
                                '&:hover': {
                                  transform: 'translateY(0) scale(1.1) !important',
                                  backgroundColor: theme.palette.primary.dark,
                                }
                              }}
                            >
                              <PlayArrowIcon />
                            </Box>
                          </Box>
                          <CardContent sx={{ flexGrow: 1, py: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} noWrap gutterBottom>
                              {playlist.Name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {playlist.ChildCount || 0} {playlist.ChildCount === 1 ? 'song' : 'songs'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}
            
            {/* Recently played tab */}
            {tabValue === 1 && (
              <>
                {recentlyPlayed.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <HistoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No recently played tracks</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start listening to music to see your history
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ 
                    '& .MuiListItem-root': { 
                      borderRadius: 1,
                      my: 0.5,
                      p: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }
                  }}>
                    {recentlyPlayed.map((track, index) => (
                      <Paper
                        key={track.Id}
                        elevation={0}
                        sx={{
                          mb: 0.5,
                          borderRadius: 1,
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.05),
                            '& .track-number': {
                              opacity: 0,
                            },
                            '& .play-button': {
                              opacity: 1,
                            }
                          }
                        }}
                      >
                        <ListItem button sx={{ py: 1 }} onClick={() => navigate(`/album/${track.AlbumId}`)}>
                          <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', mr: 2, position: 'relative' }}>
                            <Typography className="track-number" sx={{ color: 'text.secondary', fontWeight: 400, transition: 'opacity 0.2s', width: 24, textAlign: 'center' }}>
                              {index + 1}
                            </Typography>
                            <PlayArrowIcon className="play-button" sx={{ position: 'absolute', opacity: 0, transition: 'opacity 0.2s', fontSize: 20 }} />
                          </Box>
                          <ListItemAvatar sx={{ minWidth: 50 }}>
                            <Avatar 
                              variant="rounded"
                              src={getUserImageUrl(track.Id, 'Primary', 80)}
                              alt={track.Name}
                              sx={{ width: 40, height: 40 }}
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={track.Name}
                            secondary={
                              <React.Fragment>
                                <span style={{ display: 'block', color: alpha(theme.palette.text.primary, 0.7) }}>
                                  {track.AlbumArtist || (track.ArtistItems && track.ArtistItems.length > 0 ? track.ArtistItems[0].Name : 'Unknown Artist')}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'text.disabled' }}>
                                  {track.DateCreated || track.DatePlayed 
                                    ? formatRelativeTime(new Date(track.DateCreated || track.DatePlayed)) 
                                    : 'Added recently'}
                                </span>
                              </React.Fragment>
                            }
                            primaryTypographyProps={{
                              noWrap: true,
                              variant: 'body1',
                              fontWeight: 500,
                            }}
                            sx={{ my: 0 }}
                          />
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                )}
              </>
            )}
            
            {/* Liked songs tab */}
            {tabValue === 2 && (
              <>
                {likedSongs.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <FavoriteIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No liked songs yet</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Like songs to add them to your collection
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ 
                    '& .MuiListItem-root': { 
                      borderRadius: 1,
                      my: 0.5,
                      p: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }
                  }}>
                    {likedSongs.map((track, index) => (
                      <Paper
                        key={track.Id}
                        elevation={0}
                        sx={{
                          mb: 0.5,
                          borderRadius: 1,
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.05),
                            '& .track-number': {
                              opacity: 0,
                            },
                            '& .play-button': {
                              opacity: 1,
                            }
                          }
                        }}
                      >
                        <ListItem button sx={{ py: 1 }} onClick={() => navigate(`/album/${track.AlbumId}`)}>
                          <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', mr: 2, position: 'relative' }}>
                            <Typography className="track-number" sx={{ color: 'text.secondary', fontWeight: 400, transition: 'opacity 0.2s', width: 24, textAlign: 'center' }}>
                              {index + 1}
                            </Typography>
                            <PlayArrowIcon className="play-button" sx={{ position: 'absolute', opacity: 0, transition: 'opacity 0.2s', fontSize: 20 }} />
                          </Box>
                          <ListItemAvatar sx={{ minWidth: 50 }}>
                            <Avatar 
                              variant="rounded"
                              src={getUserImageUrl(track.Id, 'Primary', 80)}
                              alt={track.Name}
                              sx={{ width: 40, height: 40 }}
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={track.Name}
                            secondary={
                              <React.Fragment>
                                <span style={{ color: alpha(theme.palette.text.primary, 0.7) }}>
                                  {track.AlbumArtist || (track.ArtistItems && track.ArtistItems.length > 0 ? track.ArtistItems[0].Name : 'Unknown Artist')}
                                  {track.Album && ` • ${track.Album}`}
                                </span>
                              </React.Fragment>
                            }
                            primaryTypographyProps={{
                              noWrap: true,
                              variant: 'body1',
                              fontWeight: 500,
                            }}
                            sx={{ my: 0 }}
                          />
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </PageContainer>
  );
};

export default Profile; 