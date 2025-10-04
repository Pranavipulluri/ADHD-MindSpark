import { Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatStore } from '../../stores/useChatStore';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface ChatMessage {
  id: string;
  content: string;
  username: string;
  created_at: string;
}

const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { isConnected, sendMessage: sendWSMessage } = useWebSocketStore();
  const { 
    messages, 
    rooms, 
    currentRoom, 
    setCurrentRoom, 
    loadRooms, 
    loadMessages, 
    sendMessage: sendChatMessage,
    joinRoom 
  } = useChatStore();

  // Mock user for testing if no user is logged in
  const currentUser = user || { 
    id: 'guest', 
    username: 'Guest User', 
    email: 'guest@example.com' 
  };

  const currentMessages = messages[currentRoom] || [];

  useEffect(() => {
    // Load rooms on component mount
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    // Load messages when room changes
    if (currentRoom) {
      loadMessages(currentRoom);
    }
  }, [currentRoom, loadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageText = message;
    setMessage(''); // Clear immediately to prevent double send
    
    try {
      await sendChatMessage(currentRoom, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText); // Restore message on error
    }
  };

  const handleRoomChange = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room && !room.is_member) {
      await joinRoom(roomId);
    }
    setCurrentRoom(roomId);
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
                onClick={() => handleRoomChange(room.id)}
              >
                <div className="flex justify-between items-center">
                  <span>{room.name}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">{room.participant_count}</span>
                    {!room.is_member && (
                      <span className="text-xs text-blue-500">Join</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="col-span-3">
        <Card className="flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto mb-4">
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 ${
                  msg.username === currentUser?.username ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block max-w-[70%] rounded-lg p-3 ${
                    msg.username === currentUser?.username
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-gray-100'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {msg.username}
                  </p>
                  <p>{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
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
            />
            <Button
              type="submit"
              disabled={!message.trim()}
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