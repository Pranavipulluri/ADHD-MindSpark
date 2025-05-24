import React, { useState } from 'react';
import Header from '../components/dashboard/Header';
import TaskForm from '../components/tasks/TaskForm';
import TaskList from '../components/tasks/TaskList';
import { Task } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = (taskData: { 
    title: string; 
    description: string; 
    priority: string; 
    status: string 
  }) => {
    const newTask: Task = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority as 'Low' | 'Medium' | 'High',
      status: taskData.status as 'Must-Do' | 'Can-Wait' | 'Done',
      createdAt: new Date(),
    };
    
    setTasks([...tasks, newTask]);
  };

  const handleTaskClick = (task: Task) => {
    // In a real app, this would open a task detail/edit modal
    console.log('Task clicked:', task);
  };

  // Filter tasks by status
  const mustDoTasks = tasks.filter(task => task.status === 'Must-Do');
  const canWaitTasks = tasks.filter(task => task.status === 'Can-Wait');
  const doneTasks = tasks.filter(task => task.status === 'Done');

  return (
    <div className="py-8">
      <Header 
        title="Task Manager" 
        subtitle="Organize your tasks and track your progress. Break down big tasks into smaller, more manageable steps." 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <TaskForm onAddTask={addTask} />
        
        <div className="flex flex-col md:flex-row gap-6">
          <TaskList 
            title="Must-Do" 
            tasks={mustDoTasks} 
            color="#FFB84C"
            count={mustDoTasks.length}
            onTaskClick={handleTaskClick}
          />
          <TaskList 
            title="Can-Wait" 
            tasks={canWaitTasks} 
            color="#4D96FF"
            count={canWaitTasks.length}
            onTaskClick={handleTaskClick}
          />
          <TaskList 
            title="Done" 
            tasks={doneTasks} 
            color="#4CAF50"
            count={doneTasks.length}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>
    </div>
  );
};

export default Tasks;