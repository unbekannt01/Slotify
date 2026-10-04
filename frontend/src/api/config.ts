import Constants from 'expo-constants';

export const PRODUCTION_API_URL = 'https://slotify-production-937f.up.railway.app';

export const getAutoDetectedBaseUrl = (): string => {
  // 1. Explicit environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Extra config from app.config.js / app.json (EAS build)
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl && typeof extraUrl === 'string' && extraUrl.trim().length > 0) {
    return extraUrl.trim().replace(/\/+$/, '');
  }

  // 3. Default directly to live deployed Railway backend
  return PRODUCTION_API_URL;
};

export const API_BASE_URL = getAutoDetectedBaseUrl();