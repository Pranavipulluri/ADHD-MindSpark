import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  // For demo purposes, create a guest user if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      // Create a guest user for demo
      const guestUser = {
        id: 'guest-user',
        email: 'guest@mindspark.com',
        username: 'Guest User',
        points: 0,
        level: 1
      };
      
      useAuthStore.getState().updateUser(guestUser);
    }
  }, [isAuthenticated, user]);

  return <>{children}</>;
};