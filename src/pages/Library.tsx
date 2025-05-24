import React, { useState } from 'react';
import Header from '../components/dashboard/Header';
import DocumentUpload from '../components/library/DocumentUpload';
import DocumentList from '../components/library/DocumentList';
import CategoryList from '../components/library/CategoryList';
import { Document, DocumentCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Library: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [documents, setDocuments] = useState<Document[]>([]);

  const categories: DocumentCategory[] = [
    { id: 'all', name: 'All Documents' },
    { id: 'homework', name: 'Homework' },
    { id: 'notes', name: 'Notes' },
    { id: 'reading', name: 'Reading' },
    { id: 'resources', name: 'Resources' },
  ];

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name,
  }));

  const handleUpload = (name: string, categoryId: string, file: File | null) => {
    // In a real app, we would upload the file to a server
    const newDocument: Document = {
      id: uuidv4(),
      name,
      categoryId,
      createdAt: new Date(),
      url: file ? URL.createObjectURL(file) : undefined,
    };
    
    setDocuments([...documents, newDocument]);
  };

  const handleDocumentClick = (document: Document) => {
    // In a real app, this would open the document
    console.log('Document clicked:', document);
    if (document.url) {
      window.open(document.url, '_blank');
    }
  };

  // Filter documents by category
  const filteredDocuments = activeCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.categoryId === activeCategory);

  return (
    <div className="py-8">
      <Header 
        title="Library" 
        subtitle="Store and organize all your documents, notes, and learning materials in one place." 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <DocumentUpload 
          categories={categoryOptions} 
          onUpload={handleUpload} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <CategoryList 
              categories={categories} 
              activeCategory={activeCategory}
              onCategoryClick={setActiveCategory}
            />
          </div>
          <div className="md:col-span-3">
            <DocumentList 
              title="All Documents" 
              documents={filteredDocuments}
              onDocumentClick={handleDocumentClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Library;