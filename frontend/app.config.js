module.exports = {
  expo: {
    name: 'Slotify',
    slug: 'slotify',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#090A0F',
        foregroundImage: './assets/android-icon-foreground.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-secure-store'],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
    },
  },
};
