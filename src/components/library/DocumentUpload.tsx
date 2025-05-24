import React, { useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Upload } from 'lucide-react';
import Star from '../ui/Star';

interface DocumentUploadProps {
  categories: { value: string; label: string }[];
  onUpload: (name: string, category: string, file: File | null) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ categories, onUpload }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.value || '');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onUpload(name, category, file);
    setName('');
    setFile(null);
  };

  return (
    <Card className="mb-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Upload Document</h2>
        <div className="flex gap-2">
          <Button variant="outline">Create Note</Button>
          <Button 
            className="bg-orange-500 hover:bg-orange-600"
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Upload
          </Button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Input
          placeholder="Document Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        
        <Select
          options={categories}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mb-6"
        />
        
        <div 
          className={`border-2 border-dashed rounded-lg p-8 mb-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'border-purple-400 bg-purple-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <Upload className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-center text-gray-600">
            Click to upload PDF or document
            <br />
            <span className="text-sm text-gray-400">Max file size: 10MB</span>
          </p>
          <input
            id="fileInput"
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={!name.trim()}
        >
          Upload Document
        </Button>
      </form>
      
      <div className="absolute top-4 right-4">
        <Star />
      </div>
    </Card>
  );
};

export default DocumentUpload;