import { Bot, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { AIChatbot } from '../components/ai/AIChatbot';
import CalmingTools from '../components/dashboard/CalmingTools';
import Header from '../components/dashboard/Header';
import MoodTracker from '../components/dashboard/MoodTracker';
import QuickActions from '../components/dashboard/QuickActions';
import { DocumentProcessor } from '../components/documents/DocumentProcessor';

const Dashboard: React.FC = () => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [showDocProcessor, setShowDocProcessor] = useState(false);

  return (
    <div className="py-8">
      <Header 
        title="MindSpark" 
        subtitle="Your amazing journey to feeling awesome starts here!" 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <MoodTracker />
        
        {/* New AI Features Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">AI Learning Tools</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div 
              onClick={() => setShowChatbot(true)}
              className="bg-white rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">AI Learning Buddy</h3>
                  <p className="text-gray-600">Chat with your friendly AI tutor about anything!</p>
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => setShowDocProcessor(true)}
              className="bg-white rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Document Helper</h3>
                  <p className="text-gray-600">Turn documents into summaries, flashcards & quizzes!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CalmingTools />
        <QuickActions />
      </div>

      {/* AI Chatbot Modal */}
      {showChatbot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 h-[600px] flex flex-col">
            <AIChatbot />
            <div className="p-4 border-t">
              <button
                onClick={() => setShowChatbot(false)}
                className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Close Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Processor Modal */}
      {showDocProcessor && (
        <DocumentProcessor onClose={() => setShowDocProcessor(false)} />
      )}
    </div>
  );
};

export default Dashboard;