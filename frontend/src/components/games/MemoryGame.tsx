import { RotateCcw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameProps {
  isOpen: boolean;
  onClose: () => void;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ isOpen, onClose }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const { addPoints } = usePointsStore();

  const emojis = ['🎮', '🎯', '🧩', '🎨', '🎪', '🎭', '🎸', '🎺'];

  const initializeGame = () => {
    const gameEmojis = emojis.slice(0, 6); // Use 6 pairs
    const cardPairs = [...gameEmojis, ...gameEmojis];
    const shuffledCards = cardPairs
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        value: emoji,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setGameComplete(false);
    setStartTime(Date.now());
    setEndTime(0);
  };

  useEffect(() => {
    if (isOpen) {
      initializeGame();
    }
  }, [isOpen]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      const firstCard = cards[first];
      const secondCard = cards[second];

      if (firstCard.value === secondCard.value) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            card.id === first || card.id === second 
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          ));
          setMatches(prev => prev + 1);
          setFlippedCards([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            card.id === first || card.id === second 
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
        }, 1000);
      }
      setMoves(prev => prev + 1);
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    if (matches === 6 && !gameComplete) {
      setGameComplete(true);
      setEndTime(Date.now());
      
      // Award points based on performance
      const score = getScore();
      const points = Math.max(10, Math.floor(score / 100));
      addPoints(points, 'memory_game', `Completed Memory Game with ${score} points`);
    }
  }, [matches, gameComplete, addPoints]);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return;
    if (cards[cardId].isFlipped || cards[cardId].isMatched) return;

    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));
    setFlippedCards(prev => [...prev, cardId]);
  };

  const getGameTime = () => {
    if (endTime && startTime) {
      return Math.round((endTime - startTime) / 1000);
    }
    return 0;
  };

  const getScore = () => {
    const time = getGameTime();
    const baseScore = 1000;
    const timeBonus = Math.max(0, 60 - time) * 10;
    const moveBonus = Math.max(0, 20 - moves) * 20;
    return baseScore + timeBonus + moveBonus;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">Memory Match</h2>
          <div className="flex justify-center space-x-6 text-sm text-gray-600">
            <span>Moves: {moves}</span>
            <span>Matches: {matches}/6</span>
            <button
              onClick={initializeGame}
              className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-2xl cursor-pointer transition-all duration-300
                ${card.isFlipped || card.isMatched 
                  ? 'bg-blue-100 border-2 border-blue-300' 
                  : 'bg-gray-200 hover:bg-gray-300 border-2 border-gray-300'
                }
                ${card.isMatched ? 'bg-green-100 border-green-300' : ''}
              `}
            >
              {card.isFlipped || card.isMatched ? card.value : '?'}
            </div>
          ))}
        </div>

        {gameComplete && (
          <div className="text-center p-4 bg-green-100 rounded-lg">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              🎉 Congratulations!
            </h3>
            <p className="text-green-700 mb-2">
              You completed the game in {moves} moves and {getGameTime()} seconds!
            </p>
            <p className="text-green-600 font-semibold">
              Score: {getScore()} points
            </p>
            <button
              onClick={initializeGame}
              className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {!gameComplete && (
          <div className="text-center text-gray-600 text-sm">
            Click cards to flip them and find matching pairs!
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryGame;