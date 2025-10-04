import { Calculator, Check, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface MathGameProps {
  onClose: () => void;
}

type Operation = '+' | '-' | '×' | '÷';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Problem {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
}

export const MathGame: React.FC<MathGameProps> = ({ onClose }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalProblems, setTotalProblems] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameActive, setIsGameActive] = useState(false);
  const { addPoints } = usePointsStore();

  const generateProblem = (): Problem => {
    let num1: number, num2: number, operation: Operation, answer: number;

    switch (difficulty) {
      case 'easy':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        operation = Math.random() < 0.5 ? '+' : '-';
        if (operation === '-' && num1 < num2) {
          [num1, num2] = [num2, num1]; // Ensure positive results
        }
        break;
      case 'medium':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        const operations: Operation[] = ['+', '-', '×'];
        operation = operations[Math.floor(Math.random() * operations.length)];
        if (operation === '-' && num1 < num2) {
          [num1, num2] = [num2, num1];
        }
        if (operation === '×') {
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
        }
        break;
      case 'hard':
        num1 = Math.floor(Math.random() * 100) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        const allOperations: Operation[] = ['+', '-', '×', '÷'];
        operation = allOperations[Math.floor(Math.random() * allOperations.length)];
        if (operation === '-' && num1 < num2) {
          [num1, num2] = [num2, num1];
        }
        if (operation === '×') {
          num1 = Math.floor(Math.random() * 25) + 1;
          num2 = Math.floor(Math.random() * 15) + 1;
        }
        if (operation === '÷') {
          // Ensure clean division
          num2 = Math.floor(Math.random() * 12) + 1;
          answer = Math.floor(Math.random() * 20) + 1;
          num1 = answer * num2;
        }
        break;
    }

    // Calculate answer
    switch (operation) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        answer = num1 - num2;
        break;
      case '×':
        answer = num1 * num2;
        break;
      case '÷':
        answer = Math.floor(num1 / num2);
        break;
    }

    return { num1, num2, operation, answer };
  };

  const startNewProblem = () => {
    const problem = generateProblem();
    setCurrentProblem(problem);
    setUserAnswer('');
    setFeedback({ type: null, message: '' });
  };

  const startGame = () => {
    setIsGameActive(true);
    setScore(0);
    setStreak(0);
    setTotalProblems(0);
    setTimeLeft(30);
    startNewProblem();
  };

  const endGame = () => {
    if (!isGameActive) return; // Prevent double execution
    
    setIsGameActive(false);
    const finalPoints = score * 2;
    if (score > 0) {
      addPoints(finalPoints, 'math_game_completed', `Completed math game with ${score} correct answers`);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGameActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isGameActive) {
      endGame();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isGameActive]);

  const handleSubmit = () => {
    if (!currentProblem || !userAnswer.trim() || !isGameActive) return;

    const userNum = parseInt(userAnswer);
    setTotalProblems(prev => prev + 1);

    if (userNum === currentProblem.answer) {
      const points = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      setFeedback({ type: 'success', message: `Correct! +${points} points` });
      
      setTimeout(() => {
        startNewProblem();
      }, 1000);
    } else {
      setStreak(0);
      setFeedback({ 
        type: 'error', 
        message: `Incorrect. The answer was ${currentProblem.answer}` 
      });
      
      setTimeout(() => {
        startNewProblem();
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Math Challenge
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!isGameActive ? (
          <div className="text-center space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Choose Difficulty:
              </label>
              <div className="flex gap-2 justify-center">
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      difficulty === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Game Rules:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Solve as many problems as you can in 30 seconds</li>
                <li>• Easy: +1 point, Medium: +2 points, Hard: +3 points</li>
                <li>• Build streaks for bonus satisfaction!</li>
              </ul>
            </div>

            <button
              onClick={startGame}
              className="bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 font-medium text-lg"
            >
              Start Game!
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <div>Score: <span className="font-bold text-blue-600">{score}</span></div>
                <div>Streak: <span className="font-bold text-green-600">{streak}</span></div>
              </div>
              <div className={`text-lg font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-600'}`}>
                Time: {timeLeft}s
              </div>
            </div>

            {currentProblem && (
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-gray-800 py-4">
                  {currentProblem.num1} {currentProblem.operation} {currentProblem.num2} = ?
                </div>

                <input
                  type="number"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Your answer"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl font-medium"
                  autoFocus
                />

                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  <Check className="w-5 h-5" />
                  Submit Answer
                </button>
              </div>
            )}

            {feedback.type && (
              <div className={`p-3 rounded-lg text-center font-medium ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {feedback.message}
              </div>
            )}
          </div>
        )}

        {!isGameActive && totalProblems > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Game Over!</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Final Score: <span className="font-bold">{score}</span></div>
              <div>Problems Solved: <span className="font-bold">{totalProblems}</span></div>
              <div>Accuracy: <span className="font-bold">{Math.round((score / totalProblems) * 100)}%</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};