// src/services/soundService.ts — v18
// Sons MP3 réels pour chaque événement Brumerie
// Fallback Web Audio API si MP3 indisponible (PWA/desktop)

// ── Mapping événement → fichier MP3 ──────────────────────────
const SOUNDS: Record<string, string> = {
  message:      '/sounds/notif_message.mp3',      // Message reçu — percussif médium 3s
  general:      '/sounds/notif_general.mp3',       // Notification générale — court 0.84s
  commande:     '/sounds/notif_commande.mp3',      // Nouvelle commande — fort/énergique 1s
  confirmation: '/sounds/notif_confirmation.mp3',  // Paiement/commande confirmée — 2.5s
  note:         '/sounds/notif_note.mp3',          // Avis reçu — aigu décroissant 2.6s
  publication:  '/sounds/notif_publication.mp3',   // Produit publié — mélodique aigu 3.4s
  livraison:    '/sounds/notif_livraison.mp3',     // Commande livrée — grave satisfaisant 3s
  offre:        '/sounds/notif_offre.mp3',         // Offre/négociation — punch grave 2s
  alerte:       '/sounds/notif_alerte.mp3',        // Alerte/erreur — court snap 1.4s
  story:        '/sounds/notif_story.mp3',         // Story vue/like — doux aigu 2.2s
};

// Cache des objets Audio
const audioCache: Record<string, HTMLAudioElement> = {};

function getAudio(key: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audioCache[key]) {
    const src = SOUNDS[key];
    if (!src) return null;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.75;
    audioCache[key] = audio;
  }
  return audioCache[key];
}

async function playMP3(key: string): Promise<boolean> {
  try {
    const audio = getAudio(key);
    if (!audio) return false;
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// ── Web Audio API fallback ────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}
function playNote(ctx: AudioContext, freq: number, t: number, dur: number, vol = 0.3, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t); osc.stop(t + dur + 0.05);
}

// ── Exports publics ───────────────────────────────────────────

// Message reçu
export async function playMessageSound(): Promise<void> {
  if (await playMP3('message')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 4200, t, 0.45, 0.85, 'sine');
    playNote(ctx, 8400, t, 0.30, 0.45, 'triangle');
    playNote(ctx, 3800, t + 0.50, 0.25, 0.55, 'sine');
  } catch {}
}

// Notification générale
export async function playSystemSound(): Promise<void> {
  if (await playMP3('general')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 880, t, 0.15, 0.25, 'sine');
    playNote(ctx, 1046.50, t + 0.18, 0.30, 0.20, 'sine');
  } catch {}
}

// Nouvelle commande reçue
export async function playCommandeSound(): Promise<void> {
  if (await playMP3('commande')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 523, t, 0.12, 0.5, 'square');
    playNote(ctx, 659, t + 0.10, 0.12, 0.4, 'square');
    playNote(ctx, 784, t + 0.20, 0.20, 0.5, 'square');
  } catch {}
}

// Paiement / commande confirmée
export async function playConfirmationSound(): Promise<void> {
  if (await playMP3('confirmation')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 523.25, t, 0.15, 0.22, 'sine');
    playNote(ctx, 659.25, t + 0.10, 0.15, 0.20, 'sine');
    playNote(ctx, 783.99, t + 0.20, 0.15, 0.18, 'sine');
    playNote(ctx, 1046.50, t + 0.32, 0.40, 0.22, 'sine');
  } catch {}
}
// Alias pour compatibilité
export const playSuccessSound = playConfirmationSound;

// Nouvel avis / note
export async function playNoteSound(): Promise<void> {
  if (await playMP3('note')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 1318, t, 0.20, 0.20, 'sine');
    playNote(ctx, 1567, t + 0.22, 0.35, 0.18, 'sine');
  } catch {}
}

// Produit publié
export async function playPublicationSound(): Promise<void> {
  if (await playMP3('publication')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 659, t, 0.12, 0.25, 'sine');
    playNote(ctx, 880, t + 0.14, 0.12, 0.22, 'sine');
    playNote(ctx, 1108, t + 0.28, 0.12, 0.20, 'sine');
    playNote(ctx, 1318, t + 0.40, 0.30, 0.22, 'sine');
  } catch {}
}

// Commande livrée
export async function playLivraisonSound(): Promise<void> {
  if (await playMP3('livraison')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 392, t, 0.20, 0.30, 'sine');
    playNote(ctx, 523, t + 0.22, 0.25, 0.28, 'sine');
    playNote(ctx, 659, t + 0.48, 0.40, 0.30, 'sine');
  } catch {}
}

// Offre / négociation reçue
export async function playOffreSound(): Promise<void> {
  if (await playMP3('offre')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 440, t, 0.10, 0.35, 'sawtooth');
    playNote(ctx, 554, t + 0.12, 0.15, 0.30, 'sawtooth');
  } catch {}
}

// Alerte / erreur
export async function playAlertSound(): Promise<void> {
  if (await playMP3('alerte')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 440, t, 0.20, 0.25, 'triangle');
    playNote(ctx, 349.23, t + 0.22, 0.30, 0.20, 'triangle');
  } catch {}
}

// Story vue / like
export async function playStorySound(): Promise<void> {
  if (await playMP3('story')) return;
  try {
    const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 1174, t, 0.15, 0.15, 'sine');
    playNote(ctx, 1396, t + 0.16, 0.25, 0.12, 'sine');
  } catch {}
}

// Précharger tous les sons au démarrage
export function preloadSounds(): void {
  if (typeof window === 'undefined') return;
  Object.keys(SOUNDS).forEach(key => getAudio(key));
}

// Débloquer AudioContext iOS
export function unlockAudio(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.001);
  } catch {}
}

export function isSoundAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as any).webkitAudioContext);
}
