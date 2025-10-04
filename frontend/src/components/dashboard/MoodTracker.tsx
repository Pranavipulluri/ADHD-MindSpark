import { Smile, Star } from 'lucide-react';
import React, { useState } from 'react';
import { apiClient } from '../../lib/api';
import { usePointsStore } from '../../stores/usePointsStore';
import { MoodOption } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';

const MoodTracker: React.FC = () => {
  const [moodOptions, setMoodOptions] = useState<MoodOption[]>([
    { emoji: '😊', label: 'Happy', color: '#FFD700', selected: false },
    { emoji: '😍', label: 'Excited', color: '#FF9FF3', selected: false },
    { emoji: '😌', label: 'Calm', color: '#7BEDAF', selected: false },
    { emoji: '😟', label: 'Worried', color: '#7BD3F7', selected: false },
    { emoji: '😠', label: 'Angry', color: '#FF6B6B', selected: false },
  ]);
  
  const [showMessage, setShowMessage] = useState(false);
  const [selectedMoodData, setSelectedMoodData] = useState<MoodOption | null>(null);
  const { addPoints } = usePointsStore();

  const selectMood = (index: number) => {
    const updatedMoods = moodOptions.map((mood, i) => ({
      ...mood,
      selected: i === index
    }));
    setMoodOptions(updatedMoods);
    setSelectedMoodData(updatedMoods[index]);
  };

  const saveMood = async () => {
    const selectedMood = moodOptions.find(mood => mood.selected);
    if (selectedMood) {
      try {
        // Save mood to backend
        await apiClient.addMoodEntry({
          mood_type: selectedMood.label.toLowerCase(),
          mood_intensity: 3, // Default intensity
          notes: `Feeling ${selectedMood.label.toLowerCase()}`
        });
        
        // Add points for mood tracking
        addPoints(5, 'mood_tracking', `Tracked mood: ${selectedMood.label}`);
        
        setShowMessage(true);
        
        // Hide message after 4 seconds and reset
        setTimeout(() => {
          setShowMessage(false);
          setMoodOptions(prev => prev.map(mood => ({ ...mood, selected: false })));
          setSelectedMoodData(null);
        }, 4000);
      } catch (error) {
        console.error('Failed to save mood:', error);
        // Still show success message even if backend fails
        setShowMessage(true);
        setTimeout(() => {
          setShowMessage(false);
          setMoodOptions(prev => prev.map(mood => ({ ...mood, selected: false })));
          setSelectedMoodData(null);
        }, 4000);
      }
    }
  };

  const getMoodMessage = (mood: MoodOption): string => {
    const messages = {
      'Happy': "That's wonderful! Your happiness is contagious! Keep spreading those good vibes! 🌟",
      'Excited': "How exciting! Your enthusiasm is amazing! What's got you so pumped up? ⚡",
      'Calm': "Inner peace is beautiful. You're doing great at staying centered! 🧘‍♀️",
      'Worried': "It's okay to feel worried sometimes. Take a deep breath - you've got this! 💙",
      'Angry': "Feeling angry is normal. Try some deep breathing or a quick walk to help! 🌈"
    };
    return messages[mood.label as keyof typeof messages] || "Thanks for sharing how you feel!";
  };

  return (
    <Card className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center">
        How are you feeling today? <Smile className="ml-2 text-yellow-500" />
      </h2>
      
      {!showMessage ? (
        <>
          <div className="flex justify-center space-x-6 mb-6">
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
                <span className="text-sm font-medium text-gray-600">{mood.label}</span>
              </button>
            ))}
          </div>
          
          <div className="text-center">
            <Button 
              onClick={saveMood}
              disabled={!moodOptions.some(mood => mood.selected)}
              className={!moodOptions.some(mood => mood.selected) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Save My Mood (+5 points)
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          {selectedMoodData && (
            <>
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: selectedMoodData.color }}
              >
                <span className="text-5xl">{selectedMoodData.emoji}</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">
                You're feeling {selectedMoodData.label.toLowerCase()}!
              </h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                {getMoodMessage(selectedMoodData)}
              </p>
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <Star className="w-4 h-4" />
                <span className="font-medium">+5 points earned!</span>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default MoodTracker;