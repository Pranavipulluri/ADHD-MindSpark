import { FileText, Plus, RotateCcw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Header from '../components/dashboard/Header';
import CategoryList from '../components/library/CategoryList';
import DocumentList from '../components/library/DocumentList';
import DocumentUpload from '../components/library/DocumentUpload';
import { apiClient } from '../lib/api';
import { Document } from '../types';

// Define DocumentCategory type locally if not exported from '../types'
type DocumentCategory = {
  id: string;
  name: string;
  color?: string;
};

const Library: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([
    { id: 'all', name: 'All Documents' }
  ]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load documents and categories from backend
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load categories
      const categoriesResponse = await apiClient.getDocumentCategories();
      if (categoriesResponse.success) {
        const backendCategories = categoriesResponse.data.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color
        }));
        setCategories([
          { id: 'all', name: 'All Documents' },
          ...backendCategories
        ]);
      }

      // Load documents
      const documentsResponse = await apiClient.getDocuments();
      if (documentsResponse.success) {
        const backendDocuments = documentsResponse.data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.title,
          categoryId: doc.category_id || 'other',
          createdAt: new Date(doc.created_at),
          content: doc.content,
          type: doc.file_url ? 'file' : 'note',
          url: doc.file_url,
          tags: doc.tags || [],
          aiSummary: doc.ai_summary || null,
          aiProcessedAt: doc.ai_processed_at || null
        }));
        setDocuments(backendDocuments);
      }
    } catch (err: any) {
      console.error('Failed to load library data:', err);
      setError(err.message || 'Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name,
  }));

  const handleUpload = async (name: string, categoryId: string, file: File | null) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', name);
      
      // If a specific category is selected (not 'all'), send the category_id
      if (categoryId !== 'all') {
        formData.append('category_id', categoryId);
      }

      const response = await apiClient.uploadDocument(formData);

      if (response.success) {
        // Add the new document to the local state
        const newDocument: Document = {
          id: response.data.document.id,
          name: response.data.document.title,
          categoryId: response.data.document.category_id || 'other',
          createdAt: new Date(response.data.document.created_at),
          url: response.data.document.file_url,
          type: 'file'
        };

        setDocuments(prev => [...prev, newDocument]);
        console.log('Document uploaded successfully!', response.message);
      }
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      setError(err.message || 'Failed to upload document');
    }
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim()) return;

    try {
      const response = await apiClient.createNote({
        title: noteTitle,
        content: noteContent,
        category_name: 'Other', // Use 'Other' category for notes
        tags: ['note']
      });

      if (response.success) {
        // Add the new note to the local state
        const newNote: Document = {
          id: response.document.id,
          name: response.document.title,
          categoryId: response.document.category_id || 'other',
          createdAt: new Date(response.document.created_at),
          content: response.document.content,
          type: 'note'
        };

        setDocuments(prev => [...prev, newNote]);
        setNoteTitle('');
        setNoteContent('');
        setShowNoteModal(false);

        // Show success message
        console.log('Note created successfully!', response.message);
      }
    } catch (err: any) {
      console.error('Failed to create note:', err);
      setError(err.message || 'Failed to create note');
    }
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
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <DocumentUpload 
            categories={categoryOptions} 
            onUpload={handleUpload} 
          />
          <button
            onClick={() => setShowNoteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Create Note
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <CategoryList 
              categories={categories} 
              activeCategory={activeCategory}
              onCategoryClick={setActiveCategory}
            />
          </div>
          <div className="md:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RotateCcw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading documents...</span>
              </div>
            ) : (
              <DocumentList 
                title="All Documents" 
                documents={filteredDocuments}
                onDocumentClick={handleDocumentClick}
              />
            )}
          </div>
        </div>

        {/* Create Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Create New Note
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Title
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Enter note title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Content
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write your note here..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateNote}
                  disabled={!noteTitle.trim()}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Note
                </button>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteTitle('');
                    setNoteContent('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;