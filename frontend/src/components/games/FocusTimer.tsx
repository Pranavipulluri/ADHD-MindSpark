import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface FocusTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FocusTimer: React.FC<FocusTimerProps> = ({ isOpen, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTime, setSelectedTime] = useState(15);
  const [isMuted, setIsMuted] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const { addPoints } = usePointsStore();

  const timeOptions = [5, 10, 15, 25, 30, 45, 60];

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setCompletedSessions(prevSessions => {
              const newSessions = prevSessions + 1;
              
              // Award points based on session length
              const points = Math.max(5, selectedTime);
              addPoints(points, 'focus_session', `Completed ${selectedTime}-minute focus session`);
              
              return newSessions;
            });
            
            if (!isMuted) {
              // Play completion sound (you can add actual audio here)
              console.log('🔔 Focus session completed!');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isMuted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedTime * 60);
  };

  const handleTimeSelect = (minutes: number) => {
    if (!isRunning) {
      setSelectedTime(minutes);
      setTimeLeft(minutes * 60);
    }
  };

  const getProgressPercentage = () => {
    const totalTime = selectedTime * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const getMotivationalMessage = () => {
    const percentage = getProgressPercentage();
    if (percentage === 0) return "Ready to focus? You've got this! 🌟";
    if (percentage < 25) return "Great start! Keep going! 💪";
    if (percentage < 50) return "You're doing amazing! Stay focused! 🎯";
    if (percentage < 75) return "More than halfway there! 🚀";
    if (percentage < 100) return "Almost done! You're so close! ⭐";
    return "🎉 Fantastic job! You completed your focus session!";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">Focus Timer</h2>
          <p className="text-gray-600 mb-6">Stay focused and productive!</p>

          {/* Time Selection */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Select focus time:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {timeOptions.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  disabled={isRunning}
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${selectedTime === time 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                    ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {time}m
                </button>
              ))}
            </div>
          </div>

          {/* Timer Display */}
          <div className="mb-6">
            <div className="relative w-48 h-48 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#8b5cf6"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgressPercentage() / 100)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {getMotivationalMessage()}
            </p>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4 mb-6">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={timeLeft === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                <span>Start</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex items-center space-x-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Stats */}
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">
              Sessions completed today: <span className="font-bold text-purple-600">{completedSessions}</span>
            </p>
            {completedSessions > 0 && (
              <p className="text-xs text-green-600 mt-1">
                🎉 You've earned {completedSessions * 15} focus points!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;