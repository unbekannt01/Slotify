module.exports = {
  expo: {
    name: 'Slotify',
    slug: 'slotify',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#080B11',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.prashant.slotify',
    },
    android: {
      package: 'com.prashant.slotify',
      adaptiveIcon: {
        backgroundColor: '#080B11',
        foregroundImage: './assets/android-icon-foreground.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-secure-store'],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
      // `eas init` ke baad jo projectId mile, yahan paste karo:
      // eas: { projectId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    },
  },
};