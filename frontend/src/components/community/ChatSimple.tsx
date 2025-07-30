import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useWebSocketStore } from '../../stores/useWebSocketStore';

const Chat: React.FC = () => {
  const { user } = useAuthStore();
  const { isConnected } = useWebSocketStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    // For now, just add to local state
    const newMessage = {
      id: Date.now().toString(),
      content: message,
      user_id: user.id,
      username: user.username,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Please sign in to join the chat</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Community Chat</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="border rounded-lg h-96 mb-4 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-3 ${msg.user_id === user?.id ? 'text-right' : ''}`}
            >
              <div
                className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                  msg.user_id === user?.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-white border'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {msg.username || 'Anonymous'}
                </div>
                <div>{msg.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
