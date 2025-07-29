import React, { useState } from 'react';
import Card from '../ui/Card';
import { MoodOption } from '../../types';
import { Smile } from 'lucide-react';

const MoodTracker: React.FC = () => {
  const [moodOptions, setMoodOptions] = useState<MoodOption[]>([
    { emoji: '😊', label: 'Happy', color: '#FFD700', selected: false },
    { emoji: '😍', label: 'Excited', color: '#FF9FF3', selected: false },
    { emoji: '😌', label: 'Calm', color: '#7BEDAF', selected: false },
    { emoji: '😟', label: 'Worried', color: '#7BD3F7', selected: false },
    { emoji: '😠', label: 'Angry', color: '#FF6B6B', selected: false },
  ]);

  const selectMood = (index: number) => {
    const updatedMoods = moodOptions.map((mood, i) => ({
      ...mood,
      selected: i === index
    }));
    setMoodOptions(updatedMoods);
  };

  return (
    <Card className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        How are you feeling today? <Smile className="ml-2 text-yellow-500" />
      </h2>
      
      <div className="flex justify-center space-x-6">
        {moodOptions.map((mood, index) => (
          <button
            key={mood.label}
            className={`flex flex-col items-center transition-all duration-300 transform ${
              mood.selected ? 'scale-110' : 'hover:scale-105'
            }`}
            onClick={() => selectMood(index)}
          >
            <div 
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                mood.selected ? 'ring-4 ring-purple-400' : ''
              }`} 
              style={{ backgroundColor: mood.color }}
            >
              <span className="text-4xl">{mood.emoji}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
};

export default MoodTracker;