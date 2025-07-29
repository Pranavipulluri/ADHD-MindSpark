import React, { useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Plus } from 'lucide-react';
import Star from '../ui/Star';

interface TaskFormProps {
  onAddTask: (task: { title: string; description: string; priority: string; status: string }) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Must-Do');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAddTask({
      title,
      description,
      priority,
      status,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setStatus('Must-Do');
  };

  return (
    <Card className="mb-8 relative">
      <h2 className="text-2xl font-bold text-purple-600 mb-6">Add New Task to Board</h2>
      
      <form onSubmit={handleSubmit}>
        <Input
          placeholder="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        
        <TextArea
          placeholder="Task Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            options={[
              { value: 'Low', label: 'Low Priority' },
              { value: 'Medium', label: 'Medium Priority' },
              { value: 'High', label: 'High Priority' },
            ]}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
          
          <Select
            options={[
              { value: 'Must-Do', label: 'Must-Do' },
              { value: 'Can-Wait', label: 'Can-Wait' },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        
        <Button type="submit" leftIcon={<Plus className="w-4 h-4" />}>
          Add Task
        </Button>
      </form>
      
      <div className="absolute top-4 right-4">
        <Star />
      </div>
    </Card>
  );
};

export default TaskForm;