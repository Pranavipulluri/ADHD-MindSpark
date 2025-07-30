import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  username: string;
  created_at: string;
}

const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { isConnected, sendMessage: sendWSMessage } = useWebSocketStore();

  useEffect(() => {
    // Load initial messages from your backend API
    // This is a placeholder - you can implement this later
    setMessages([
      {
        id: '1',
        content: 'Welcome to MindSpark Chat!',
        username: 'System',
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      await sendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-1">
        <Card>
          <h3 className="text-xl font-bold mb-4">Communities</h3>
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  currentRoom === room.id
                    ? 'bg-purple-100 text-purple-600'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setCurrentRoom(room.id)}
              >
                {room.name}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="col-span-3">
        <Card className="flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 ${
                  msg.user_id === user?.id ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block max-w-[70%] rounded-lg p-3 ${
                    msg.user_id === user?.id
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-gray-100'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {msg.profiles?.username || 'Anonymous'}
                  </p>
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!user}
            />
            <Button
              type="submit"
              disabled={!message.trim() || !user}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Chat;