// src/services/otpService.ts — OTP 100% via Netlify Function (sans Firestore)
// La Function gère : génération, stockage mémoire, envoi Brevo, vérification

// Sur Capacitor (APK), window.location.origin = "capacitor://localhost"
// → le chemin relatif /.netlify ne fonctionne pas → URL absolue nécessaire
// brumerie.com est le domaine custom pointant vers Netlify
const PROD_BASE = 'https://brumerie.com';
const isCapacitor = typeof (window as any).Capacitor !== 'undefined'
  || window.location.protocol === 'capacitor:';
const FUNCTION_URL = isCapacitor
  ? `${PROD_BASE}/.netlify/functions/send-email`
  : '/.netlify/functions/send-email';

// ── Demander l'envoi d'un OTP ──────────────────────────────────
// Retourne { success: true } ou { devCode: string } si Function non déployée
export async function sendOTPEmail(
  email: string, name: string
): Promise<{ success: boolean; devCode?: string; error?: string }> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_otp', email, name }),
    });

    const data = await res.json().catch(() => ({})) as any;

    if (res.status === 429) throw new Error(data.error || 'Trop de tentatives');
    if (res.ok && data.success) return { success: true };

    // Log détaillé pour diagnostic Netlify
    console.error('[OTP send] Échec Brevo:', {
      status: res.status,
      error: data.error,
      detail: data.detail,
      hint: data.hint,
    });

    // Message d'erreur précis selon la cause
    if (data.hint) throw new Error(data.hint);
    if (res.status === 401) throw new Error('Clé API email invalide');
    if (res.status === 400) throw new Error('Configuration email incorrecte');
    throw new Error(data.error || `Erreur envoi (${res.status})`);

  } catch (err: any) {
    // Function pas déployée (réseau/404) → mode dev
    if (err.message?.includes('Failed to fetch') || err.message?.includes('404')) {
      console.warn('[OTP DEV] Function non disponible');
      return { success: false, devCode: 'MODE_DEV' };
    }
    throw err;
  }
}

// ── Vérifier un code OTP ───────────────────────────────────────
export async function verifyOTPRemote(
  email: string, code: string
): Promise<'valid' | 'expired' | 'invalid'> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_otp', email, code }),
    });
    const data = await res.json().catch(() => ({ result: 'invalid' })) as any;
    return data.result || 'invalid';
  } catch {
    // Réseau KO → invalide par défaut (sécurité)
    return 'invalid';
  }
}

// ── Email de bienvenue (non-bloquant) ─────────────────────────
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  fetch(FUNCTION_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'welcome', email, name }),
  }).catch(console.warn);
}
