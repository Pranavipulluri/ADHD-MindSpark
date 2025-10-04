import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/layout/Navbar';
import NotificationSystem from './components/ui/NotificationSystem';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Library from './pages/Library';
import Specialists from './pages/Specialists';
import Tasks from './pages/Tasks';

function App() {
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/games" element={<Games />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/library" element={<Library />} />
            <Route path="/specialists" element={<Specialists />} />
            <Route path="/community" element={<Community />} />
          </Routes>
        </div>
        <NotificationSystem />
      </div>
    </Router>
  );
}

export default App;