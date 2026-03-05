// src/services/passwordResetService.ts
// Réinitialisation mot de passe par OTP Brevo (pas de lien Firebase)

const API = '/.netlify/functions/send-email';

export type ResetStep = 'email' | 'otp' | 'newpassword' | 'done';

// Étape 1 — Envoyer l'OTP de reset
export async function sendResetOTP(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password_send', email }),
    });
    const data = await res.json();
    if (res.status === 429) return { success: false, error: 'Trop de tentatives. Attends 10 minutes.' };
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Erreur envoi email' };
    return { success: true };
  } catch {
    return { success: false, error: 'Pas de connexion. Vérifie ton réseau.' };
  }
}

// Étape 2 — Vérifier l'OTP et obtenir le resetToken
export async function verifyResetOTP(email: string, code: string): Promise<{
  valid: boolean;
  resetToken?: string;
  error?: string;
}> {
  try {
    const res  = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password_verify', email, code }),
    });
    const data = await res.json();
    if (data.result === 'valid') return { valid: true, resetToken: data.resetToken };
    if (data.result === 'expired') return { valid: false, error: 'Code expiré. Recommence.' };
    if (data.reason === 'too_many_attempts') return { valid: false, error: 'Trop de tentatives. Recommence.' };
    return { valid: false, error: 'Code incorrect.' };
  } catch {
    return { valid: false, error: 'Pas de connexion.' };
  }
}

// Étape 3 — Changer le mot de passe
export async function changePassword(email: string, resetToken: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res  = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password_change', email, resetToken, newPassword }),
    });
    const data = await res.json();

    if (data.result === 'success') return { success: true };
    if (data.result === 'needs_firebase_reset') {
      return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT non configuré dans Netlify. Voir ADMIN_SETUP.md.' };
    }
    return { success: false, error: data.error || 'Erreur changement mot de passe' };
  } catch {
    return { success: false, error: 'Pas de connexion.' };
  }
}
