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
  getRedirectResult,
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

// Flag sessionStorage : mis à 1 juste avant signInWithRedirect, retiré après getRedirectResult
const REDIRECT_KEY = 'brumerie_google_redirect';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile]  = useState<User | null>(null);
  // Si on revient d'un redirect Google, loading reste true jusqu'à ce que
  // getRedirectResult ait fini — on ne laisse JAMAIS passer loading=false trop tôt
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return false;
      const data = snap.data();
      if (data.isBanned) {
        await firebaseSignOut(auth);
        sessionStorage.setItem('ban_reason', data.banReason || 'Compte suspendu.');
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

  const handleGoogleUser = useCallback(async (user: FirebaseUser) => {
    const exists = await loadUserProfile(user.uid);
    if (!exists) {
      const newUser: User = {
        id: user.uid, uid: user.uid,
        email: user.email || '', name: user.displayName || '',
        phone: '', role: 'buyer', neighborhood: '',
        isVerified: false, photoURL: user.photoURL || '',
        bookmarkedProductIds: [],
        createdAt: serverTimestamp() as any,
        publicationCount: 0, publicationLimit: 50,
      };
      await setDoc(doc(db, 'users', user.uid), newUser);
      setUserProfile(newUser);
      ensureReferralCode(user.uid, newUser.name);
      sendWelcomeEmail(newUser.email, newUser.name);
    }
  }, [loadUserProfile]);

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
      // Poser le flag AVANT le redirect — la page va recharger
      sessionStorage.setItem(REDIRECT_KEY, '1');
      await signInWithRedirect(auth, provider);
    } else {
      const { user } = await signInWithPopup(auth, provider);
      await handleGoogleUser(user);
    }
  }

  async function signOut() { await firebaseSignOut(auth); setUserProfile(null); }
  async function resetPassword(email: string) { await sendPasswordResetEmail(auth, email); }
  async function requestOTP(email: string, name: string): Promise<{ devCode?: string }> {
    const r = await sendOTPEmail(email, name);
    return r.devCode ? { devCode: r.devCode } : {};
  }
  async function verifyOTP(email: string, code: string): Promise<'valid' | 'expired' | 'invalid'> {
    return verifyOTPRemote(email, code);
  }
  async function refreshUserProfile() {
    if (currentUser) await loadUserProfile(currentUser.uid);
  }

  useEffect(() => {
    const isRedirectReturn = sessionStorage.getItem(REDIRECT_KEY) === '1';

    // ── CAS REDIRECT GOOGLE ──────────────────────────────────────────
    // On est de retour après un signInWithRedirect
    // Il faut appeler getRedirectResult() pour finaliser la session Firebase
    // ET ne pas laisser onAuthStateChanged mettre loading=false avant que ce soit fini
    if (isRedirectReturn) {
      // On traite le redirect en priorité absolue
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            setCurrentUser(result.user);
            await handleGoogleUser(result.user);
          }
          // Qu'il y ait un résultat ou non, on finit le loading
          sessionStorage.removeItem(REDIRECT_KEY);
          setLoading(false);
        })
        .catch((e) => {
          console.warn('[Auth] getRedirectResult error:', e?.code, e?.message);
          sessionStorage.removeItem(REDIRECT_KEY);
          setLoading(false);
        });

      // On enregistre onAuthStateChanged mais il NE DOIT PAS mettre loading=false
      // car getRedirectResult s'en charge
      const unsub = onAuthStateChanged(auth, (user) => {
        // Juste mettre à jour currentUser silencieusement
        setCurrentUser(user);
        if (!user) setUserProfile(null);
        // NE PAS appeler setLoading(false) ici — getRedirectResult s'en charge
      });
      return unsub;
    }

    // ── CAS NORMAL (pas de redirect) ────────────────────────────────
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUser(user);
      if (user) {
        const ok = await loadUserProfile(user.uid);
        if (!ok && user.providerData?.some(p => p.providerId === 'google.com')) {
          await handleGoogleUser(user);
        }
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
