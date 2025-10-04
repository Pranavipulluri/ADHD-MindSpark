import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Star from '../ui/Star';
import TextArea from '../ui/TextArea';

interface TaskFormProps {
  onAddTask: (task: { title: string; description: string; priority: string; category: string }) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('daily');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAddTask({
      title,
      description,
      priority,
      category,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('daily');
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
              { value: 'low', label: 'Low Priority' },
              { value: 'medium', label: 'Medium Priority' },
              { value: 'high', label: 'High Priority' },
            ]}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
          
          <Select
            options={[
              { value: 'daily', label: 'Daily Tasks' },
              { value: 'academic', label: 'Academic' },
              { value: 'chores', label: 'Chores' },
              { value: 'health', label: 'Health' },
              { value: 'social', label: 'Social' },
              { value: 'creative', label: 'Creative' },
            ]}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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