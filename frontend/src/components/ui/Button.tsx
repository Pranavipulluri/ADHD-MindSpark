import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseClasses = 'font-medium rounded-full transition-all duration-300 flex items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg',
    outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-50',
    ghost: 'hover:bg-purple-50 text-purple-500',
  };
  
  const sizeClasses = {
    sm: 'text-sm py-1 px-3',
    md: 'text-base py-2 px-6',
    lg: 'text-lg py-3 px-8',
  };
  
  const classes = twMerge(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );
  
  return (
    <button className={classes} {...props}>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;