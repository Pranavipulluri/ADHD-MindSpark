import { Bot, Mic, MicOff, Send, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../lib/api';
import { usePointsStore } from '../../stores/usePointsStore';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const AIChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi there! I'm your learning buddy! Ask me anything about math, science, reading, or just chat with me. I'm here to help! 🌟",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addPoints } = usePointsStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simple AI responses for kids
  const generateResponse = async (userInput: string): Promise<string> => {
    try {
      const response = await apiClient.chatWithAI(userInput);
      if (response.success && response.response) {
        return response.response;
      }
    } catch (error) {
      console.error('AI API error:', error);
    }

    // Fallback to local responses if API fails
    const input = userInput.toLowerCase();
    
    if (input.includes('math')) {
      return "Math is so cool! Want to try a fun math game? I can help you practice addition, subtraction, multiplication, or division! 🔢";
    }
    
    if (input.includes('science')) {
      return "Science is amazing! Everything around us follows scientific rules. What are you curious about? 🔬";
    }
    
    if (input.includes('hello') || input.includes('hi')) {
      return "Hello there! I'm so happy to chat with you today! What would you like to learn about? 😊";
    }
    
    return "That's interesting! Tell me more about what you're thinking. I'm here to help you learn and explore! 🤔";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Get AI response
    try {
      const responseText = await generateResponse(input);
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
      addPoints(5, 'ai_chat', 'Asked AI chatbot a question');
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble thinking right now. Can you try asking again? 🤔",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
      <div className="flex items-center gap-3 p-4 bg-white rounded-t-lg border-b border-purple-200">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">Learning Buddy AI</h3>
          <p className="text-sm text-gray-600">Your friendly AI tutor</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            {message.isBot && (
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isBot
                  ? 'bg-white text-gray-800 border border-purple-200'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${message.isBot ? 'text-gray-500' : 'text-purple-100'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!message.isBot && (
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-purple-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white rounded-b-lg border-t border-purple-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about learning..."
            className="flex-1 px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={startListening}
            disabled={isListening || isLoading}
            className={`px-3 py-2 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};