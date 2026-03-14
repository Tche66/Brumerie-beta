// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { User } from '@/types';
import { sendOTPEmail, verifyOTPRemote, sendWelcomeEmail } from '@/services/otpService';
import { applyReferral, ensureReferralCode } from '@/services/referralService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<User> & { referredBy?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  // OTP
  requestOTP: (email: string, name: string) => Promise<{ devCode?: string }>;
  verifyOTP: (email: string, code: string) => Promise<'valid' | 'expired' | 'invalid'>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile]  = useState<User | null>(null);
  const [loading, setLoading]          = useState(true);

  // ── Inscription ──────────────────────────────────────────────
  async function signUp(
    email: string, password: string,
    userData: Partial<User> & { referredBy?: string }
  ) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;

    const newUser: User = {
      id:           uid,
      uid:          uid,
      email,
      name:         userData.name    || '',
      phone:        userData.phone   || '',
      role:         userData.role    || 'buyer',
      neighborhood: userData.neighborhood || '',
      isVerified:   false,
      bookmarkedProductIds: [],
      createdAt:    serverTimestamp() as any,
      publicationCount: 0,
      publicationLimit: 50,
      // Stocker le code parrainage utilisé (pour traçabilité)
      ...(userData.referredBy ? { referredByCode: userData.referredBy } : {}),
    };

    await setDoc(doc(db, 'users', uid), newUser);
    setUserProfile(newUser);

    // Générer le code parrainage
    await ensureReferralCode(uid, userData.name || '');

    // Appliquer parrainage si fourni
    if (userData.referredBy) {
      try {
        const ok = await applyReferral(uid, userData.referredBy);
        if (!ok) console.warn('[Referral] Code non trouvé ou invalide:', userData.referredBy);
      } catch (refErr) {
        // Ne pas bloquer l'inscription si parrainage échoue
        console.error('[Referral] Erreur applyReferral:', refErr);
      }
    }

    // Email de bienvenue
    sendWelcomeEmail(email, userData.name || '');
  }

  // ── Connexion ────────────────────────────────────────────────
  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // ── Connexion Google ─────────────────────────────────────────
  // APK Android  : SDK natif Google Sign-In via @codetrix-studio/capacitor-google-auth
  //                → évite l'erreur disallowed_useragent de Google
  // Web/PWA      : flux Custom Token via /api/google-auth-start + poll
  async function signInWithGoogle() {
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
    const hasNativeBridge = isCapacitor && typeof (window as any).AndroidGoogleAuth !== 'undefined';

    if (hasNativeBridge) {
      // ── Flux natif Android — SDK Google Sign-In via JavascriptInterface ──
      // MainActivity.java expose window.AndroidGoogleAuth.signIn(callbackName)
      // Le sélecteur de compte Google natif s'ouvre (pas une WebView → pas de blocage)
      return new Promise<void>((resolve, reject) => {
        const callbackName = '__googleAuthCb_' + Date.now();

        // Enregistrer le callback que Java appellera avec le résultat
        (window as any)[callbackName] = (result: { success: boolean; idToken?: string; error?: string }) => {
          delete (window as any)[callbackName];
          if (result.success && result.idToken) {
            const credential = GoogleAuthProvider.credential(result.idToken);
            signInWithCredential(auth, credential)
              .then(() => resolve())
              .catch((err) => reject(err));
          } else {
            reject(new Error(result.error || 'Connexion Google échouée'));
          }
        };

        // Lancer le sélecteur Google natif
        (window as any).AndroidGoogleAuth.signIn(callbackName);
      });
    }

    // ── Flux web (PWA) : Custom Token via Vercel ─────────────
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const baseUrl = window.location.origin;
    const startUrl = `${baseUrl}/api/google-auth-start?state=${state}`;
    window.open(startUrl, '_blank', 'noopener');

    return new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(poll);
          reject(new Error('auth/timeout'));
          return;
        }
        try {
          const res  = await fetch(`${baseUrl}/api/google-auth-poll?state=${state}`);
          const data = await res.json();
          if (data.status === 'ready' && data.token) {
            clearInterval(poll);
            await signInWithCustomToken(auth, data.token);
            resolve();
          } else if (data.error === 'expired') {
            clearInterval(poll);
            reject(new Error('auth/expired'));
          }
        } catch { /* réseau temporaire */ }
      }, 1000);
    });
  }

  // ── Déconnexion ──────────────────────────────────────────────
  async function signOut() {
    await firebaseSignOut(auth);
    setUserProfile(null);
  }

  // ── Mot de passe oublié ──────────────────────────────────────
  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  // ── OTP : demander l'envoi ───────────────────────────────────
  async function requestOTP(email: string, name: string): Promise<{ devCode?: string }> {
    const result = await sendOTPEmail(email, name);
    if (result.devCode) return { devCode: result.devCode };
    return {};
  }

  // ── OTP : vérifier le code ───────────────────────────────────
  async function verifyOTP(
    email: string, code: string
  ): Promise<'valid' | 'expired' | 'invalid'> {
    return verifyOTPRemote(email, code);
  }

  // ── Charger profil ───────────────────────────────────────────
  const loadUserProfile = useCallback(async (uid: string) => {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      // ── Vérification bannissement ─────────────────────────────
      if (data.isBanned) {
        // Déconnecter immédiatement l'utilisateur banni
        await firebaseSignOut(auth);
        setUserProfile(null);
        // Stocker le motif pour afficher un message
        sessionStorage.setItem('ban_reason', data.banReason || 'Compte suspendu par Brumerie.');
        return;
      }
      setUserProfile({
        ...data,
        bookmarkedProductIds:  data.bookmarkedProductIds  || [],
        defaultPaymentMethods: data.defaultPaymentMethods || [],
        deliveryPriceSameZone:  data.deliveryPriceSameZone  || 0,
        deliveryPriceOtherZone: data.deliveryPriceOtherZone || 0,
        managesDelivery: data.managesDelivery || false,
        contactCount:    data.contactCount    || 0,
      } as User);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshUserProfile() {
    if (currentUser) await loadUserProfile(currentUser.uid);
  }

  // ── Auth state ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUser(user);
      if (user) await loadUserProfile(user.uid);
      else setUserProfile(null);
      setLoading(false);
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextType = {
    currentUser, userProfile, loading,
    signUp, signIn, signOut, resetPassword, refreshUserProfile,
    requestOTP, verifyOTP, signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
