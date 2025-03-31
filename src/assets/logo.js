import React from 'react';

// This component uses an inline SVG that's guaranteed to work
// since it doesn't depend on loading external files
const JellifyLogo = ({ height = '28px', style = {} }) => {
  // Calculate SVG dimensions based on provided height
  const svgHeight = parseInt(height, 10);
  const svgWidth = Math.round(svgHeight * 1.2); // Maintain aspect ratio
  
  return (
    <svg 
      width={svgWidth} 
      height={svgHeight} 
      viewBox="0 0 24 24" 
      style={{ 
        marginRight: '8px',
        ...style 
      }}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Music note with circle background - Jellify style */}
      <circle cx="12" cy="12" r="10" fill="#1DB954" />
      <path 
        d="M16 10V7h-4v5.5a2.5 2.5 0 1 1-1-2V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2v-1h2Z" 
        fill="white" 
      />
    </svg>
  );
};

export default JellifyLogo;
