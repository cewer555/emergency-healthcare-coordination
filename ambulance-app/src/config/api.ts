// In development, point at your local backend
// On a physical device, replace with your PC's LAN IP (e.g. 192.168.1.10)
const DEV_API_URL = 'http://10.0.2.2:3000'; // Android emulator → host loopback
const PROD_API_URL = 'https://your-production-api.example.com'; // change before production deploy

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const WS_URL = __DEV__
  ? 'ws://10.0.2.2:3000/ws'
  : 'wss://your-production-api.example.com/ws';

export const API_TIMEOUT_MS = 10_000;
