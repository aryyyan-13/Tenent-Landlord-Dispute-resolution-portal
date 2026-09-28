import axios from 'axios';

// ponytail: VITE_API_URL is set in Vercel env vars; falls back to '' for dev (Vite proxy handles /api)
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
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
      localStorage.removeItem('tldrp_token');
      localStorage.removeItem('tldrp_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
