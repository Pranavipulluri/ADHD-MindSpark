import React from 'react';
import Card from '../ui/Card';
import { Gamepad2, CheckSquare, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  to: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  title,
  description,
  icon,
  iconBgColor,
  to
}) => {
  return (
    <Link to={to}>
      <Card className="h-full" hover>
        <div className="flex flex-col items-center text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: iconBgColor }}
          >
            {icon}
          </div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </Card>
    </Link>
  );
};

const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <QuickAction
        title="Fun Games"
        description="Play games designed to boost focus and memory"
        icon={<Gamepad2 className="w-8 h-8 text-orange-500" />}
        iconBgColor="#FFF3E0"
        to="/games"
      />
      <QuickAction
        title="Task Manager"
        description="Organize tasks and keep track of your progress"
        icon={<CheckSquare className="w-8 h-8 text-blue-500" />}
        iconBgColor="#E3F2FD"
        to="/tasks"
      />
      <QuickAction
        title="Library"
        description="Access and organize your notes and materials"
        icon={<BookOpen className="w-8 h-8 text-purple-500" />}
        iconBgColor="#F3E5F5"
        to="/library"
      />
    </div>
  );
};

export default QuickActions;