import React from 'react';
import Header from '../components/dashboard/Header';
import MoodTracker from '../components/dashboard/MoodTracker';
import CalmingTools from '../components/dashboard/CalmingTools';
import QuickActions from '../components/dashboard/QuickActions';

const Dashboard: React.FC = () => {
  return (
    <div className="py-8">
      <Header 
        title="MindSpark" 
        subtitle="Your amazing journey to feeling awesome starts here!" 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <MoodTracker />
        <CalmingTools />
        <QuickActions />
      </div>
    </div>
  );
};

export default Dashboard;