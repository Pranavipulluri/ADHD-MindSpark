import { RotateCcw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

type Player = 'X' | 'O' | null;
type Board = Player[];

interface TicTacToeProps {
  isOpen: boolean;
  onClose: () => void;
}

const TicTacToe: React.FC<TicTacToeProps> = ({ isOpen, onClose }) => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Player>(null);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const { addPoints } = usePointsStore();

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  const checkWinner = (board: Board): Player => {
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const checkDraw = (board: Board): boolean => {
    return board.every(cell => cell !== null) && !checkWinner(board);
  };

  useEffect(() => {
    if (gameOver) return; // Prevent double execution
    
    const winner = checkWinner(board);
    const isDraw = checkDraw(board);

    if (winner) {
      setWinner(winner);
      setGameOver(true);
      setScores(prev => ({ ...prev, [winner]: prev[winner] + 1 }));
      
      // Award points if player wins (only once)
      if (winner === 'X') {
        addPoints(15, 'tictactoe_win', 'Won Tic Tac Toe game against computer');
      }
    } else if (isDraw) {
      setWinner(null);
      setGameOver(true);
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      
      // Award points for draw (only once)
      addPoints(5, 'tictactoe_draw', 'Drew Tic Tac Toe game against computer');
    } else if (currentPlayer === 'O' && !gameOver) {
      // Computer's turn
      setTimeout(() => {
        makeComputerMove();
      }, 500);
    }
  }, [board, currentPlayer, gameOver]);

  const makeComputerMove = () => {
    const availableMoves = board.map((cell, index) => cell === null ? index : null).filter(val => val !== null);
    
    if (availableMoves.length === 0) return;

    // Simple AI: Try to win, then block player, then random
    let move = findWinningMove('O') || findWinningMove('X') || availableMoves[Math.floor(Math.random() * availableMoves.length)];
    
    const newBoard = [...board];
    newBoard[move] = 'O';
    setBoard(newBoard);
    setCurrentPlayer('X');
  };

  const findWinningMove = (player: 'X' | 'O'): number | null => {
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        const testBoard = [...board];
        testBoard[i] = player;
        if (checkWinner(testBoard) === player) {
          return i;
        }
      }
    }
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || gameOver || currentPlayer === 'O') return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setCurrentPlayer('O');
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setGameOver(false);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-purple-600 mb-4">Tic Tac Toe</h2>
          
          <div className="flex justify-center space-x-6 text-sm mb-4">
            <span className="text-blue-600 font-semibold">You (X): {scores.X}</span>
            <span className="text-red-600 font-semibold">Computer (O): {scores.O}</span>
            <span className="text-gray-600 font-semibold">Draws: {scores.draws}</span>
          </div>

          {!gameOver && (
            <p className="text-gray-600">
              {currentPlayer === 'X' ? 'Your turn!' : 'Computer is thinking...'}
            </p>
          )}

          {gameOver && (
            <div className="p-3 rounded-lg bg-gray-100">
              {winner ? (
                <p className="font-bold text-lg">
                  🎉 Player <span className={winner === 'X' ? 'text-blue-600' : 'text-red-600'}>{winner}</span> wins!
                </p>
              ) : (
                <p className="font-bold text-lg text-gray-600">
                  🤝 It's a draw!
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 max-w-xs mx-auto">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              className={`
                aspect-square text-2xl font-bold border-2 border-gray-300 rounded-lg
                hover:bg-gray-50 transition-colors
                ${cell === 'X' ? 'text-blue-600' : cell === 'O' ? 'text-red-600' : 'text-gray-400'}
                ${gameOver ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={gameOver || cell !== null}
            >
              {cell || ''}
            </button>
          ))}
        </div>

        <div className="flex justify-center space-x-3">
          <button
            onClick={resetGame}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
          
          <button
            onClick={resetScores}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Reset Scores
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Get three in a row to win! 🎯
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;