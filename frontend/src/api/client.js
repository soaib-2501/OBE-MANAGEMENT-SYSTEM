import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE_URL });

let isRefreshing = false;
let waiters = [];

function clearAuthStorage() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('obe_user');
}

function flushWaiters(error, token) {
  waiters.forEach((cb) => cb(error, token));
  waiters = [];
}

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isPublicAuth = url.includes('/auth/login/')
    || url.includes('/auth/signup/')
    || url.includes('/auth/refresh/');
  if (isPublicAuth) return config;
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      clearAuthStorage();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    original._retry = true;
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiters.push((err, token) => {
          if (err) {
            reject(err);
            return;
          }
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }
    isRefreshing = true;
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      flushWaiters(null, data.access);
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);
    } catch (refreshError) {
      flushWaiters(refreshError, null);
      clearAuthStorage();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
