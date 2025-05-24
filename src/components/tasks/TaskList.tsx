import React from 'react';
import Card from '../ui/Card';
import { Task } from '../../types';

interface TaskListProps {
  title: string;
  tasks: Task[];
  color: string;
  count: number;
  onTaskClick?: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ 
  title, 
  tasks, 
  color, 
  count,
  onTaskClick
}) => {
  return (
    <div className="flex-1 relative">
      <div className="absolute -top-3 left-6">
        <div 
          className="px-3 py-1 rounded-full text-white font-medium text-sm"
          style={{ backgroundColor: color }}
        >
          <span className="flex items-center gap-1">
            {title} ({count})
            {color === '#FFB84C' && (
              <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
            )}
          </span>
        </div>
      </div>
      
      <Card className="pt-8 min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            {title === 'Done' ? 'No completed tasks yet.' : 'No tasks here yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer"
                onClick={() => onTaskClick && onTaskClick(task)}
              >
                <h4 className="font-medium">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                )}
                <div className="flex justify-between mt-2">
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ 
                      backgroundColor: 
                        task.priority === 'High' ? '#FFEBEE' : 
                        task.priority === 'Medium' ? '#FFF8E1' : '#E8F5E9',
                      color: 
                        task.priority === 'High' ? '#F44336' : 
                        task.priority === 'Medium' ? '#FFA000' : '#4CAF50',
                    }}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TaskList;