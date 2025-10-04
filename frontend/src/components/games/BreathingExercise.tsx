import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface BreathingExerciseProps {
  isOpen: boolean;
  onClose: () => void;
}

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<'ready' | 'inhale' | 'hold' | 'exhale'>('ready');
  const [cycle, setCycle] = useState(0);
  const [totalCycles] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(4);
  const { addPoints } = usePointsStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && phase !== 'ready') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Move to next phase
            if (phase === 'inhale') {
              setPhase('hold');
              return 2; // Hold for 2 seconds
            } else if (phase === 'hold') {
              setPhase('exhale');
              return 4; // Exhale for 4 seconds
            } else if (phase === 'exhale') {
              const newCycle = cycle + 1;
              setCycle(newCycle);
              
              if (newCycle >= totalCycles) {
                // Exercise complete
                setIsActive(false);
                setPhase('ready');
                setCycle(0);
                
                // Award points for completing breathing exercise
                addPoints(10, 'breathing_exercise', 'Completed 5-cycle breathing exercise');
                
                return 4;
              } else {
                setPhase('inhale');
                return 4; // Inhale for 4 seconds
              }
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, phase, cycle, totalCycles]);

  const startExercise = () => {
    setIsActive(true);
    setPhase('inhale');
    setTimeLeft(4);
    setCycle(0);
  };

  const stopExercise = () => {
    setIsActive(false);
    setPhase('ready');
    setCycle(0);
    setTimeLeft(4);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'ready':
        return 'Ready to start?';
      case 'inhale':
        return 'Breathe In...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe Out...';
      default:
        return '';
    }
  };

  const getCircleScale = () => {
    switch (phase) {
      case 'inhale':
        return 'scale-125';
      case 'hold':
        return 'scale-125';
      case 'exhale':
        return 'scale-75';
      default:
        return 'scale-100';
    }
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
          <h2 className="text-2xl font-bold mb-2 text-purple-600">Breathing Exercise</h2>
          <p className="text-gray-600 mb-8">Follow the circle and breathe calmly</p>

          <div className="flex flex-col items-center mb-8">
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center transition-transform duration-1000 ease-in-out ${getCircleScale()}`}
            >
              <span className="text-white font-semibold text-lg">
                {phase !== 'ready' ? timeLeft : ''}
              </span>
            </div>
            
            <div className="mt-6">
              <p className="text-xl font-semibold text-gray-700 mb-2">
                {getPhaseText()}
              </p>
              
              {isActive && (
                <p className="text-sm text-gray-500">
                  Cycle {cycle + 1} of {totalCycles}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            {!isActive ? (
              <button
                onClick={startExercise}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Start Exercise
              </button>
            ) : (
              <button
                onClick={stopExercise}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                Stop Exercise
              </button>
            )}
          </div>

          {cycle >= totalCycles && !isActive && cycle > 0 && (
            <div className="mt-4 p-4 bg-green-100 rounded-lg">
              <p className="text-green-800 font-semibold">
                🎉 Great job! You completed the breathing exercise!
              </p>
              <p className="text-green-600 text-sm mt-1">
                You earned 10 points for taking care of your mental health!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreathingExercise;