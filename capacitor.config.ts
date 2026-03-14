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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // ⚙️ Remplacé par le workflow GitHub Actions depuis GOOGLE_WEB_CLIENT_ID
      serverClientId: 'GOOGLE_WEB_CLIENT_ID_PLACEHOLDER',
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
