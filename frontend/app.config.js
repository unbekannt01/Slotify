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
    plugins: [
      'expo-secure-store',
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Allow Slotify to use the microphone for voice bookings.',
          speechRecognitionPermission: 'Allow Slotify to convert your voice to text for booking appointments.',
          androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
        },
      ],
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://slotify-production-937f.up.railway.app',
      eas: {
        projectId: '1ad55b55-2d76-4691-8b02-4ba62b54eca9',
      },
    },
  },
};