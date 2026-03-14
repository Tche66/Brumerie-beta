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
  },
  server: {
    // ✅ L'APK charge directement depuis Vercel
    // → /api/* fonctionne, upload Cloudinary fonctionne, Google Auth fonctionne
    // Changer pour https://brumerie.com quand le domaine sera migré
    url: 'https://brumerie-beta.vercel.app',
    cleartext: false,
    allowNavigation: [
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.cloudinary.com',
      'brumerie.com',
      'www.brumerie.com',
      'brumerie-beta.vercel.app',
      'accounts.google.com',
    ],
  },
};
export default config;
