import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [role, setRole] = useState<'student' | 'mentor' | 'ngo'>('student');
  const [error, setError] = useState('');
  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        // For now, use simplified registration
        await register({
          username: email.split('@')[0], // Use email prefix as username
          email,
          password,
          dateOfBirth: '2000-01-01', // Default date
          parentEmail: email, // Use same email for now
          role // Include role in registration
        });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isSignUp && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a:
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === 'student'}
                    onChange={(e) => setRole(e.target.value as 'student' | 'mentor' | 'ngo')}
                    className="mr-3 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-semibold text-purple-800">Student</span>
                    <p className="text-sm text-gray-600">Access learning materials and track progress</p>
                  </div>
                </label>

                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="mentor"
                    checked={role === 'mentor'}
                    onChange={(e) => setRole(e.target.value as 'student' | 'mentor' | 'ngo')}
                    className="mr-3 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-semibold text-purple-800">Mentor/Specialist</span>
                    <p className="text-sm text-gray-600">Guide students and manage appointments</p>
                  </div>
                </label>

                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value="ngo"
                    checked={role === 'ngo'}
                    onChange={(e) => setRole(e.target.value as 'student' | 'mentor' | 'ngo')}
                    className="mr-3 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-semibold text-purple-800">NGO/Organization</span>
                    <p className="text-sm text-gray-600">Organize workshops and help communities</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <Button type="submit" className="w-full mb-4">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          <p className="text-center text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="text-purple-600 hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default AuthModal;