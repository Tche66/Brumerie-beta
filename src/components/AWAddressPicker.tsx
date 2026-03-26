// src/components/AWAddressPicker.tsx — v1
// Permet de créer OU résoudre une adresse AddressWeb SANS quitter Brumerie.
// Utilise le GPS du téléphone pour pré-remplir lat/lng.
// Usage :
//   <AWAddressPicker
//     value={awCode}
//     onChange={(code, addr) => { setAwCode(code); setAwAddress(addr); }}
//     onSaveToProfile={() => updateUserProfile(uid, { awAddressCode: code })}
//     showSaveToProfile   // affiche le bouton "Sauvegarder dans mon profil"
//   />

import React, { useState, useCallback } from 'react';
import {
  isValidAWCode,
  resolveAWCode,
  formatAWCode,
  AWAddress,
} from '@/services/awService';

// ── Types ─────────────────────────────────────────────────────
interface Props {
  value?: string;                                      // code AW actuel (contrôlé)
  onChange?: (code: string, addr: AWAddress | null) => void;
  onSaveToProfile?: (code: string, addr: AWAddress) => Promise<void>;
  showSaveToProfile?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  firebaseUid?: string;   // UID Firebase de l'utilisateur connecté
  email?: string;         // Email Firebase — pour créer son compte AW
}

type Mode = 'idle' | 'enter_code' | 'create_gps' | 'create_manual';
type CreateStep = 'repere' | 'confirming' | 'done';

// ── Quartiers Abidjan ─────────────────────────────────────────
const QUARTIERS_ABIDJAN = [
  'Yopougon','Cocody','Abobo','Adjamé','Plateau','Marcory','Treichville',
  'Koumassi','Port-Bouët','Attécoubé','Bingerville','Songon',
  'Deux-Plateaux','Riviera','Angré','Bonoumin','Palmeraie',
  'Williamsville','Locodjro','Niangon','Sogefiha',
];

// ── Proxy calls ───────────────────────────────────────────────

