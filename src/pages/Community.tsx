import React from 'react';
import Header from '../components/dashboard/Header';
import Chat from '../components/community/Chat';

const Community: React.FC = () => {
  return (
    <div className="py-8">
      <Header 
        title="Connect & Share" 
        subtitle="Chat with peers who understand what you're going through" 
      />
      
      <div className="max-w-7xl mx-auto px-4">
        <Chat />
      </div>
    </div>
  );
};

export default Community;