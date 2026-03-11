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
  signInWithRedirect,
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

// ─── Clé sessionStorage pour survivre au rechargement post-redirect ───────────
const SK_GOOGLE = 'brumerie_google_redirect';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile]  = useState<User | null>(null);
  // loading démarre à true SI on attend un redirect Google OU si Firebase charge
  const [loading, setLoading] = useState(true);

  // ── Charger profil ──────────────────────────────────────────
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

  // ── Créer ou charger profil Google ──────────────────────────
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

  // ── Inscription ─────────────────────────────────────────────
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
    if (userData.referredBy) {
      try { await applyReferral(user.uid, userData.referredBy); } catch {}
    }
    sendWelcomeEmail(email, userData.name || '');
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // ── Connexion Google ─────────────────────────────────────────
  // Sur mobile : signInWithRedirect (popup bloquée par Chrome Android)
  // Sur desktop : signInWithPopup
  // Le redirect recharge la page → on stocke un flag pour maintenir loading=true
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      sessionStorage.setItem(SK_GOOGLE, '1');
      await signInWithRedirect(auth, provider);
      return;
    }
    // Desktop : popup directe sans await intermédiaire
    const { user } = await signInWithPopup(auth, provider);
    await handleGoogleUser(user);
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
    if (currentUser) await loadUserProfile(currentUser.uid);
  }

  // ── Init : traiter redirect Google PUIS écouter onAuthStateChanged ──────────
  useEffect(() => {
    const pendingRedirect = sessionStorage.getItem(SK_GOOGLE) === '1';

    const init = async () => {
      // CAS 1 : on revient d'un redirect Google
      if (pendingRedirect) {
        try {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            await handleGoogleUser(result.user);
            setCurrentUser(result.user);
          }
        } catch (e: any) {
          console.error('[Auth] getRedirectResult:', e?.code, e?.message);
        } finally {
          sessionStorage.removeItem(SK_GOOGLE);
        }
        // Dans les deux cas (succès ou échec), on arrête le loading
        setLoading(false);
      }

      // CAS 2 : écouter les changements d'état suivants
      const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
        // Si on vient de traiter le redirect, onAuthStateChanged se déclenche aussi
        // mais le profil est déjà dans le state → on ignore juste le loading
        if (pendingRedirect) {
          setCurrentUser(user);
          return; // loading déjà mis à false ci-dessus
        }
        setCurrentUser(user);
        if (user) {
          await loadUserProfile(user.uid) ||
            (user.providerData?.some(p => p.providerId === 'google.com')
              ? await handleGoogleUser(user) : null);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });

      return unsub;
    };

    let unsub: (() => void) | undefined;
    init().then(fn => { unsub = fn; });
    return () => { unsub?.(); };
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
