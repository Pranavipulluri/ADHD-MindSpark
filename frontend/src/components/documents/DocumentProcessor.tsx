import { BookOpen, Brain, Download, FileText, Lightbulb, RefreshCw, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { usePointsStore } from '../../stores/usePointsStore';

interface DocumentProcessorProps {
  onClose: () => void;
}

interface ProcessedDocument {
  id: string;
  name: string;
  content: string;
  summary: string;
  flashcards: { question: string; answer: string }[];
  quiz: { question: string; options: string[]; correct: number }[];
  keyPoints: string[];
  timestamp: Date;
}

interface StoredDocument {
  id: number;
  title: string;
  file_url: string;
  ai_summary: any;
  ai_processed_at: string;
  created_at: string;
}

export const DocumentProcessor: React.FC<DocumentProcessorProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'keypoints'>('summary');
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const { addPoints } = usePointsStore();

  // Load stored documents on component mount
  useEffect(() => {
    loadStoredDocuments();
  }, []);

  const loadStoredDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents`, {
        headers: {
          'Authorization': 'Bearer demo-token-123',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoredDocuments(data.data?.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const loadStoredDocument = (doc: StoredDocument) => {
    if (!doc.ai_summary) {
      alert('This document has not been AI processed yet.');
      return;
    }

    const aiSummary = typeof doc.ai_summary === 'string' ? 
      JSON.parse(doc.ai_summary) : doc.ai_summary;

    const processed: ProcessedDocument = {
      id: doc.id.toString(),
      name: doc.title,
      content: aiSummary.originalContent || 'Content not available',
      summary: aiSummary.summary || 'Summary not available',
      flashcards: aiSummary.flashcards || [],
      quiz: aiSummary.quiz || [],
      keyPoints: aiSummary.keyPoints || [],
      timestamp: new Date(doc.ai_processed_at)
    };

    setProcessedDoc(processed);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProcessedDoc(null);
    }
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSummary = (text: string): string => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const importantSentences = sentences
      .slice(0, Math.min(5, Math.ceil(sentences.length * 0.3)))
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return importantSentences.join('. ') + (importantSentences.length > 0 ? '.' : '');
  };

  const generateFlashcards = (text: string): { question: string; answer: string }[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const flashcards: { question: string; answer: string }[] = [];
    
    // Simple pattern matching for creating flashcards
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.includes(' is ') || trimmed.includes(' are ') || trimmed.includes(' was ') || trimmed.includes(' were ')) {
        const parts = trimmed.split(/ (is|are|was|were) /);
        if (parts.length >= 2) {
          flashcards.push({
            question: `What ${parts[1].split(' ')[0]} ${parts[0]}?`,
            answer: parts.slice(1).join(' ')
          });
        }
      }
    });

    // Add some generic question patterns
    const words = text.split(/\s+/).filter(w => w.length > 5);
    const uniqueWords = [...new Set(words)].slice(0, 5);
    
    uniqueWords.forEach(word => {
      flashcards.push({
        question: `Define or explain: ${word}`,
        answer: `${word} - (Context from document)`
      });
    });

    return flashcards.slice(0, 8); // Limit to 8 flashcards
  };

  const generateQuiz = (text: string): { question: string; options: string[]; correct: number }[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const quiz: { question: string; options: string[]; correct: number }[] = [];
    
    // Generate simple fill-in-the-blank questions
    sentences.slice(0, 5).forEach((sentence, index) => {
      const words = sentence.trim().split(' ');
      if (words.length > 5) {
        const keyWordIndex = Math.floor(words.length / 2);
        const keyWord = words[keyWordIndex];
        const questionText = words.map((w, i) => i === keyWordIndex ? '____' : w).join(' ');
        
        const wrongOptions = ['Option A', 'Option B', 'Option C'].slice(0, 3);
        const allOptions = [keyWord, ...wrongOptions];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        const correctIndex = shuffled.indexOf(keyWord);
        
        quiz.push({
          question: `Fill in the blank: ${questionText}`,
          options: shuffled,
          correct: correctIndex
        });
      }
    });

    return quiz.slice(0, 5); // Limit to 5 questions
  };

  const extractKeyPoints = (text: string): string[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints: string[] = [];
    
    // Look for sentences with key indicators
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (
        trimmed.includes('important') ||
        trimmed.includes('key') ||
        trimmed.includes('main') ||
        trimmed.includes('significant') ||
        trimmed.includes('essential') ||
        trimmed.length > 50
      ) {
        keyPoints.push(trimmed);
      }
    });

    // If no key indicators found, take first few sentences
    if (keyPoints.length === 0) {
      keyPoints.push(...sentences.slice(0, 5).map(s => s.trim()));
    }

    return keyPoints.slice(0, 6); // Limit to 6 key points
  };

  const processDocument = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    
    try {
      // Upload file and process with real AI
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer demo-token-123'
        },
        body: formData
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', response.headers);

      if (response.ok) {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (!responseText) {
          alert('Document uploaded successfully! AI processing may take a moment.');
          await loadStoredDocuments();
          return;
        }

        try {
          const result = JSON.parse(responseText);
          addPoints(25, 'Document Processing', `Processed document: ${selectedFile.name}`);
          
          // Reload the documents list to get the new processed document
          await loadStoredDocuments();
          
          // Auto-select the newly uploaded document if it has AI summary
          const newDoc = result.data?.document;
          if (newDoc && newDoc.ai_summary) {
            loadStoredDocument(newDoc);
          } else {
            alert('Document uploaded successfully! AI processing may take a moment.');
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          alert('Document uploaded but response format error. Please refresh to see your document.');
          await loadStoredDocuments();
        }
      } else {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        try {
          const error = JSON.parse(errorText);
          alert(error.message || 'Error uploading document');
        } catch {
          alert(`Error uploading document: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Error processing document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Document Processor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!processedDoc ? (
          <div className="space-y-6">
            {/* Stored Documents Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-800">Your Processed Documents</h3>
                <button
                  onClick={loadStoredDocuments}
                  disabled={isLoadingDocuments}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDocuments ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {isLoadingDocuments ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-blue-600">Loading documents...</p>
                </div>
              ) : storedDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {storedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => loadStoredDocument(doc)}
                      className="bg-white border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{doc.title}</h4>
                          <p className="text-sm text-gray-600">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                          {doc.ai_processed_at && (
                            <p className="text-sm text-green-600">
                              ✅ AI Processed: {new Date(doc.ai_processed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.ai_summary && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Ready
                            </span>
                          )}
                          <Brain className="w-4 h-4 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-blue-600 text-center py-4">
                  No processed documents yet. Upload a document below to get started!
                </p>
              )}
            </div>

            {/* Upload New Document Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Upload a New Document</h3>
              <p className="text-gray-500 mb-4">
                Upload a document to generate AI-powered summaries, flashcards, and quizzes
              </p>
              <input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 cursor-pointer inline-block"
              >
                Choose File
              </label>
            </div>

            {selectedFile && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800">{selectedFile.name}</h4>
                    <p className="text-sm text-gray-600">
                      Size: {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={processDocument}
                    disabled={isProcessing}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Process Document
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">What you'll get:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Real AI-powered document summary</li>
                  <li>• Interactive flashcards from content</li>
                  <li>• Auto-generated quiz questions</li>
                  <li>• Key points extraction</li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Supported formats:</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Plain text files (.txt) ✅</li>
                  <li>• Markdown files (.md) ✅</li>
                  <li>• PDF files (.pdf) ✅ Real content extraction</li>
                  <li>• Word documents (.doc, .docx) 🚧 Coming soon</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800">{processedDoc.name}</h3>
              <p className="text-sm text-gray-600">
                Processed on {processedDoc.timestamp.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2 border-b border-gray-200">
              {[
                { key: 'summary', label: 'Summary', icon: FileText },
                { key: 'flashcards', label: 'Flashcards', icon: BookOpen },
                { key: 'quiz', label: 'Quiz', icon: Brain },
                { key: 'keypoints', label: 'Key Points', icon: Lightbulb }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-[300px]">
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Document Summary</h3>
                    <button
                      onClick={() => downloadContent(processedDoc.summary, `${processedDoc.name}_summary.txt`)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed">{processedDoc.summary}</p>
                  </div>
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Flashcards</h3>
                    <span className="text-sm text-gray-600">{processedDoc.flashcards.length} cards</span>
                  </div>
                  <div className="grid gap-4">
                    {processedDoc.flashcards.map((card, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="mb-2">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                            Card {index + 1}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-medium text-gray-800">Question:</h4>
                            <p className="text-gray-700">{card.question}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">Answer:</h4>
                            <p className="text-gray-700">{card.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Quiz Questions</h3>
                    <span className="text-sm text-gray-600">{processedDoc.quiz.length} questions</span>
                  </div>
                  <div className="grid gap-4">
                    {processedDoc.quiz.map((question, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="mb-2">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            Question {index + 1}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-800">{question.question}</h4>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`p-2 rounded border ${
                                  optIndex === question.correct
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {optIndex === question.correct && (
                                  <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'keypoints' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Key Points</h3>
                    <button
                      onClick={() => downloadContent(processedDoc.keyPoints.join('\n\n'), `${processedDoc.name}_keypoints.txt`)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                  <div className="space-y-3">
                    {processedDoc.keyPoints.map((point, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};