// src/services/soundService.ts
// Son de notification Brumerie — généré via Web Audio API
// Aucun fichier MP3 nécessaire — fonctionne sur iOS et Android

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ── Jouer une note ─────────────────────────────────────────────
function playNote(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 0.3,
  type: OscillatorType = 'sine',
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  // Envelope douce — attaque rapide, décroissance progressive
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// ── Son principal : message reçu ──────────────────────────────
// Mélodie Do-Mi-Sol douce (3 notes harmonieuses)
export function playMessageSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    // Do-Mi-Sol — accord majeur ascendant
    playNote(ctx, 523.25, t,        0.25, 0.28, 'sine'); // Do5
    playNote(ctx, 659.25, t + 0.12, 0.25, 0.24, 'sine'); // Mi5
    playNote(ctx, 783.99, t + 0.22, 0.35, 0.20, 'sine'); // Sol5

    // Harmonique douce en dessous
    playNote(ctx, 261.63, t,        0.45, 0.08, 'sine'); // Do4
  } catch { /* silencieux si AudioContext bloqué */ }
}

// ── Son notification système (boost activé, badge, etc.) ──────
// 2 notes + résonance
export function playSystemSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    playNote(ctx, 880, t,       0.15, 0.25, 'sine'); // La5
    playNote(ctx, 1046.50, t + 0.18, 0.30, 0.20, 'sine'); // Do6
  } catch { }
}

// ── Son erreur / alerte ───────────────────────────────────────
export function playAlertSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    playNote(ctx, 440, t,       0.20, 0.25, 'triangle');
    playNote(ctx, 349.23, t + 0.22, 0.30, 0.20, 'triangle');
  } catch { }
}

// ── Son succès (paiement confirmé, boost activé) ──────────────
// Montée joyeuse 4 notes
export function playSuccessSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    playNote(ctx, 523.25, t,        0.15, 0.22, 'sine'); // Do
    playNote(ctx, 659.25, t + 0.10, 0.15, 0.20, 'sine'); // Mi
    playNote(ctx, 783.99, t + 0.20, 0.15, 0.18, 'sine'); // Sol
    playNote(ctx, 1046.50, t + 0.32, 0.40, 0.22, 'sine'); // Do (octave)
  } catch { }
}

// ── Débloquer AudioContext sur interaction utilisateur ────────
// iOS bloque AudioContext jusqu'au premier touch — appeler au 1er clic
export function unlockAudio(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    // Jouer un son silencieux pour débloquer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.001);
  } catch { }
}

// ── Vérifier si le son est disponible ─────────────────────────
export function isSoundAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as any).webkitAudioContext);
}
