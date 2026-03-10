// src/services/soundService.ts
// Sons Brumerie — générés via Web Audio API (aucun fichier MP3)

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ── Helper : jouer une note simple ────────────────────────────
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
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// ── Helper : bruit filtré (impact / choc) ─────────────────────
function playNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  volume = 0.15,
  filterFreq = 2000,
): void {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

// ── SON PRINCIPAL : message reçu — PIÈCE QUI TOMBE ────────────
// Simulation réaliste : choc métal + rebonds décroissants (3s)
export function playMessageSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    // === IMPACT INITIAL (la pièce touche le sol) ===
    // Bruit d'impact court et fort
    playNoise(ctx, t, 0.08, 0.35, 3500);

    // Tonalité métallique de la pièce — fréquence qui descend rapidement
    const coinOsc = ctx.createOscillator();
    const coinGain = ctx.createGain();
    coinOsc.connect(coinGain);
    coinGain.connect(ctx.destination);
    coinOsc.type = 'sine';
    coinOsc.frequency.setValueAtTime(4200, t);
    coinOsc.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
    coinOsc.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    coinGain.gain.setValueAtTime(0, t);
    coinGain.gain.linearRampToValueAtTime(0.45, t + 0.005);
    coinGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    coinOsc.start(t);
    coinOsc.stop(t + 0.5);

    // Harmonique métallique (brillance de la pièce)
    const coinOsc2 = ctx.createOscillator();
    const coinGain2 = ctx.createGain();
    coinOsc2.connect(coinGain2);
    coinGain2.connect(ctx.destination);
    coinOsc2.type = 'triangle';
    coinOsc2.frequency.setValueAtTime(8400, t);
    coinOsc2.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
    coinGain2.gain.setValueAtTime(0, t);
    coinGain2.gain.linearRampToValueAtTime(0.20, t + 0.005);
    coinGain2.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    coinOsc2.start(t);
    coinOsc2.stop(t + 0.35);

    // === REBOND 1 (plus court, plus aigu) ===
    const r1 = t + 0.50;
    playNoise(ctx, r1, 0.05, 0.18, 4000);
    playNote(ctx, 3800, r1, 0.25, 0.28, 'sine');
    playNote(ctx, 7200, r1, 0.18, 0.12, 'triangle');

    // === REBOND 2 ===
    const r2 = t + 0.82;
    playNoise(ctx, r2, 0.04, 0.10, 4500);
    playNote(ctx, 4100, r2, 0.20, 0.18, 'sine');
    playNote(ctx, 8200, r2, 0.12, 0.08, 'triangle');

    // === REBOND 3 ===
    const r3 = t + 1.06;
    playNoise(ctx, r3, 0.03, 0.07, 5000);
    playNote(ctx, 4400, r3, 0.15, 0.11, 'sine');

    // === REBOND 4 (presque inaudible) ===
    const r4 = t + 1.26;
    playNoise(ctx, r4, 0.02, 0.05, 5200);
    playNote(ctx, 4600, r4, 0.10, 0.06, 'sine');

    // === GLISSEMENT FINAL — la pièce tourne sur elle-même ===
    // Tremolo rapide qui ralentit (effet "spinning coin")
    const spinDuration = 1.60;
    const spinStart = t + 1.40;
    const spinOsc = ctx.createOscillator();
    const spinGain = ctx.createGain();
    const spinLfo = ctx.createOscillator(); // LFO pour tremolo
    const spinLfoGain = ctx.createGain();

    spinLfo.connect(spinLfoGain);
    spinLfoGain.connect(spinGain.gain);
    spinOsc.connect(spinGain);
    spinGain.connect(ctx.destination);

    spinOsc.type = 'sine';
    spinOsc.frequency.setValueAtTime(4800, spinStart);
    spinOsc.frequency.exponentialRampToValueAtTime(3200, spinStart + spinDuration);

    // Tremolo accéléré au début (rotation rapide) qui ralentit
    spinLfo.type = 'sine';
    spinLfo.frequency.setValueAtTime(28, spinStart);   // 28Hz = très rapide
    spinLfo.frequency.exponentialRampToValueAtTime(4, spinStart + spinDuration); // ralentit
    spinLfoGain.gain.value = 0.04;

    spinGain.gain.setValueAtTime(0.06, spinStart);
    spinGain.gain.exponentialRampToValueAtTime(0.001, spinStart + spinDuration);

    spinLfo.start(spinStart);
    spinLfo.stop(spinStart + spinDuration);
    spinOsc.start(spinStart);
    spinOsc.stop(spinStart + spinDuration + 0.05);

  } catch { /* silencieux si AudioContext bloqué */ }
}

// ── Son notification système (boost, badge) ───────────────────
export function playSystemSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 880, t, 0.15, 0.25, 'sine');
    playNote(ctx, 1046.50, t + 0.18, 0.30, 0.20, 'sine');
  } catch { }
}

// ── Son erreur / alerte ───────────────────────────────────────
export function playAlertSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 440, t, 0.20, 0.25, 'triangle');
    playNote(ctx, 349.23, t + 0.22, 0.30, 0.20, 'triangle');
  } catch { }
}

// ── Son succès (paiement confirmé, boost activé) ──────────────
export function playSuccessSound(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    playNote(ctx, 523.25, t, 0.15, 0.22, 'sine');
    playNote(ctx, 659.25, t + 0.10, 0.15, 0.20, 'sine');
    playNote(ctx, 783.99, t + 0.20, 0.15, 0.18, 'sine');
    playNote(ctx, 1046.50, t + 0.32, 0.40, 0.22, 'sine');
  } catch { }
}

// ── Débloquer AudioContext (iOS) ──────────────────────────────
export function unlockAudio(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.001);
  } catch { }
}

// ── Vérifier disponibilité ────────────────────────────────────
export function isSoundAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as any).webkitAudioContext);
}
