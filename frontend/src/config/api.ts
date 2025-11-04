// API Configuration
const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001/api'
  : import.meta.env.VITE_API_URL || 'https://your-backend-url.railway.app/api';

export const WS_URL = isDevelopment
  ? 'ws://localhost:3001'
  : import.meta.env.VITE_WS_URL || 'wss://your-backend-url.railway.app';

console.log('API Mode:', isDevelopment ? 'Development' : 'Production');
console.log('API URL:', API_BASE_URL);
