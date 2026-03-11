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
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile]  = useState<User | null>(null);
  const [loading, setLoading]          = useState(true);

  // ── Charger profil Firestore ─────────────────────────────────
  const loadUserProfile = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return false;
      const data = snap.data();
      if (data.isBanned) {
        await firebaseSignOut(auth);
        sessionStorage.setItem('ban_reason', data.banReason || 'Compte suspendu par Brumerie.');
        return false;
      }
      setUserProfile({
        ...data,
        bookmarkedProductIds:   data.bookmarkedProductIds   || [],
        defaultPaymentMethods:  data.defaultPaymentMethods  || [],
        deliveryPriceSameZone:  data.deliveryPriceSameZone  || 0,
        deliveryPriceOtherZone: data.deliveryPriceOtherZone || 0,
        managesDelivery: data.managesDelivery || false,
        contactCount:    data.contactCount    || 0,
      } as User);
      return true;
    } catch { return false; }
  }, []); // eslint-disable-line

  // ── Créer ou charger un compte Google ───────────────────────
  const handleGoogleUser = useCallback(async (user: FirebaseUser) => {
    const exists = await loadUserProfile(user.uid);
    if (!exists) {
      const newUser: User = {
        id: user.uid, uid: user.uid,
        email:        user.email        || '',
        name:         user.displayName  || '',
        phone:        '',
        role:         'buyer',
        neighborhood: '',
        isVerified:   false,
        photoURL:     user.photoURL     || '',
        bookmarkedProductIds: [],
        createdAt:    serverTimestamp() as any,
        publicationCount: 0,
        publicationLimit: 50,
      };
      await setDoc(doc(db, 'users', user.uid), newUser);
      setUserProfile(newUser);
      ensureReferralCode(user.uid, newUser.name);
      sendWelcomeEmail(newUser.email, newUser.name);
    }
  }, [loadUserProfile]);

  // ── Inscription email ────────────────────────────────────────
  async function signUp(email: string, password: string, userData: Partial<User> & { referredBy?: string }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;
    const newUser: User = {
      id: uid, uid, email,
      name:         userData.name         || '',
      phone:        userData.phone        || '',
      role:         userData.role         || 'buyer',
      neighborhood: userData.neighborhood || '',
      isVerified:   false,
      bookmarkedProductIds: [],
      createdAt:    serverTimestamp() as any,
      publicationCount: 0,
      publicationLimit: 50,
      ...(userData.referredBy ? { referredByCode: userData.referredBy } : {}),
    };
    await setDoc(doc(db, 'users', uid), newUser);
    setUserProfile(newUser);
    await ensureReferralCode(uid, userData.name || '');
    if (userData.referredBy) {
      try { await applyReferral(uid, userData.referredBy); } catch {}
    }
    sendWelcomeEmail(email, userData.name || '');
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // ── Connexion Google — POPUP UNIQUEMENT ─────────────────────
  // authDomain = brumerie-app.firebaseapp.com → popup fonctionne partout
  // Ne pas utiliser signInWithRedirect → race condition insoluble avec React
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    await handleGoogleUser(cred.user);
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUserProfile(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function requestOTP(email: string, name: string): Promise<{ devCode?: string }> {
    const result = await sendOTPEmail(email, name);
    return result.devCode ? { devCode: result.devCode } : {};
  }

  async function verifyOTP(email: string, code: string): Promise<'valid' | 'expired' | 'invalid'> {
    return verifyOTPRemote(email, code);
  }

  async function refreshUserProfile() {
    if (currentUser) await loadUserProfile(currentUser.uid);
  }

  // ── Écoute de l'état auth Firebase ──────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user.uid) ||
          (user.providerData?.some(p => p.providerId === 'google.com')
            ? await handleGoogleUser(user)
            : null);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [handleGoogleUser, loadUserProfile]);

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
