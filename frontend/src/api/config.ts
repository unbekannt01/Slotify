import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getAutoDetectedBaseUrl = (): string => {
  // 0. Production / EAS build: explicit URL from EXPO_PUBLIC_API_URL (set in eas.json or .env)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, ''); // strip trailing slash
  }

  // 1. If running in web browser, use current host with port 5000
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  // 2. If running on physical device or simulator via Expo, hostUri has machine's LAN IP
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000`;
    }
  }

  // 3. Android emulator fallback (10.0.2.2 connects to host machine)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // 4. Default fallback (iOS Simulator or local)
  return 'http://localhost:5000';
};

export const API_BASE_URL = getAutoDetectedBaseUrl();