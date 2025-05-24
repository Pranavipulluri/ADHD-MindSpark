import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Tasks from './pages/Tasks';
import Library from './pages/Library';
import Specialists from './pages/Specialists';
import Community from './pages/Community';
import './App.css';

function App() {
  return (
    <Router>
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
      </div>
    </Router>
  );
}

export default App;