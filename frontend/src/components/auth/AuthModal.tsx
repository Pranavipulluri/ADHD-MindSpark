import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

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
          parentEmail: email // Use same email for now
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