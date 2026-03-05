// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Firestore avec cache illimité (optimisé réseau mobile Afrique)
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Activer la persistance hors ligne (IndexedDB)
// Mode "fail silently" — si multi-onglets ou iOS bloque, on continue sans crash
enableIndexedDbPersistence(db, { forceOwnership: false }).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Plusieurs onglets ouverts — persistance désactivée pour cet onglet, pas grave
    console.warn('[Offline] Multi-tabs: persistance désactivée pour cet onglet');
  } else if (err.code === 'unimplemented') {
    // Navigateur trop ancien ou mode privé iOS — pas grave
    console.warn('[Offline] Persistance non supportée sur ce navigateur');
  }
  // Dans tous les cas : l'app continue de fonctionner normalement en ligne
});

export const auth    = getAuth(app);
export const storage = getStorage(app);
export default app;
