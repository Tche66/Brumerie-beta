import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    // ✅ Injecter VITE_GOOGLE_WEB_CLIENT_ID comme variable globale
    define: {
      '__GOOGLE_WEB_CLIENT_ID__': JSON.stringify(env.VITE_GOOGLE_WEB_CLIENT_ID || ''),
    },
    build: {
      rollupOptions: {
        external: [
          '@capacitor/app',
          '@capacitor/haptics',
          '@capacitor/keyboard',
          '@capacitor/status-bar',
          '@capacitor/push-notifications',
          '@capacitor/local-notifications',
          // NE PAS externaliser @capacitor/core ni @capacitor-community/google-auth
          // → ils doivent être bundlés dans l'APK
        ],
      },
    },
  };
});
