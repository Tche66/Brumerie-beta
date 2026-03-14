import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brumerie.app',
  appName: 'Brumerie',
  webDir: 'dist',
  android: { backgroundColor: '#FFFFFF' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#16A34A',
      sound: 'notif_general',
    },
    // ✅ Google Sign-In natif via @capacitor-community/google-auth
    // clientId = Web Client ID (pas le client Android)
    // Valeur injectée depuis le secret GitHub GOOGLE_WEB_CLIENT_ID
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.VITE_GOOGLE_WEB_CLIENT_ID || '',
      forceCodeForRefreshToken: true,
    },
  },
  server: {
    url: 'https://brumerie-beta.vercel.app',
    cleartext: false,
    allowNavigation: [
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.cloudinary.com',
      'brumerie.com',
      'www.brumerie.com',
      'brumerie-beta.vercel.app',
    ],
  },
};
export default config;
