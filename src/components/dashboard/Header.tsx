import React from 'react';
import { Zap, Rocket } from 'lucide-react';
import Star from '../ui/Star';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showIcon?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle,
  showIcon = true
}) => {
  return (
    <div className="relative mb-8 text-center">
      {showIcon && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2">
          <Rocket className="w-12 h-12 text-orange-500 transform rotate-12 animate-float" />
        </div>
      )}
      
      <div>
        {showIcon && (
          <Zap className="inline-block w-6 h-6 text-orange-500 mr-2 mb-1" />
        )}
        <h1 className="text-4xl font-bold text-white inline-block">{title}</h1>
      </div>
      
      {subtitle && (
        <p className="text-white text-lg mt-2 max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
      
      <div className="absolute right-8 top-2">
        <Star size="lg" className="animate-float" />
      </div>
    </div>
  );
};

export default Header;