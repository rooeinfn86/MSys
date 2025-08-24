import axios from 'axios';
import { tokenManager } from './secureStorage';

// Use environment variable for API base URL with fallback
const rawBaseUrl = process.env.REACT_APP_BACKEND_URL || 'https://cisco-ai-backend-production.up.railway.app';
const API_BASE_URL = rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    
    if (token && tokenManager.isValidToken(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token) {
      // Token is invalid, remove it
      tokenManager.removeToken();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log error without exposing sensitive data
    if (error.response?.status) {
      console.error(`API Error ${error.response.status}: ${error.config?.url}`);
    }

    if (error.response?.status === 401) {
      // Clear all secure data on unauthorized
      tokenManager.clearAll();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 