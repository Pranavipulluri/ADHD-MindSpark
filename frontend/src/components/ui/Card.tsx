import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hover = false
}) => {
  const baseClasses = 'bg-white rounded-3xl shadow-md p-6 transition-all duration-300';
  const hoverClasses = hover ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer' : '';
  
  return (
    <div 
      className={twMerge(baseClasses, hoverClasses, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;