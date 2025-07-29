import React from 'react';
import Card from '../ui/Card';
import { FileText, Folder, Download } from 'lucide-react';
import { Document } from '../../types';

interface DocumentListProps {
  title: string;
  documents: Document[];
  onDocumentClick: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  title, 
  documents, 
  onDocumentClick 
}) => {
  return (
    <Card>
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      
      {documents.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          No documents found
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              className="p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-between cursor-pointer border border-gray-100"
              onClick={() => onDocumentClick(doc)}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium">{doc.name}</h3>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <Download className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default DocumentList;