/**
 * Extract dominant colors from images
 */

/**
 * Extract color palette from image URL
 */
export const extractColors = async (imageUrl) => {
  try {
    if (!imageUrl || imageUrl.includes('undefined') || imageUrl.endsWith('null')) {
      throw new Error('Invalid image URL');
    }
    
    // Check if image exists
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Image not found: ${response.status}`);
    }
    
    // In a real app, you would use a color extraction library here
    return {
      vibrant: '#1DB954', // Spotify green
      darkVibrant: '#121212', // Spotify dark background
      muted: '#535353',
      darkMuted: '#282828',
      lightVibrant: '#1ed760',
      lightMuted: '#b3b3b3'
    };
  } catch (error) {
    // Fallback colors
    return {
      vibrant: '#1DB954',
      darkVibrant: '#121212',
      muted: '#535353',
      darkMuted: '#282828',
      lightVibrant: '#1ed760',
      lightMuted: '#b3b3b3'
    };
  }
}; 