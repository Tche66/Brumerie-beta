// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
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
  requestOTP: (email: string, name: string) => Promise<{ devCode?: string }>;
  verifyOTP: (email: string, code: string) => Promise<'valid' | 'expired' | 'invalid'>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Stocker la config Firebase pour auth-callback.html ──────
  useEffect(() => {
    try {
      const cfg = {
        apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID,
        appId:             import.meta.env.VITE_FIREBASE_APP_ID,
      };
      localStorage.setItem('brumerie_fb_cfg', JSON.stringify(cfg));
    } catch {}
  }, []);

  const loadProfile = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return false;
      const d = snap.data();
      if (d.isBanned) {
        await firebaseSignOut(auth);
        localStorage.setItem('ban_reason', d.banReason || 'Compte suspendu.');
        return false;
      }
      setUserProfile({
        ...d,
        bookmarkedProductIds:   d.bookmarkedProductIds   || [],
        defaultPaymentMethods:  d.defaultPaymentMethods  || [],
        deliveryPriceSameZone:  d.deliveryPriceSameZone  || 0,
        deliveryPriceOtherZone: d.deliveryPriceOtherZone || 0,
        managesDelivery: d.managesDelivery || false,
        contactCount:    d.contactCount    || 0,
      } as User);
      return true;
    } catch (e) {
      console.error('[Auth] loadProfile:', e);
      return false;
    }
  }, []);

  const handleGoogleUser = useCallback(async (user: FirebaseUser) => {
    const exists = await loadProfile(user.uid);
    if (!exists) {
      const newUser: User = {
        id: user.uid, uid: user.uid,
        email: user.email || '',
        name: user.displayName || '',
        phone: '', role: 'buyer', neighborhood: '',
        isVerified: false,
        photoURL: user.photoURL || '',
        bookmarkedProductIds: [],
        createdAt: serverTimestamp() as any,
        publicationCount: 0, publicationLimit: 50,
      };
      await setDoc(doc(db, 'users', user.uid), newUser);
      setUserProfile(newUser);
      ensureReferralCode(user.uid, newUser.name);
      sendWelcomeEmail(newUser.email, newUser.name);
    }
  }, [loadProfile]);

  async function signUp(email: string, password: string, userData: Partial<User> & { referredBy?: string }) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: User = {
      id: user.uid, uid: user.uid, email,
      name: userData.name || '', phone: userData.phone || '',
      role: userData.role || 'buyer', neighborhood: userData.neighborhood || '',
      isVerified: false, bookmarkedProductIds: [],
      createdAt: serverTimestamp() as any,
      publicationCount: 0, publicationLimit: 50,
      ...(userData.referredBy ? { referredByCode: userData.referredBy } : {}),
    };
    await setDoc(doc(db, 'users', user.uid), newUser);
    setUserProfile(newUser);
    await ensureReferralCode(user.uid, userData.name || '');
    if (userData.referredBy) { try { await applyReferral(user.uid, userData.referredBy); } catch {} }
    sendWelcomeEmail(email, userData.name || '');
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      // Sur mobile : redirect — Firebase revient sur /auth-callback.html
      // qui appelle getRedirectResult() dans un contexte propre sans React
      await signInWithRedirect(auth, provider);
    } else {
      // Sur desktop : popup directe, pas de redirect
      const { user } = await signInWithPopup(auth, provider);
      await handleGoogleUser(user);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUserProfile(null);
  }
  async function resetPassword(email: string) { await sendPasswordResetEmail(auth, email); }
  async function requestOTP(email: string, name: string): Promise<{ devCode?: string }> {
    const r = await sendOTPEmail(email, name);
    return r.devCode ? { devCode: r.devCode } : {};
  }
  async function verifyOTP(email: string, code: string): Promise<'valid' | 'expired' | 'invalid'> {
    return verifyOTPRemote(email, code);
  }
  async function refreshUserProfile() {
    if (currentUser) await loadProfile(currentUser.uid);
  }

  // ── Init — flux simple : onAuthStateChanged only ─────────────
  // getRedirectResult n'est PLUS appelé ici — c'est auth-callback.html qui s'en charge
  // Quand l'app recharge depuis /?google_ok=1 ou /?google_new=1,
  // Firebase a déjà une session active → onAuthStateChanged retourne le user directement
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUser(user);
      if (user) {
        const ok = await loadProfile(user.uid);
        if (!ok && user.providerData?.some(p => p.providerId === 'google.com')) {
          await handleGoogleUser(user);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [handleGoogleUser, loadProfile]);

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loading,
      signUp, signIn, signOut, resetPassword, refreshUserProfile,
      requestOTP, verifyOTP, signInWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
