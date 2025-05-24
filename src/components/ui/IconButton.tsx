import React from 'react';
import { twMerge } from 'tailwind-merge';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  bgColor?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'primary',
  size = 'md',
  className = '',
  bgColor,
  ...props
}) => {
  const baseClasses = 'rounded-full flex items-center justify-center transition-all duration-300';
  
  const variantClasses = {
    primary: 'bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg',
    outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-50',
    ghost: 'hover:bg-purple-50 text-purple-500',
  };
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2.5',
    lg: 'p-3.5',
  };
  
  const customBgColor = bgColor ? { backgroundColor: bgColor } : {};
  
  const classes = twMerge(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );
  
  return (
    <button className={classes} style={customBgColor} {...props}>
      {icon}
    </button>
  );
};

export default IconButton;