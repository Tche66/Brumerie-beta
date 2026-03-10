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

  // ── Connexion Google ────────────────────────────────────────
  // Popup sur web, Redirect sur WebView Android (Capacitor)
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      // Chrome Android bloque signInWithPopup → on utilise redirect
      await signInWithRedirect(auth, provider);
      // La page recharge → résultat capturé dans onAuthStateChanged via getRedirectResult
      return;
    }
    const cred = await signInWithPopup(auth, provider);
    await handleGoogleUser(cred.user);
  }

  // Traitement commun après auth Google (popup ou redirect)
  async function handleGoogleUser(user: FirebaseUser) {
    const uid = user.uid;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      // Nouvelle connexion → créer profil
      const newUser: User = {
        id:           uid,
        uid:          uid,
        email:        user.email || '',
        name:         user.displayName || '',
        phone:        '',
        role:         'buyer',
        neighborhood: '',
        isVerified:   false,
        photoURL:     user.photoURL || '',
        bookmarkedProductIds: [],
        createdAt:    serverTimestamp() as any,
        publicationCount: 0,
        publicationLimit: 50,
      };
      await setDoc(doc(db, 'users', uid), newUser);
      setUserProfile(newUser);
      await ensureReferralCode(uid, newUser.name);
      sendWelcomeEmail(newUser.email, newUser.name);
    } else {
      // Profil existant → charger dans le state immédiatement
      await loadUserProfile(uid);
    }
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

  // ── Auth state + redirect Google ────────────────────────────
  useEffect(() => {
    // Intercepter d'abord le résultat d'un éventuel redirect Google
    // AVANT d'écouter onAuthStateChanged pour éviter la race condition
    const init = async () => {
      try {
        console.log('[Auth] getRedirectResult START');
        const result = await getRedirectResult(auth);
        console.log('[Auth] getRedirectResult result:', result?.user?.uid || 'null');
        if (result?.user) {
          console.log('[Auth] Google redirect user found:', result.user.email);
          await handleGoogleUser(result.user);
          console.log('[Auth] handleGoogleUser done');
        }
      } catch (e: any) {
        console.error('[Auth] getRedirectResult error:', e?.code, e?.message);
      }

      // Ensuite écouter les changements d'état
      const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
        console.log('[Auth] onAuthStateChanged fired, user:', user?.uid || 'null', 'provider:', user?.providerData?.[0]?.providerId);
        setCurrentUser(user);
        if (user) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          console.log('[Auth] Firestore profile exists:', snap.exists());
          if (snap.exists()) {
            const data = snap.data();
            if (data.isBanned) {
              await firebaseSignOut(auth);
              setUserProfile(null);
              sessionStorage.setItem('ban_reason', data.banReason || 'Compte suspendu.');
            } else {
              setUserProfile({ ...data, bookmarkedProductIds: data.bookmarkedProductIds || [] } as User);
            }
          } else {
            // Profil absent → user Google sans profil → créer
            const isGoogle = user.providerData?.some(p => p.providerId === 'google.com');
            if (isGoogle) await handleGoogleUser(user);
            else await loadUserProfile(user.uid);
          }
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
