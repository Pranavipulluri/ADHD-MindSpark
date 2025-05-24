import React from 'react';
import Header from '../components/dashboard/Header';
import GameCard from '../components/games/GameCard';
import { GameCard as GameCardType } from '../types';

const Games: React.FC = () => {
  const games: GameCardType[] = [
    {
      id: 'tictactoe',
      title: 'Tic Tac Toe',
      description: "Classic X's and O's. Challenge your strategic thinking!",
      icon: 'Grid3X3',
      iconBgColor: '#FFF3E0',
    },
    {
      id: 'memory',
      title: 'Memory Match',
      description: 'Test your memory by matching pairs of cards.',
      icon: 'Brain',
      iconBgColor: '#E3F2FD',
    },
    {
      id: 'focus-finder',
      title: 'Focus Finder',
      description: 'Find the hidden objects as quickly as you can.',
      icon: 'Brain',
      iconBgColor: '#E8F5E9',
    },
    {
      id: 'coming-soon',
      title: 'Coming Soon',
      description: 'More exciting games are on the way!',
      icon: 'Clock',
      iconBgColor: '#F3E5F5',
      comingSoon: true,
    },
  ];

  const handleGameClick = (gameId: string) => {
    console.log(`Starting game: ${gameId}`);
  };

  return (
    <div className="py-8">
      <Header 
        title="Fun & Focus Games" 
        subtitle="Engaging mini-games designed to boost focus, memory, and reaction time. Click a game to play!" 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {games.map((game) => (
            <GameCard 
              key={game.id} 
              game={game} 
              onClick={handleGameClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Games;