import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  CardActionArea, 
  CardMedia, 
  CardContent, 
  Typography,
  Box,
  Avatar
} from '@mui/material'
import { Person as PersonIcon } from '@mui/icons-material'
import { useJellyfin } from '../services/JellyfinContext'

const ArtistCard = ({ artist }) => {
  const navigate = useNavigate()
  const { getImageUrl } = useJellyfin()
  
  const handleClick = () => {
    navigate(`/artist/${artist.Id}`)
  }
  
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.03)'
        }
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ 
          position: 'relative', 
          paddingTop: '100%',
          bgcolor: 'background.dark',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CardMedia
            component="img"
            image={artist.ImageTags?.Primary ? getImageUrl(artist.Id) : getImageUrl(null, 'Primary', 300, 'artist')}
            alt={artist.Name}
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="body1" component="div" noWrap sx={{ fontWeight: 500 }}>
            {artist.Name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            Artist
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default ArtistCard 