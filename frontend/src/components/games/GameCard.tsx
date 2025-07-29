import React from 'react';
import Card from '../ui/Card';
import { GameCard as GameCardType } from '../../types';
import { Brain, Grid3X3, Clock } from 'lucide-react';
import Star from '../ui/Star';

interface GameCardProps {
  game: GameCardType;
  onClick: (id: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const getIcon = () => {
    switch (game.icon) {
      case 'Grid3X3':
        return <Grid3X3 className="w-8 h-8 text-orange-500" />;
      case 'Brain':
        return <Brain className="w-8 h-8 text-blue-500" />;
      case 'Clock':
        return <Clock className="w-8 h-8 text-purple-500" />;
      default:
        return <Brain className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <Card 
      className="h-full relative" 
      hover={!game.comingSoon}
      onClick={() => !game.comingSoon && onClick(game.id)}
    >
      <div className="flex flex-col items-center text-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: game.iconBgColor }}
        >
          {getIcon()}
        </div>
        <h3 className="text-xl font-bold mb-2">{game.title}</h3>
        <p className="text-gray-600">{game.description}</p>
        
        {game.comingSoon && (
          <div className="mt-4 py-1 px-3 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
            Coming Soon
          </div>
        )}
      </div>
      
      {!game.comingSoon && (
        <div className="absolute top-3 right-3">
          <Star size="sm" />
        </div>
      )}
    </Card>
  );
};

export default GameCard;