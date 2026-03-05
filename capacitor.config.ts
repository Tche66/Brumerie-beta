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
  },
  server: {
    allowNavigation: [
      '*.firebaseapp.com', '*.googleapis.com',
      '*.cloudinary.com',
      'brumerie.com', 'www.brumerie.com',
    ],
  },
};
export default config;
