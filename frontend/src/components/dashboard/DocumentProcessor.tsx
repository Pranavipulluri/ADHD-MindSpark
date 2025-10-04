import { Brain, CheckCircle, Clock, Download, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';

interface DocumentProcessorProps {
  documentId?: string;
  onClose: () => void;
}

interface AIProcessingResult {
  summary: string;
  keyPoints: string[];
  concepts: string[];
  importance?: string;
  processedBy: string;
  timestamp: string;
  flashcards?: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  quiz?: Array<{
    question: string;
    type: string;
    concept: string;
  }>;
}

interface Document {
  id: string;
  title: string;
  file_url?: string;
  content?: string;
  ai_summary?: AIProcessingResult;
  ai_processed_at?: string;
  created_at: string;
}

const DocumentProcessor: React.FC<DocumentProcessorProps> = ({ documentId, onClose }) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'keypoints'>('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDocuments();
      if (response.success) {
        const foundDoc = response.data.documents.find((doc: any) => doc.id === documentId);
        if (foundDoc) {
          setDocument(foundDoc);
        } else {
          setError('Document not found');
        }
      } else {
        setError('Failed to load document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const processDocument = async () => {
    if (!document) return;

    try {
      setProcessing(true);
      setError(null);

      // Call AI processing endpoint
      const response = await fetch(`/api/ai/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: document.content,
          type: 'document'
        })
      });

      if (response.ok) {
        const aiResult = await response.json();
        setDocument(prev => prev ? {
          ...prev,
          ai_summary: aiResult,
          ai_processed_at: new Date().toISOString()
        } : null);
      } else {
        setError('Failed to process document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  const downloadSummary = () => {
    if (!document?.ai_summary) return;

    const content = `
Document Summary Report
Generated: ${new Date().toLocaleDateString()}

Title: ${document.title}
Processed by: ${document.ai_summary.processedBy}

SUMMARY:
${document.ai_summary.summary}

KEY POINTS:
${document.ai_summary.keyPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

CONCEPTS:
${document.ai_summary.concepts.join(', ')}

${document.ai_summary.importance ? `IMPORTANCE:\n${document.ai_summary.importance}` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title}_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Loading document...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="text-center py-8">
            <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
            <div className="text-gray-600 mb-4">{error}</div>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const aiSummary = document.ai_summary;
  const hasAIProcessing = aiSummary && Object.keys(aiSummary).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{document.title}</h2>
              <p className="text-sm text-gray-500">
                {hasAIProcessing ? (
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Processed on {new Date(document.ai_processed_at!).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    Not yet processed
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasAIProcessing && (
              <button
                onClick={downloadSummary}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            )}
            {!hasAIProcessing && (
              <button
                onClick={processDocument}
                disabled={processing}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Brain className="h-4 w-4" />
                <span>{processing ? 'Processing...' : 'Process with AI'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!hasAIProcessing ? (
            <div className="p-6 text-center">
              <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">AI Processing Not Available</h3>
              <p className="text-gray-500 mb-4">
                This document hasn't been processed with AI yet. Click "Process with AI" to generate intelligent summaries, key points, and study materials.
              </p>
              {processing && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-purple-600">Processing with AI...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="border-b">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'summary', label: 'Summary', icon: FileText },
                    { id: 'keypoints', label: 'Key Points', icon: CheckCircle },
                    { id: 'flashcards', label: 'Flashcards', icon: Brain },
                    { id: 'quiz', label: 'Quiz', icon: Brain }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                        activeTab === id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Document Summary</h3>
                      <p className="text-gray-700 leading-relaxed">{aiSummary.summary}</p>
                    </div>
                    {aiSummary.importance && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Why This Document Matters</h4>
                        <p className="text-gray-700">{aiSummary.importance}</p>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Processed by: {aiSummary.processedBy}
                    </div>
                  </div>
                )}

                {activeTab === 'keypoints' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Points</h3>
                    <div className="space-y-3">
                      {aiSummary.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-gray-700">{point}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-800 mb-2">Main Concepts</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiSummary.concepts.map((concept, index) => (
                          <span
                            key={index}
                            className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'flashcards' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Study Flashcards</h3>
                    {aiSummary.flashcards && aiSummary.flashcards.length > 0 ? (
                      <div className="grid gap-4">
                        {aiSummary.flashcards.map((card, index) => (
                          <div key={index} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border">
                            <div className="font-semibold text-gray-800 mb-2">Q: {card.question}</div>
                            <div className="text-gray-700">A: {card.answer}</div>
                            <div className="text-xs text-purple-600 mt-2">{card.category}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No flashcards available for this document.</p>
                    )}
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quiz Questions</h3>
                    {aiSummary.quiz && aiSummary.quiz.length > 0 ? (
                      <div className="space-y-4">
                        {aiSummary.quiz.map((question, index) => (
                          <div key={index} className="bg-blue-50 rounded-lg p-4 border">
                            <div className="font-semibold text-gray-800 mb-2">
                              {index + 1}. {question.question}
                            </div>
                            <div className="text-sm text-blue-600">
                              Type: {question.type} | Focus: {question.concept}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No quiz questions available for this document.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessor;