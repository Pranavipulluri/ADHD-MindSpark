import React from 'react';

interface StarProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const Star: React.FC<StarProps> = ({ 
  className = '', 
  size = 'md',
  color = '#FFD700' 
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  return (
    <div className={`${sizeMap[size]} ${className} animate-pulse-slow`}>
      <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </div>
  );
};

export default Star;