// Étape 1 — récupérer ou créer le compte Supabase de l'utilisateur
// Retourne le supabaseUserId ET le stocke dans Firebase pour les prochaines fois
async function resolveSupabaseUserId(
  firebaseUid: string,
  email: string,
  cachedSupabaseUserId?: string,
): Promise<string | null> {
  // Si déjà en cache (profil Firebase) → pas besoin d'appeler aw-auth
  if (cachedSupabaseUserId) return cachedSupabaseUserId;

  try {
    const res = await fetch('/api/aw-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: firebaseUid, email }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.supabaseUserId || null;
  } catch {
    return null;
  }
}

// Étape 2 — créer l'adresse au nom de l'utilisateur réel
async function createAWAddress(params: {
  latitude: number; longitude: number;
  repere: string; ville: string; quartier?: string;
  firebaseUid?: string;
  email?: string;
  cachedSupabaseUserId?: string; // depuis userProfile.awSupabaseUserId
}): Promise<{ addr: AWAddress | null; supabaseUserId: string | null }> {
  try {
    // Résoudre le supabaseUserId — cache d'abord, sinon appel aw-auth
    let supabaseUserId: string | null = null;
    if (params.firebaseUid && params.email) {
      supabaseUserId = await resolveSupabaseUserId(
        params.firebaseUid,
        params.email,
        params.cachedSupabaseUserId,
      );
    }

    const res = await fetch('/api/aw-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude:  params.latitude,
        longitude: params.longitude,
        repere:    params.repere,
        ville:     params.ville,
        quartier:  params.quartier,
        isPublic:  true,
        ...(supabaseUserId ? { supabaseUserId } : {}), // ← vrai propriétaire
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[AWAddressPicker] Create failed:', res.status, err);
      return { addr: null, supabaseUserId };
    }

    const data = await res.json();
    const addr: AWAddress = {
      addressCode:    data.addressCode    || '',
      latitude:       data.latitude       || params.latitude,
      longitude:      data.longitude      || params.longitude,
      repere:         data.repere         || params.repere,
      ville:          data.ville          || params.ville,
      quartier:       data.quartier       || params.quartier,
      isVerified:     false,
      shareLink:      data.shareLink      || `https://addressweb.brumerie.com/${data.addressCode}`,
      googleMapsLink: data.googleMaps     || data.googleMapsLink
        || `https://www.google.com/maps?q=${params.latitude},${params.longitude}`,
      editLink:       data.editLink,
    };
    return { addr, supabaseUserId };
  } catch (err) {
    console.error('[AWAddressPicker] Create exception:', err);
    return { addr: null, supabaseUserId: null };
  }
}

// ── Composant principal ───────────────────────────────────────
export function AWAddressPicker({
  value = '',
  onChange,
  onSaveToProfile,
  showSaveToProfile = false,
  placeholder = 'AW-ABJ-84321',
  label = 'Adresse de livraison',
  required = false,
  className = '',
  firebaseUid,
  email,
}: Props) {
  const [mode, setMode]               = useState<Mode>('idle');
  const [inputCode, setInputCode]     = useState(value);
  const [resolvedAddr, setResolvedAddr] = useState<AWAddress | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError]     = useState('');

  // Create flow
  const [createStep, setCreateStep]   = useState<CreateStep>('repere');
  const [gpsCoords, setGpsCoords]     = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState('');
  const [repere, setRepere]           = useState('');
  const [ville, setVille]             = useState('Abidjan');
  const [quartier, setQuartier]       = useState('');
  const [customQuartier, setCustomQuartier] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');
  const [createdAddr, setCreatedAddr]     = useState<AWAddress | null>(null);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [savingProfile, setSavingProfile]   = useState(false);

  // ── Résolution d'un code existant ────────────────────────────
  const handleCodeInput = useCallback(async (raw: string) => {
    const clean = formatAWCode(raw);
    setInputCode(clean);
    setResolveError('');
    setResolvedAddr(null);
    onChange?.(clean, null);

    if (!isValidAWCode(clean)) {
      if (clean.length > 5) setResolveError('Format invalide — ex: AW-ABJ-84321');
      return;
    }
    setResolveLoading(true);
    try {
      const addr = await resolveAWCode(clean);
      if (addr && addr.repere) {
        setResolvedAddr(addr);
        onChange?.(clean, addr);
      } else if (addr) {
        // Code valide mais pas de repère — API peut-être en fallback
        onChange?.(clean, addr);
        setResolveError('Adresse trouvée mais détails indisponibles pour le moment.');
      } else {
        setResolveError('Code introuvable. Vérifie le format ou crée une nouvelle adresse.');
      }
    } catch {
      setResolveError('Impossible de vérifier ce code. Réessaie.');
    } finally {
      setResolveLoading(false);
    }
  }, [onChange]);

  // ── Obtenir le GPS ────────────────────────────────────────────
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas disponible sur cet appareil.");
      setMode('create_manual');
      return;
    }
    setGpsLoading(true);
    setGpsError('');

    // Stratégie en 2 passes :
    // 1. Position rapide (réseau/WiFi) — affichée immédiatement pour ne pas bloquer l'UX
    // 2. Position GPS précise — remplace dès qu'elle arrive (jusqu'à 15s)
    let bestAccuracy = Infinity;

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;

      // On garde seulement si meilleure précision que ce qu'on a déjà
      if (accuracy < bestAccuracy) {
        bestAccuracy = accuracy;
        setGpsCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setGpsLoading(false);
        setMode('create_gps');
        setCreateStep('repere');
      }
    };

    const onError = (err: GeolocationPositionError) => {
      setGpsLoading(false);
      if (err.code === 1) {
        setGpsError("Permission refusée. Autorise la localisation dans ton navigateur ou crée manuellement.");
      } else {
        setGpsError("Impossible d'obtenir ta position. Crée manuellement.");
      }
      setMode('create_manual');
    };

    // Passe 1 — position rapide (réseau/WiFi, ~1-2s)
    navigator.geolocation.getCurrentPosition(onSuccess, () => {}, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 60000,
    });

    // Passe 2 — position GPS précise (satellite, ~10-15s)
    // Remplace la position précédente si meilleure précision
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0, // forcer une nouvelle mesure GPS
    });
  };

  // ── Créer l'adresse ───────────────────────────────────────────
  const handleCreate = async () => {
    const finalQuartier = quartier === '__custom__' ? customQuartier.trim() : quartier;
    if (!repere.trim()) { setCreateError('Décris un repère visible pour ton adresse.'); return; }
    if (!finalQuartier) { setCreateError('Indique ton quartier.'); return; }

    const coords = gpsCoords || { lat: 5.3599, lng: -4.0082 }; // fallback centre Abidjan

    setCreateLoading(true);
    setCreateError('');
    try {
      const addr = await createAWAddress({
        latitude:     coords.lat,
        longitude:    coords.lng,
        repere:       repere.trim(),
        ville:        ville,
        quartier:     finalQuartier,
        firebaseUid,  // pour créer l'adresse au nom de l'utilisateur réel
        email,
      });

      if (!addr || !addr.addressCode) {
        setCreateError("Impossible de créer l'adresse. Vérifie ta connexion.");
        return;
      }

      setCreatedAddr(addr);
      setCreateStep('done');
      setInputCode(addr.addressCode);
      setResolvedAddr(addr);
      onChange?.(addr.addressCode, addr);
    } catch {
      setCreateError("Erreur serveur. Réessaie dans quelques secondes.");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Sauvegarder dans le profil ────────────────────────────────
  const handleSaveToProfile = async () => {
    if (!createdAddr && !resolvedAddr) return;
    const addr = createdAddr || resolvedAddr!;
    const code = addr.addressCode || inputCode;
    if (!code || !onSaveToProfile) return;
    setSavingProfile(true);
    try {
      await onSaveToProfile(code, addr);
      setSavedToProfile(true);
    } catch {
      // silent
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────
  const reset = () => {
    setMode('idle');
    setCreateStep('repere');
    setGpsCoords(null);
    setGpsError('');
    setRepere('');
    setQuartier('');
    setCustomQuartier('');
    setCreatedAddr(null);
    setCreateError('');
    setSavedToProfile(false);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  const activeAddr = resolvedAddr || createdAddr;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          📍 {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </p>
      )}

      {/* ── Adresse déjà résolue / créée ── */}
      {activeAddr && activeAddr.repere && (
        <div className="mb-3 p-3.5 bg-green-50 rounded-2xl border border-green-200 flex items-start gap-3">
          <span className="text-green-500 text-base flex-shrink-0">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-green-900 font-mono">
              {activeAddr.addressCode}
            </p>
            <p className="text-[11px] text-green-800 font-medium mt-0.5 leading-snug">
              {activeAddr.repere}
            </p>
            {(activeAddr.quartier || activeAddr.ville) && (
              <p className="text-[10px] text-green-600 mt-0.5">
                {[activeAddr.quartier, activeAddr.ville].filter(Boolean).join(', ')}
              </p>
            )}
            {activeAddr.googleMapsLink && (
              <a href={activeAddr.googleMapsLink} target="_blank" rel="noopener noreferrer"
                className="text-[9px] text-blue-600 font-bold underline mt-1 inline-block">
                📍 Voir sur Google Maps
              </a>
            )}
            {activeAddr.editLink && (
              <a href={activeAddr.editLink} target="_blank" rel="noopener noreferrer"
                className="text-[9px] text-green-700 font-bold underline mt-0.5 inline-block">
                ✏️ Modifier / ajouter photos
              </a>
            )}
          </div>
          <button onClick={() => { reset(); setInputCode(''); onChange?.('', null); }}
            className="text-slate-300 text-xs hover:text-red-400 transition-colors flex-shrink-0 p-1">
            ✕
          </button>
        </div>
      )}

      {/* Bouton sauvegarder dans le profil */}
      {showSaveToProfile && activeAddr && !savedToProfile && onSaveToProfile && (
        <button onClick={handleSaveToProfile} disabled={savingProfile}
          className="w-full mb-3 py-2.5 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
          {savingProfile
            ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde...</>
            : <>💾 Sauvegarder dans mon profil</>}
        </button>
      )}
      {savedToProfile && (
        <p className="text-[10px] text-green-600 font-bold text-center mb-3">
          ✅ Adresse sauvegardée dans ton profil
        </p>
      )}

      {/* ── Mode idle — pas encore d'adresse ── */}
      {!activeAddr && mode === 'idle' && (
        <div className="space-y-2">
          {/* Entrer un code existant */}
          <div className="relative">
            <input
              value={inputCode}
              onChange={e => handleCodeInput(e.target.value)}
              placeholder={placeholder}
              maxLength={14}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[12px] font-mono font-bold uppercase outline-none focus:border-green-400 transition-all pr-10 placeholder:normal-case placeholder:font-sans placeholder:font-medium placeholder:text-slate-300"
            />
            {resolveLoading && (
              <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin"/>
            )}
          </div>
          {resolveError && (
            <p className="text-[10px] text-red-500 font-bold px-1">{resolveError}</p>
          )}

          {/* Séparateur */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-100"/>
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-slate-100"/>
          </div>

          {/* Créer une nouvelle adresse */}
          <p className="text-[9px] text-slate-400 font-medium text-center mb-1">
            Pas encore d'adresse AddressWeb ?
          </p>
          <button onClick={handleGetGPS} disabled={gpsLoading}
            className="w-full py-3.5 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-green disabled:opacity-60">
            {gpsLoading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Localisation en cours...</>
              : <>📍 Créer mon adresse avec GPS</>}
          </button>
          <button onClick={() => { setMode('create_manual'); setCreateStep('repere'); }}
            className="w-full py-3 rounded-2xl border-2 border-slate-200 bg-white text-[10px] font-bold text-slate-500 uppercase tracking-widest active:scale-[0.98] transition-all">
            ✏️ Créer sans GPS (manuel)
          </button>
          {gpsError && (
            <p className="text-[10px] text-amber-600 font-medium px-1 text-center">{gpsError}</p>
          )}
        </div>
      )}

      {/* ── Mode création (GPS ou manuel) ── */}
      {!activeAddr && (mode === 'create_gps' || mode === 'create_manual') && createStep === 'repere' && (
        <div className="bg-slate-50 rounded-3xl p-4 space-y-3 border border-slate-100">
          {/* GPS badge */}
          {mode === 'create_gps' && gpsCoords && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-2xl border border-green-100">
              <span className="text-green-500 text-sm">📍</span>
              <div className="flex-1">
                <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">
                  Position GPS détectée
                  {gpsCoords.accuracy && gpsCoords.accuracy > 50 && (
                    <span className="text-amber-500 ml-1 normal-case font-bold">— affinage en cours...</span>
                  )}
                </p>
                <p className="text-[9px] text-green-600 font-mono">
                  {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                  {gpsCoords.accuracy && (
                    <span className={`ml-2 font-bold ${gpsCoords.accuracy <= 20 ? 'text-green-600' : gpsCoords.accuracy <= 100 ? 'text-amber-500' : 'text-red-400'}`}>
                      ±{gpsCoords.accuracy}m
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          {mode === 'create_manual' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-amber-500 text-sm">✏️</span>
              <p className="text-[9px] text-amber-700 font-bold">Création manuelle — ton quartier sera utilisé comme position approximative.</p>
            </div>
          )}

          {/* Repère */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Repère visible * <span className="text-slate-300 normal-case font-normal">(bâtiment, magasin, entrée...)</span>
            </label>
            <input
              value={repere}
              onChange={e => setRepere(e.target.value)}
              placeholder="Ex: Face au magasin Carrefour, 2ème portail bleu"
              maxLength={120}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all"
            />
          </div>

          {/* Ville */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Ville *
            </label>
            <select value={ville} onChange={e => setVille(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all appearance-none">
              <option value="Abidjan">Abidjan</option>
              <option value="Bouaké">Bouaké</option>
              <option value="Yamoussoukro">Yamoussoukro</option>
              <option value="San-Pédro">San-Pédro</option>
              <option value="Korhogo">Korhogo</option>
              <option value="Daloa">Daloa</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Quartier */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Quartier *
            </label>
            <select value={quartier} onChange={e => setQuartier(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all appearance-none mb-2">
              <option value="">-- Sélectionne ton quartier --</option>
              {QUARTIERS_ABIDJAN.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
              <option value="__custom__">Autre quartier...</option>
            </select>
            {quartier === '__custom__' && (
              <input
                value={customQuartier}
                onChange={e => setCustomQuartier(e.target.value)}
                placeholder="Nom de ton quartier"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all"
              />
            )}
          </div>

          {createError && (
            <p className="text-[10px] text-red-500 font-bold px-1">{createError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={reset}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest active:scale-[0.98] transition-all">
              Annuler
            </button>
            <button onClick={handleCreate} disabled={createLoading || !repere.trim()}
              className="flex-[2] py-3 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
              {createLoading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Création...</>
                : <>✅ Créer mon adresse</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AWAddressPicker;
