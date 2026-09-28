import axios from 'axios';

const client = axios.create({
  baseURL: '/api'
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
