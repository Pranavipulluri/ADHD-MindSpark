import { Clock, Flower } from 'lucide-react';
import React, { useState } from 'react';
import BreathingExercise from '../games/BreathingExercise';
import FocusTimer from '../games/FocusTimer';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface CalmingToolProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  buttonText: string;
  onClick: () => void;
}

const CalmingTool: React.FC<CalmingToolProps> = ({
  title,
  description,
  icon,
  iconColor,
  buttonText,
  onClick
}) => {
  return (
    <Card className="flex-1">
      <div className="flex items-center mb-2">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
          style={{ backgroundColor: iconColor }}
        >
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      
      <p className="text-gray-600 mb-6 text-center">{description}</p>
      
      {title === "Calm Down Corner" ? (
        <div className="flex flex-col items-center">
          <div className="w-36 h-36 rounded-full border-4 border-blue-400 flex items-center justify-center mb-6 hover:border-blue-500 transition-all duration-300">
            <span className="text-blue-500 text-2xl font-bold">Breathe</span>
          </div>
          <Button onClick={onClick}>Start Breathing</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="text-6xl font-bold text-purple-600 mb-6">15:00</div>
          <div className="flex space-x-3">
            <Button 
              variant="secondary" 
              className="w-12 h-12 rounded-full p-0 bg-green-500"
              onClick={onClick}
            >
              <span className="material-icons">▶</span>
            </Button>
            <Button 
              variant="secondary" 
              className="w-12 h-12 rounded-full p-0 bg-orange-500"
              onClick={onClick}
            >
              <span className="material-icons">⟲</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-12 h-12 rounded-full p-0 border-gray-300 text-gray-500"
              onClick={onClick}
            >
              <span className="material-icons">🔇</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

const CalmingTools: React.FC = () => {
  const [showBreathing, setShowBreathing] = useState(false);
  const [showFocusTimer, setShowFocusTimer] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <CalmingTool
          title="Calm Down Corner"
          description="Click the circle and breathe with me!"
          icon={<Flower className="w-5 h-5 text-white" />}
          iconColor="#FF9FF3"
          buttonText="Start Breathing"
          onClick={() => setShowBreathing(true)}
        />
        <CalmingTool
          title="Focus Time"
          description="Let's focus together!"
          icon={<Clock className="w-5 h-5 text-white" />}
          iconColor="#7BD3F7"
          buttonText="Start Timer"
          onClick={() => setShowFocusTimer(true)}
        />
      </div>

      <BreathingExercise 
        isOpen={showBreathing} 
        onClose={() => setShowBreathing(false)} 
      />
      
      <FocusTimer 
        isOpen={showFocusTimer} 
        onClose={() => setShowFocusTimer(false)} 
      />
    </>
  );
};

export default CalmingTools;