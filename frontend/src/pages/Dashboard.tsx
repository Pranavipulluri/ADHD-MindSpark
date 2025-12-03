import { Bot, Calendar, FileText, MapPin, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AIChatbot } from '../components/ai/AIChatbot';
import CalmingTools from '../components/dashboard/CalmingTools';
import Header from '../components/dashboard/Header';
import MoodTracker from '../components/dashboard/MoodTracker';
import QuickActions from '../components/dashboard/QuickActions';
import { DocumentProcessor } from '../components/documents/DocumentProcessor';

interface Workshop {
  id: string;
  title: string;
  description: string;
  scheduled_date: string;
  location: string;
  max_participants: number;
  current_participants: number;
  organizer_name: string;
  is_registered: boolean;
}

const Dashboard: React.FC = () => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [showDocProcessor, setShowDocProcessor] = useState(false);
  const [upcomingWorkshops, setUpcomingWorkshops] = useState<Workshop[]>([]);

  useEffect(() => {
    fetchUpcomingWorkshops();
  }, []);

  const fetchUpcomingWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/workshops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        // Show only next 3 upcoming workshops
        setUpcomingWorkshops(data.workshops.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching workshops:', error);
    }
  };

  const handleQuickRegister = async (workshopId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/workshops/${workshopId}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUpcomingWorkshops();
        alert('Successfully registered for workshop!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to register');
      }
    } catch (error) {
      console.error('Error registering:', error);
      alert('Failed to register for workshop');
    }
  };

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

        {/* Upcoming Workshops Section */}
        {upcomingWorkshops.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Upcoming Workshops</h2>
              <Link 
                to="/workshops" 
                className="text-purple-200 hover:text-white transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {upcomingWorkshops.map((workshop) => {
                const isFull = workshop.current_participants >= workshop.max_participants;
                return (
                  <div key={workshop.id} className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow">
                    <h3 className="font-bold text-gray-800 mb-2">{workshop.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{workshop.description}</p>
                    
                    <div className="space-y-1 mb-3 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(workshop.scheduled_date).toLocaleDateString()} at{' '}
                        {new Date(workshop.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {workshop.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        {workshop.current_participants}/{workshop.max_participants} joined
                      </div>
                    </div>

                    {workshop.is_registered ? (
                      <div className="text-center py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                        ✓ Registered
                      </div>
                    ) : isFull ? (
                      <div className="text-center py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                        Workshop Full
                      </div>
                    ) : (
                      <button
                        onClick={() => handleQuickRegister(workshop.id)}
                        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                      >
                        Register Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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