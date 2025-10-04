import React, { useEffect, useState } from 'react';
import Header from '../components/dashboard/Header';
import TaskForm from '../components/tasks/TaskForm';
import TaskList from '../components/tasks/TaskList';
import { usePointsStore } from '../stores/usePointsStore';
import { useTasksStore } from '../stores/useTasksStore';
import { Task } from '../types';

const Tasks: React.FC = () => {
  const { tasks, loadTasks, createTask, completeTask } = useTasksStore();
  const { addPoints } = usePointsStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (taskData: { 
    title: string; 
    description: string; 
    priority: string; 
    category: string;
  }) => {
    await createTask({
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority as 'low' | 'medium' | 'high',
      category: taskData.category as 'daily' | 'academic' | 'chores' | 'health' | 'social' | 'creative',
      status: 'pending'
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCompleteTask = async (task: Task) => {
    await completeTask(task.id);
    
    // Award points based on priority
    const points = task.priority === 'high' ? 20 : task.priority === 'medium' ? 15 : 10;
    addPoints(points, 'task_completed', `Completed ${task.priority} priority task: ${task.title}`);
    
    setSelectedTask(null);
  };

  // Filter tasks by status
  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="py-8">
      <Header 
        title="Task Manager" 
        subtitle="Organize your tasks and track your progress. Break down big tasks into smaller, more manageable steps." 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <TaskForm onAddTask={addTask} />
        
        <div className="grid md:grid-cols-3 gap-6">
          <TaskList 
            title="Pending"
            tasks={pendingTasks}
            color="#FF6B6B"
            count={pendingTasks.length}
            onTaskClick={handleTaskClick}
          />
          
          <TaskList 
            title="In Progress"
            tasks={inProgressTasks}
            color="#FFB84C"
            count={inProgressTasks.length}
            onTaskClick={handleTaskClick}
          />
          
          <TaskList 
            title="Completed"
            tasks={completedTasks}
            color="#4CAF50"
            count={completedTasks.length}
            onTaskClick={handleTaskClick}
          />
        </div>

        {/* Task Detail Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-gray-600 mb-4">{selectedTask.description}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">Priority:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  selectedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                  selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div className="flex gap-3">
                {selectedTask.status !== 'completed' && (
                  <button
                    onClick={() => handleCompleteTask(selectedTask)}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
                  >
                    Mark Complete (+{selectedTask.priority === 'high' ? 20 : selectedTask.priority === 'medium' ? 15 : 10} points)
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;