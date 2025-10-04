import React, { useState } from 'react';
import Header from '../components/dashboard/Header';
import BreathingExercise from '../components/games/BreathingExercise';
import GameCard from '../components/games/GameCard';
import { MathGame } from '../components/games/MathGame';
import MemoryGame from '../components/games/MemoryGame';
import { PuzzleGame } from '../components/games/PuzzleGame';
import TicTacToe from '../components/games/TicTacToe';
import { WordGame } from '../components/games/WordGame';
import { GameCard as GameCardType } from '../types';

const Games: React.FC = () => {
  const [activeGame, setActiveGame] = useState<string | null>(null);

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
      id: 'breathing',
      title: 'Breathing Exercise',
      description: 'Calm your mind with guided breathing exercises.',
      icon: 'Brain',
      iconBgColor: '#E8F5E9',
    },
    {
      id: 'wordgame',
      title: 'Word Scramble',
      description: 'Unscramble letters to form words and expand your vocabulary!',
      icon: 'Type',
      iconBgColor: '#F3E5F5',
    },
    {
      id: 'mathgame',
      title: 'Math Challenge',
      description: 'Solve math problems quickly to improve your calculation skills!',
      icon: 'Calculator',
      iconBgColor: '#E1F5FE',
    },
    {
      id: 'puzzle',
      title: 'Sliding Puzzle',
      description: 'Arrange numbered tiles in order. Great for problem-solving!',
      icon: 'Puzzle',
      iconBgColor: '#E8F5E9',
    },
  ];

  const handleGameClick = (gameId: string) => {
    setActiveGame(gameId);
  };

  const closeGame = () => {
    setActiveGame(null);
  };

  return (
    <>
      <div className="py-8">
        <Header 
          title="Fun & Focus Games" 
          subtitle="Engaging mini-games designed to boost focus, memory, and reaction time. Click a game to play!" 
        />
        
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Game Modals */}
      <TicTacToe 
        isOpen={activeGame === 'tictactoe'} 
        onClose={closeGame} 
      />
      
      <MemoryGame 
        isOpen={activeGame === 'memory'} 
        onClose={closeGame} 
      />
      
      <BreathingExercise 
        isOpen={activeGame === 'breathing'} 
        onClose={closeGame} 
      />

      {activeGame === 'wordgame' && (
        <WordGame onClose={closeGame} />
      )}

      {activeGame === 'mathgame' && (
        <MathGame onClose={closeGame} />
      )}

      {activeGame === 'puzzle' && (
        <PuzzleGame onClose={closeGame} />
      )}
    </>
  );
};

export default Games;