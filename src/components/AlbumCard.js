import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  CardActionArea, 
  CardMedia, 
  CardContent, 
  Typography,
  Box
} from '@mui/material'
import { useJellyfin } from '../services/JellyfinContext'

const AlbumCard = ({ album }) => {
  const navigate = useNavigate()
  const { getImageUrl } = useJellyfin()
  
  const handleClick = () => {
    navigate(`/album/${album.Id}`)
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
        <Box sx={{ position: 'relative', paddingTop: '100%' }}>
          <CardMedia
            component="img"
            image={album.ImageTags?.Primary ? getImageUrl(album.Id) : getImageUrl(null, 'Primary', 300, 'album')}
            alt={album.Name}
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
            {album.Name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {album.AlbumArtist || album.Artists?.[0] || 'Unknown Artist'}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default AlbumCard 