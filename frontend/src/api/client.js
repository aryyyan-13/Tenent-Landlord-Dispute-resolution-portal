import axios from 'axios';
import { authActions } from '../context/AuthContext.jsx';

// Normalize VITE_API_URL: strip trailing slashes and ensure clean /api prefix
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const baseURL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

const client = axios.create({
  baseURL
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('tldrp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401) {
      // Use React state logout (no hard page reload) so React Router handles
      // the redirect cleanly — prevents the flash-then-bounce loop.
      if (authActions.clearSession) {
        authActions.clearSession();
      } else {
        // Fallback before AuthProvider mounts (shouldn't normally happen)
        localStorage.removeItem('tldrp_token');
        localStorage.removeItem('tldrp_user');
      }
    }
    return Promise.reject(err);
  }
);

export default client;

