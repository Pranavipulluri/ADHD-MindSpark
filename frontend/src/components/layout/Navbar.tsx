import React, { useState } from 'react';
import { NavItem } from '../../types';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Gamepad2, CheckSquare, LibraryBig, Users, MessageCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import AuthModal from '../auth/AuthModal';
import Button from '../ui/Button';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: 'Brain' },
    { name: 'Games', path: '/games', icon: 'Gamepad2' },
    { name: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
    { name: 'Library', path: '/library', icon: 'LibraryBig' },
    { name: 'Specialists', path: '/specialists', icon: 'Users' },
    { name: 'Community', path: '/community', icon: 'MessageCircle' },
  ];
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-5 h-5" />;
      case 'Gamepad2': return <Gamepad2 className="w-5 h-5" />;
      case 'CheckSquare': return <CheckSquare className="w-5 h-5" />;
      case 'LibraryBig': return <LibraryBig className="w-5 h-5" />;
      case 'Users': return <Users className="w-5 h-5" />;
      case 'MessageCircle': return <MessageCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <nav className="bg-white py-3 px-6 shadow-sm fixed top-0 left-0 w-full z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-purple-600">MindSpark</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.name}
                to={item.path}
                className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all duration-300 ${
                  isActive 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'text-gray-500 hover:bg-purple-50 hover:text-purple-500'
                }`}
              >
                {getIcon(item.icon)}
                <span>{item.name}</span>
              </Link>
            );
          })}

          {user ? (
            <Button
              variant="outline"
              className="ml-4"
              onClick={() => logout()}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              className="ml-4"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </nav>
  );
};

export default Navbar;