import { Route, BrowserRouter as Router, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import Navbar from './components/layout/Navbar';
import NotificationSystem from './components/ui/NotificationSystem';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Library from './pages/Library';
import Specialists from './pages/Specialists';
import Tasks from './pages/Tasks';
import MentorDashboard from './pages/MentorDashboard';
import NGODashboard from './pages/NGODashboard';

function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user role from localStorage or API
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserRole(user.role || 'student');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUserRole('student');
      }
    } else {
      setUserRole('student'); // Default to student if not logged in
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Role-based dashboard routing
  const getDefaultRoute = () => {
    switch (userRole) {
      case 'mentor':
        return <Navigate to="/mentor" replace />;
      case 'ngo':
        return <Navigate to="/ngo" replace />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen bg-purple-500">
        <Navbar />
        <div className="pt-16"> {/* Add padding to account for fixed navbar */}
          <Routes>
            {/* Student Routes */}
            <Route path="/" element={getDefaultRoute()} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/games" element={<Games />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/library" element={<Library />} />
            <Route path="/specialists" element={<Specialists />} />
            <Route path="/community" element={<Community />} />

            {/* Mentor Route */}
            <Route
              path="/mentor"
              element={
                userRole === 'mentor' ? (
                  <MentorDashboard />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* NGO Route */}
            <Route
              path="/ngo"
              element={
                userRole === 'ngo' ? (
                  <NGODashboard />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <NotificationSystem />
      </div>
    </Router>
  );
}

export default App;