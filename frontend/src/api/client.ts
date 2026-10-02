import axios from 'axios';
import { API_BASE_URL } from './config';
import { getItem } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function updateApiClientBaseUrl(newUrl: string) {
  apiClient.defaults.baseURL = newUrl;
  console.log(`[ApiClient] Updated baseURL to: ${newUrl}`);
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getItem('slotify_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Network connection error';
    if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.message) {
      if (error.message.includes('Network Error')) {
        message = 'Unable to connect to live booking service. Please check your network connection and try again.';
      } else {
        message = error.message;
      }
    }
    return Promise.reject(new Error(message));
  }
);
