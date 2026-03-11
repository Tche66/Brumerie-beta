// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

const RKEY = 'brumerie_g_redir';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // ref pour signaler à onAuthStateChanged de ne pas finir le loading
  const redirectPending = useRef(localStorage.getItem(RKEY) === '1');

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
        bookmarkedProductIds: d.bookmarkedProductIds || [],
        defaultPaymentMethods: d.defaultPaymentMethods || [],
        deliveryPriceSameZone: d.deliveryPriceSameZone || 0,
        deliveryPriceOtherZone: d.deliveryPriceOtherZone || 0,
        managesDelivery: d.managesDelivery || false,
        contactCount: d.contactCount || 0,
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
      localStorage.setItem(RKEY, '1');
      redirectPending.current = true;
      await signInWithRedirect(auth, provider);
    } else {
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

  useEffect(() => {
    // ÉTAPE 1 — onAuthStateChanged s'abonne immédiatement
    // Si redirectPending=true, il met à jour currentUser MAIS ne finit pas loading
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (redirectPending.current) {
        // On est en train de traiter un redirect — juste stocker le user, ne pas finir loading
        setCurrentUser(user);
        return;
      }
      // Flux normal
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

    // ÉTAPE 2 — Si on revient d'un redirect Google, appeler getRedirectResult
    if (redirectPending.current) {
      getRedirectResult(auth)
        .then(async (result) => {
          localStorage.removeItem(RKEY);
          redirectPending.current = false;
          if (result?.user) {
            setCurrentUser(result.user);
            await handleGoogleUser(result.user);
          } else {
            // Pas de résultat redirect — vérifier si Firebase a quand même un user
            const fbUser = auth.currentUser;
            if (fbUser) {
              setCurrentUser(fbUser);
              const ok = await loadProfile(fbUser.uid);
              if (!ok) await handleGoogleUser(fbUser);
            }
          }
        })
        .catch((e) => {
          console.warn('[Auth] getRedirectResult error:', e?.code, e?.message);
          localStorage.removeItem(RKEY);
          redirectPending.current = false;
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => unsubAuth();
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
