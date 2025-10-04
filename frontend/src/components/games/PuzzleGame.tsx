import { Puzzle, Shuffle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface PuzzleGameProps {
  onClose: () => void;
}

type PuzzleSize = 3 | 4;

export const PuzzleGame: React.FC<PuzzleGameProps> = ({ onClose }) => {
  const [size, setSize] = useState<PuzzleSize>(3);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const { addPoints } = usePointsStore();

  const initializePuzzle = () => {
    const totalTiles = size * size;
    const newTiles = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1);
    newTiles.push(0); // 0 represents the empty space
    
    // Shuffle the tiles
    for (let i = 0; i < 1000; i++) {
      const emptyIndex = newTiles.indexOf(0);
      const possibleMoves = getPossibleMoves(emptyIndex, size);
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      [newTiles[emptyIndex], newTiles[randomMove]] = [newTiles[randomMove], newTiles[emptyIndex]];
    }
    
    setTiles(newTiles);
    setMoves(0);
    setIsComplete(false);
    setStartTime(new Date());
    setEndTime(null);
  };

  const getPossibleMoves = (emptyIndex: number, gridSize: number): number[] => {
    const moves: number[] = [];
    const row = Math.floor(emptyIndex / gridSize);
    const col = emptyIndex % gridSize;

    // Up
    if (row > 0) moves.push(emptyIndex - gridSize);
    // Down
    if (row < gridSize - 1) moves.push(emptyIndex + gridSize);
    // Left
    if (col > 0) moves.push(emptyIndex - 1);
    // Right
    if (col < gridSize - 1) moves.push(emptyIndex + 1);

    return moves;
  };

  const handleTileClick = (clickedIndex: number) => {
    if (isComplete) return;

    const emptyIndex = tiles.indexOf(0);
    const possibleMoves = getPossibleMoves(emptyIndex, size);

    if (possibleMoves.includes(clickedIndex)) {
      const newTiles = [...tiles];
      [newTiles[emptyIndex], newTiles[clickedIndex]] = [newTiles[clickedIndex], newTiles[emptyIndex]];
      setTiles(newTiles);
      setMoves(prev => prev + 1);

      // Check if puzzle is complete
      const isWin = newTiles.every((tile, index) => {
        if (index === newTiles.length - 1) return tile === 0;
        return tile === index + 1;
      });

      if (isWin) {
        setIsComplete(true);
        setEndTime(new Date());
        const points = size === 3 ? 50 : 100;
        addPoints(points, `Completed ${size}x${size} sliding puzzle in ${moves + 1} moves`);
      }
    }
  };

  useEffect(() => {
    initializePuzzle();
  }, [size]);

  const getTimeElapsed = (): string => {
    if (!startTime) return '0:00';
    const end = endTime || new Date();
    const diff = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
            <Puzzle className="w-6 h-6" />
            Sliding Puzzle
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setSize(3)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  size === 3
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                3×3
              </button>
              <button
                onClick={() => setSize(4)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  size === 4
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                4×4
              </button>
            </div>
            <button
              onClick={initializePuzzle}
              className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              <Shuffle className="w-4 h-4" />
              New Game
            </button>
          </div>

          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>Moves: <span className="font-bold">{moves}</span></span>
            <span>Time: <span className="font-bold">{getTimeElapsed()}</span></span>
          </div>
        </div>

        <div 
          className={`grid gap-2 mx-auto mb-4 ${
            size === 3 ? 'grid-cols-3 w-64' : 'grid-cols-4 w-80'
          }`}
          style={{ maxWidth: size === 3 ? '256px' : '320px' }}
        >
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => handleTileClick(index)}
              className={`
                aspect-square flex items-center justify-center text-lg font-bold rounded-lg transition-all
                ${tile === 0 
                  ? 'bg-gray-100 cursor-default' 
                  : 'bg-gradient-to-br from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700 cursor-pointer shadow-md hover:shadow-lg'
                }
                ${!isComplete && tile !== 0 ? 'hover:scale-105' : ''}
              `}
              disabled={isComplete}
            >
              {tile !== 0 && tile}
            </button>
          ))}
        </div>

        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4">
            <h3 className="text-lg font-bold text-green-800 mb-2">🎉 Congratulations!</h3>
            <div className="text-sm text-green-700 space-y-1">
              <div>Completed in <span className="font-bold">{moves} moves</span></div>
              <div>Time: <span className="font-bold">{getTimeElapsed()}</span></div>
              <div>Points earned: <span className="font-bold">+{size === 3 ? 50 : 100}</span></div>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Click tiles next to the empty space to move them.
          </p>
          <p className="text-xs text-gray-500">
            Arrange numbers 1-{size * size - 1} in order with the empty space at the bottom right.
          </p>
        </div>
      </div>
    </div>
  );
};