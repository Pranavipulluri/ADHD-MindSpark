import { Check, Shuffle, Star, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface WordGameProps {
  onClose: () => void;
}

const WORD_LISTS = {
  easy: [
    { word: 'CAT', hint: 'A furry pet that says meow' },
    { word: 'DOG', hint: 'A loyal pet that barks' },
    { word: 'SUN', hint: 'Bright star in the sky' },
    { word: 'TREE', hint: 'Tall plant with leaves' },
    { word: 'BOOK', hint: 'You read this' },
    { word: 'FISH', hint: 'Swims in water' },
    { word: 'BIRD', hint: 'Flies in the sky' },
    { word: 'CAKE', hint: 'Sweet dessert for birthdays' }
  ],
  medium: [
    { word: 'RAINBOW', hint: 'Colorful arc in the sky after rain' },
    { word: 'BUTTERFLY', hint: 'Colorful insect with wings' },
    { word: 'ELEPHANT', hint: 'Large gray animal with trunk' },
    { word: 'COMPUTER', hint: 'Electronic device for work and games' },
    { word: 'MOUNTAIN', hint: 'Very tall hill' },
    { word: 'SANDWICH', hint: 'Food between two pieces of bread' },
    { word: 'BICYCLE', hint: 'Two-wheeled vehicle you pedal' },
    { word: 'LIBRARY', hint: 'Place with lots of books' }
  ],
  hard: [
    { word: 'ADVENTURE', hint: 'Exciting journey or experience' },
    { word: 'TELESCOPE', hint: 'Tool to see far away stars' },
    { word: 'DINOSAUR', hint: 'Extinct giant reptile' },
    { word: 'CHOCOLATE', hint: 'Sweet brown treat' },
    { word: 'FRIENDSHIP', hint: 'Special bond between people' },
    { word: 'IMAGINATION', hint: 'Ability to create ideas in your mind' },
    { word: 'CELEBRATION', hint: 'Happy party or event' },
    { word: 'UNDERWATER', hint: 'Below the surface of water' }
  ]
};

export const WordGame: React.FC<WordGameProps> = ({ onClose }) => {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentWord, setCurrentWord] = useState<{ word: string; hint: string } | null>(null);
  const [scrambledWord, setScrambledWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const { addPoints } = usePointsStore();

  const scrambleWord = (word: string): string => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.join('');
  };

  const getNewWord = () => {
    const wordList = WORD_LISTS[difficulty];
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    setCurrentWord(randomWord);
    setScrambledWord(scrambleWord(randomWord.word));
    setUserInput('');
    setShowHint(false);
    setFeedback({ type: null, message: '' });
  };

  useEffect(() => {
    getNewWord();
  }, [difficulty]);

  const handleSubmit = () => {
    if (!currentWord || !userInput.trim()) return;

    setAttempts(prev => prev + 1);

    if (userInput.toUpperCase() === currentWord.word) {
      const points = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20;
      setScore(prev => prev + points);
      addPoints(points, `Solved ${difficulty} word puzzle: ${currentWord.word}`);
      setFeedback({ type: 'success', message: `Correct! Great job! +${points} points` });
      
      setTimeout(() => {
        getNewWord();
      }, 2000);
    } else {
      setFeedback({ type: 'error', message: 'Not quite right. Try again!' });
      setTimeout(() => {
        setFeedback({ type: null, message: '' });
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
          <h2 className="text-2xl font-bold text-purple-800">Word Scramble</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Difficulty:</span>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    difficulty === level
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Score: {score}</span>
            <span>Attempts: {attempts}</span>
          </div>
        </div>

        {currentWord && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2 tracking-wider">
                {scrambledWord}
              </div>
              <p className="text-gray-600">Unscramble the letters to make a word!</p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg font-medium"
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim()}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Submit
                </button>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Hint
                </button>
                <button
                  onClick={getNewWord}
                  className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  New
                </button>
              </div>
            </div>

            {showHint && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  <strong>Hint:</strong> {currentWord.hint}
                </p>
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

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Solve words to earn points and improve your vocabulary!
          </p>
        </div>
      </div>
    </div>
  );
};