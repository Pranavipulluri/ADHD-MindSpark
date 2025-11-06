import {
    ArrowLeft,
    BarChart3,
    Chrome,
    Download,
    ExternalLink,
    Globe,
    Settings,
    Smartphone
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExtensionIntegration from '../components/extension/ExtensionIntegration';

interface ExtensionStats {
  totalUsage: number;
  pagesProcessed: number;
  gamesPlayed: number;
  pointsEarned: number;
  averageSessionTime: number;
}

const ExtensionPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ExtensionStats>({
    totalUsage: 0,
    pagesProcessed: 0,
    gamesPlayed: 0,
    pointsEarned: 0,
    averageSessionTime: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadExtensionStats();
    loadRecentActivity();
  }, []);

  const loadExtensionStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/extension/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load extension stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/extension/activity?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities);
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  };

  const formatActivityType = (type: string) => {
    const typeMap: { [key: string]: { label: string; icon: string; color: string } } = {
      'page_summary': { label: 'Page Summary', icon: '📝', color: 'text-blue-600' },
      'dyslexia_mode': { label: 'Dyslexia Mode', icon: '👁️', color: 'text-green-600' },
      'memory_game': { label: 'Memory Game', icon: '🧩', color: 'text-purple-600' },
      'focus_game': { label: 'Focus Game', icon: '🎯', color: 'text-red-600' },
      'breathing_exercise': { label: 'Breathing Exercise', icon: '🫁', color: 'text-teal-600' },
      'tts_usage': { label: 'Text-to-Speech', icon: '🔊', color: 'text-orange-600' },
      'reading_time': { label: 'Reading Time', icon: '📚', color: 'text-indigo-600' }
    };
    
    return typeMap[type] || { label: type, icon: '⚡', color: 'text-gray-600' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Chrome className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Browser Extension</h1>
                  <p className="text-sm text-gray-600">Manage your extension settings and view usage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Extension Integration */}
            <ExtensionIntegration />

            {/* Usage Statistics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Usage Statistics</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalUsage}</div>
                  <div className="text-sm text-blue-700">Total Sessions</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.pagesProcessed}</div>
                  <div className="text-sm text-green-700">Pages Processed</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.gamesPlayed}</div>
                  <div className="text-sm text-purple-700">Games Played</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.pointsEarned}</div>
                  <div className="text-sm text-orange-700">Points Earned</div>
                </div>
              </div>

              {stats.averageSessionTime > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Session Time</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {Math.round(stats.averageSessionTime)} minutes
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Showcase */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Extension Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Universal Access</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Use MindSpark features on any website you visit
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Cross-Device Sync</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your preferences and progress sync across all devices
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Real-time Analytics</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Track your learning progress and achievements
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Customizable</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Personalize settings to match your learning style
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <Download className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Download Extension</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Extension Settings</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => {
                    const activityInfo = formatActivityType(activity.activity_type);
                    return (
                      <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                        <span className="text-lg">{activityInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${activityInfo.color}`}>
                            {activityInfo.label}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {activity.page_url || 'Extension activity'}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">📊</div>
                    <p className="text-sm text-gray-500">No recent activity</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Install the extension to start tracking
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Help & Support</h3>
              
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-blue-600 hover:text-blue-800">
                  📖 Installation Guide
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-800">
                  🔧 Troubleshooting
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-800">
                  💬 Contact Support
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-800">
                  🐛 Report a Bug
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionPage;