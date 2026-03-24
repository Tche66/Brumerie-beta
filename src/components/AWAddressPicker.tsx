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
async function createAWAddress(params: {
  latitude: number; longitude: number;
  repere: string; ville: string; quartier?: string;
}): Promise<AWAddress | null> {
  try {
    const res = await fetch('/api/aw-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        isPublic: true,
        categorie: 'livraison', // userId résolu côté proxy via AW_BRUMERIE_USER_ID
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[AWAddressPicker] Create failed:', res.status, err);
      return null;
    }
    const data = await res.json();
    return {
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
    };
  } catch (err) {
    console.error('[AWAddressPicker] Create exception:', err);
    return null;
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
}: Props) {
  const [mode, setMode]               = useState<Mode>('idle');
  const [inputCode, setInputCode]     = useState(value);
  const [resolvedAddr, setResolvedAddr] = useState<AWAddress | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError]     = useState('');

  // Create flow
  const [createStep, setCreateStep]   = useState<CreateStep>('repere');
  const [gpsCoords, setGpsCoords]     = useState<{ lat: number; lng: number } | null>(null);
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        setMode('create_gps');
        setCreateStep('repere');
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Permission refusée. Autorise la localisation dans ton navigateur ou crée manuellement.");
        } else {
          setGpsError("Impossible d'obtenir ta position. Crée manuellement.");
        }
        setMode('create_manual');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
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
        latitude:  coords.lat,
        longitude: coords.lng,
        repere:    repere.trim(),
        ville:     ville,
        quartier:  finalQuartier,
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
              <div>
                <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Position GPS détectée</p>
                <p className="text-[9px] text-green-600 font-mono">
                  {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
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
