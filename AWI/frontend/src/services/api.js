import axios from 'axios';

// Create axios instance with default config
// VITE_API_URL is set via .env files:
// - .env.development: http://localhost:5000/api (for local dev)
// - .env.production: /api (for same-domain deployment)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API configuration (helpful for debugging)
if (import.meta.env.DEV) {
  console.log('🔌 API Base URL:', baseURL);
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed in the future
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
    // Handle errors globally
    const message = error.response?.data?.error || error.message || 'Something went wrong';

    // You can add toast notifications here
    console.error('API Error:', message);

    return Promise.reject(error);
  }
);

export default api;