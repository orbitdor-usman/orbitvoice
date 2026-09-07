import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' && window.location.port !== '3000' ? window.location.origin : 'http://127.0.0.1:3847');

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { Accept: 'application/json' }
});

export default api;
