import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api';
import { randomUUID } from './uuid';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject correlation ID and ambulance role on every request
apiClient.interceptors.request.use(async (config) => {
  config.headers['X-Correlation-ID'] = randomUUID();
  config.headers['x-user-role'] = 'PARAMEDIC';

  // Attach ambulance ID if stored
  const ambulanceId = await AsyncStorage.getItem('ambulanceId');
  if (ambulanceId) {
    config.headers['x-ambulance-id'] = ambulanceId;
  }

  return config;
});

// Response error logging
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (__DEV__) {
      console.warn('[API Error]', err.response?.status, err.response?.data ?? err.message);
    }
    return Promise.reject(err);
  }
);
