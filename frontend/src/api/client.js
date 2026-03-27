import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

import useAuthStore from '../store/authStore';

client.interceptors.request.use(async (config) => {
  const { session } = useAuthStore.getState();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'API Error';
    const status = error.response?.status;
    if (status === 429) {
      toast.error('AI quota reached. Please wait 60 seconds and try again.');
    } else {
      toast.error(`Error: ${msg}`);
    }
    return Promise.reject(error);
  }
);

export default client;
