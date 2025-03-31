/**
 * Format seconds to mm:ss
 */
export const formatTime = (timeInSeconds) => {
  // Handle Jellyfin's RunTimeTicks format (100-nanosecond units)
  if (timeInSeconds && (
      timeInSeconds > 10000000000 || 
      (timeInSeconds > 10000000 && timeInSeconds.toString().includes('.00')) || 
      timeInSeconds % 1 === 0 && timeInSeconds > 1000000 
  )) {
    timeInSeconds = timeInSeconds / 10000000;
  }
  
  // Handle edge cases
  if (timeInSeconds === undefined || 
      timeInSeconds === null || 
      isNaN(timeInSeconds) || 
      !isFinite(timeInSeconds) || 
      timeInSeconds < 0) {
    return '0:00'
  }
  
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = Math.floor(timeInSeconds % 60)
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format seconds to hours and minutes
 */
export const formatDuration = (timeInSeconds) => {
  // Handle Jellyfin's RunTimeTicks format
  if (timeInSeconds && (
      timeInSeconds > 10000000000 || 
      (timeInSeconds > 10000000 && timeInSeconds.toString().includes('.00')) || 
      timeInSeconds % 1 === 0 && timeInSeconds > 1000000
  )) {
    timeInSeconds = timeInSeconds / 10000000;
  }
  
  // Handle edge cases
  if (timeInSeconds === undefined || 
      timeInSeconds === null || 
      isNaN(timeInSeconds) || 
      !isFinite(timeInSeconds) || 
      timeInSeconds < 0) {
    return '0 min'
  }
  
  const hours = Math.floor(timeInSeconds / 3600)
  const minutes = Math.floor((timeInSeconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours} hr ${minutes > 0 ? `${minutes} min` : ''}`
  } else {
    return `${minutes} min`
  }
}

// Convert Jellyfin ticks to mm:ss
export const formatTicksToTime = (ticks) => {
  if (!ticks) return '0:00'
  
  const seconds = ticks / 10000000
  return formatTime(seconds)
}

// Format date to relative time (e.g., "2 days ago")
export const formatRelativeTime = (date) => {
  if (!date) return 'Unknown';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Unknown';
  }
} 