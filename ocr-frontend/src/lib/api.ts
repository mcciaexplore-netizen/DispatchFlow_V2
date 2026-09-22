import axios from 'axios';
import { useSessionStore } from '../store/sessionStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_OCR_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().jwtToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper for responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useSessionStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
