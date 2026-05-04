// src/services/emailChangeService.ts
// Changement email sécurisé : mot de passe → OTP sur nouvel email → change

const API = '/api/send-email';

// Étape 1 — Vérifier le mot de passe actuel
export async function verifyCurrentPassword(email: string, password: string): Promise<{
  valid: boolean; error?: string;
}> {
  try {
    const res  = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_email_verify_password', email, password }),
    });
    const data = await res.json();
    if (data.result === 'valid')         return { valid: true };
    if (data.result === 'wrong_password') return { valid: false, error: 'Mot de passe incorrect.' };
    if (data.result === 'needs_setup')   return { valid: false, error: 'Service non configuré. Contacte le support.' };
    return { valid: false, error: data.error || 'Erreur vérification' };
  } catch {
    return { valid: false, error: 'Pas de connexion. Vérifie ton réseau.' };
  }
}

// Étape 2 — Envoyer OTP au nouvel email
export async function sendEmailChangeOTP(newEmail: string, currentEmail: string): Promise<{
  success: boolean; error?: string;
}> {
  try {
    const res  = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_email_send_otp', newEmail, currentEmail }),
    });
    const data = await res.json();
    if (res.status === 429) return { success: false, error: 'Trop de tentatives. Attends 10 minutes.' };
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Erreur envoi' };
    return { success: true };
  } catch {
    return { success: false, error: 'Pas de connexion.' };
  }
}

// Étape 3 — Valider OTP + appliquer le changement
export async function applyEmailChange(newEmail: string, code: string, uid: string): Promise<{
  success: boolean; error?: string;
}> {
  try {
    const res  = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_email_apply', newEmail, code, uid }),
    });
    const data = await res.json();
    if (data.result === 'success')    return { success: true };
    if (data.result === 'expired')    return { success: false, error: 'Code expiré. Recommence.' };
    if (data.result === 'email_taken') return { success: false, error: 'Cet email est déjà utilisé par un autre compte.' };
    if (data.result === 'needs_setup') return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT non configuré.' };
    if (data.result === 'invalid')    return { success: false, error: data.reason === 'too_many_attempts' ? 'Trop de tentatives.' : 'Code incorrect.' };
    return { success: false, error: data.error || 'Erreur' };
  } catch {
    return { success: false, error: 'Pas de connexion.' };
  }
}

// Admin — changer l'email d'un user directement (sans mot de passe)
export async function adminChangeEmail(targetUid: string, newEmail: string, adminToken: string): Promise<{
  success: boolean; error?: string;
}> {
  try {
    const res  = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_change_email', targetUid, newEmail, adminToken }),
    });
    const data = await res.json();
    if (data.result === 'success')     return { success: true };
    if (data.result === 'email_taken') return { success: false, error: 'Cet email est déjà utilisé.' };
    if (data.result === 'needs_setup') return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT non configuré.' };
    return { success: false, error: data.error || 'Erreur' };
  } catch {
    return { success: false, error: 'Pas de connexion.' };
  }
}
