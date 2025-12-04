import { Brain, Calendar, CheckSquare, Gamepad2, LibraryBig, LogOut, Menu, MessageCircle, Trophy, User, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePointsStore } from '../../stores/usePointsStore';
import { NavItem } from '../../types';
import AuthModal from '../auth/AuthModal';
import ProfileModal from '../profile/ProfileModal';
import Button from '../ui/Button';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { totalPoints, level } = usePointsStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get user role from localStorage
  const getUserRole = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return userData.role || 'student';
      } catch {
        return 'student';
      }
    }
    return 'student';
  };
  
  const userRole = getUserRole();
  
  // Different nav items based on role
  const getNavItems = (): NavItem[] => {
    if (userRole === 'mentor') {
      // Mentors only see Dashboard
      return [
        { name: 'Dashboard', path: '/mentor', icon: 'Brain' },
      ];
    } else if (userRole === 'ngo') {
      // NGOs only see Dashboard
      return [
        { name: 'Dashboard', path: '/ngo', icon: 'Brain' },
      ];
    } else {
      // Students see all pages
      return [
        { name: 'Dashboard', path: '/', icon: 'Brain' },
        { name: 'Games', path: '/games', icon: 'Gamepad2' },
        { name: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
        { name: 'Library', path: '/library', icon: 'LibraryBig' },
        { name: 'Specialists', path: '/specialists', icon: 'Users' },
        { name: 'Workshops', path: '/workshops', icon: 'Calendar' },
        { name: 'Community', path: '/community', icon: 'MessageCircle' },
      ];
    }
  };
  
  const navItems = getNavItems();
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-5 h-5" />;
      case 'Gamepad2': return <Gamepad2 className="w-5 h-5" />;
      case 'CheckSquare': return <CheckSquare className="w-5 h-5" />;
      case 'LibraryBig': return <LibraryBig className="w-5 h-5" />;
      case 'Users': return <Users className="w-5 h-5" />;
      case 'Calendar': return <Calendar className="w-5 h-5" />;
      case 'MessageCircle': return <MessageCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <nav className="bg-white py-3 px-6 shadow-sm fixed top-0 left-0 w-full z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-purple-600">MindSpark</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-4">
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
            <div className="flex items-center space-x-3 ml-4">
              {/* Points Display - Only for students */}
              {userRole === 'student' && (
                <>
                  <div className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    <Trophy className="w-4 h-4" />
                    <span className="font-semibold text-sm">{totalPoints || 0}</span>
                    <span className="text-xs">pts</span>
                  </div>
                  
                  {/* Level Display */}
                  <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium">Lv.{level || 1}</span>
                  </div>
                </>
              )}
              
              {/* Profile Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileModal(true)}
                leftIcon={<User className="w-4 h-4" />}
              >
                Profile
              </Button>
              
              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              className="ml-4"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-md hover:bg-purple-50"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-purple-600" />
          ) : (
            <Menu className="w-6 h-6 text-purple-600" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100">
          <div className="px-4 py-3 space-y-2 max-h-[80vh] overflow-y-auto">
            {/* Mobile Navigation Items */}
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-300 ${
                    isActive 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'text-gray-500 hover:bg-purple-50 hover:text-purple-500'
                  }`}
                >
                  {getIcon(item.icon)}
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            {user && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                
                {/* Points and Level - Only for students */}
                {userRole === 'student' && (
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-3 py-2 rounded-full">
                      <Trophy className="w-4 h-4" />
                      <span className="font-semibold">{totalPoints || 0}</span>
                      <span className="text-sm">pts</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-full">
                      <span className="font-medium">Level {level || 1}</span>
                    </div>
                  </div>
                )}
                
                {/* Profile Button */}
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg flex items-center space-x-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>
                
                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg flex items-center space-x-3 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </>
            )}

            {!user && (
              <Button
                className="w-full mt-2"
                onClick={() => {
                  setShowAuthModal(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {showProfileModal && (
        <ProfileModal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </nav>
  );
};

export default Navbar;