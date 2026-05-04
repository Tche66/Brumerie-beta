// src/components/AWAddressPicker.tsx — v3 CLEAN
// Fix définitif : suppression du useEffect de sync qui annulait les actions utilisateur
// Logique d'affichage unifiée : on compare value (prop externe) vs inputCode (état local)

import React, { useState, useCallback, useRef } from 'react';
import {
  isValidAWCode,
  resolveAWCode,
  formatAWCode,
  AWAddress,
} from '@/services/awService';

interface Props {
  value?: string;
  onChange?: (code: string, addr: AWAddress | null) => void;
  onSaveToProfile?: (code: string, addr: AWAddress) => Promise<void>;
  onRemoveFromProfile?: () => Promise<void>;
  showSaveToProfile?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  firebaseUid?: string;
}

type Mode = 'idle' | 'enter_code' | 'create_gps' | 'create_manual';
type CreateStep = 'repere' | 'confirming' | 'done';

const QUARTIERS_ABIDJAN = [
  'Yopougon','Cocody','Abobo','Adjamé','Plateau','Marcory','Treichville',
  'Koumassi','Port-Bouët','Attécoubé','Bingerville','Songon',
  'Deux-Plateaux','Riviera','Angré','Bonoumin','Palmeraie',
  'Williamsville','Locodjro','Niangon','Sogefiha',
];

async function createAWAddress(params: {
  latitude: number; longitude: number;
  repere: string; ville: string; quartier?: string;
  categorie?: string; firebaseUid?: string;
}): Promise<AWAddress | null> {
  try {
    const res = await fetch('/api/aw-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: params.latitude, longitude: params.longitude,
        repere: params.repere, ville: params.ville,
        quartier: params.quartier, isPublic: true,
        categorie: params.categorie || 'maison',
        firebaseUid: params.firebaseUid,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      addressCode:    data.addressCode || '',
      latitude:       data.latitude || params.latitude,
      longitude:      data.longitude || params.longitude,
      repere:         data.repere || params.repere,
      ville:          data.ville || params.ville,
      quartier:       data.quartier || params.quartier,
      isVerified:     false,
      shareLink:      data.shareLink || `https://addressweb.brumerie.com/${data.addressCode}`,
      googleMapsLink: data.googleMapsLink || data.googleMaps
        || `https://www.google.com/maps?q=${params.latitude},${params.longitude}`,
      editEndpoint:   data.editEndpoint,
    };
  } catch { return null; }
}

export function AWAddressPicker({
  value = '',
  onChange,
  onSaveToProfile,
  onRemoveFromProfile,
  showSaveToProfile = false,
  placeholder = 'AW-ABJ-84321',
  label = 'Adresse de livraison',
  required = false,
  className = '',
  firebaseUid,
}: Props) {
  // ── États internes ────────────────────────────────────────────
  const [mode, setMode]                 = useState<Mode>('idle');
  const [inputCode, setInputCode]       = useState(value);
  const [resolvedAddr, setResolvedAddr] = useState<AWAddress | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError]     = useState('');

  const [createStep, setCreateStep]     = useState<CreateStep>('repere');
  const [gpsCoords, setGpsCoords]       = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [gpsError, setGpsError]         = useState('');
  const [repere, setRepere]             = useState('');
  const [ville, setVille]               = useState('Abidjan');
  const [quartier, setQuartier]         = useState('');
  const [customQuartier, setCustomQuartier] = useState('');
  const [categorie, setCategorie]       = useState('maison');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');
  const [createdAddr, setCreatedAddr]     = useState<AWAddress | null>(null);

  const [savingProfile, setSavingProfile]   = useState(false);
  const [removingProfile, setRemovingProfile] = useState(false);
  const [editLoading, setEditLoading]       = useState(false);
  const [editError, setEditError]           = useState('');

  // ── Indicateur "mode remplacement actif" ──────────────────────
  // Quand l'utilisateur clique Remplacer, on passe en mode édition
  // même si value (prop externe) est toujours défini
  const [replacing, setReplacing] = useState(false);
  const [saved, setSaved]         = useState(false); // confirmation visuelle après save

  // ── Résolution au montage si value fourni ─────────────────────
  const initialized = useRef(false);
  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (value && isValidAWCode(value)) {
      setInputCode(value);
      resolveAWCode(value).then(addr => {
        if (addr) setResolvedAddr(addr);
      }).catch(() => {});
    }
  }, []); // volontairement vide — ne se relance PAS sur les re-renders

  // ── Logique d'affichage ───────────────────────────────────────
  const activeAddr   = resolvedAddr || createdAddr;
  // L'adresse est "en profil" si value (prop Firebase) est défini ET qu'on n'est pas en mode remplacement
  const isInProfile  = !!value && !replacing;
  // Afficher le formulaire de saisie si pas d'adresse OU en mode remplacement
  const showForm     = !activeAddr || replacing;

  // ── Handlers ─────────────────────────────────────────────────

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
      if (addr?.repere) {
        setResolvedAddr(addr);
        onChange?.(clean, addr);
      } else {
        setResolveError('Code introuvable. Vérifie le format ou crée une nouvelle adresse.');
      }
    } catch {
      setResolveError('Impossible de vérifier ce code. Réessaie.');
    } finally {
      setResolveLoading(false);
    }
  }, [onChange]);

  const handleGetGPS = () => {
    if (!navigator.geolocation) { setGpsError("Géolocalisation indisponible."); setMode('create_manual'); return; }
    setGpsLoading(true); setGpsError('');
    let bestAccuracy = Infinity;
    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      if (accuracy < bestAccuracy) {
        bestAccuracy = accuracy;
        setGpsCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setGpsLoading(false); setMode('create_gps'); setCreateStep('repere');
      }
    };
    const onError = () => { setGpsLoading(false); setGpsError("Position indisponible."); setMode('create_manual'); };
    navigator.geolocation.getCurrentPosition(onSuccess, () => {}, { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 });
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };

  const handleCreate = async () => {
    const finalQuartier = quartier === '__custom__' ? customQuartier.trim() : quartier;
    if (!repere.trim()) { setCreateError('Décris un repère visible.'); return; }
    if (!finalQuartier) { setCreateError('Indique ton quartier.'); return; }
    const coords = gpsCoords || { lat: 5.3599, lng: -4.0082 };
    setCreateLoading(true); setCreateError('');
    try {
      const addr = await createAWAddress({
        latitude: coords.lat, longitude: coords.lng,
        repere: repere.trim(), ville, quartier: finalQuartier,
        categorie, firebaseUid,
      });
      if (!addr?.addressCode) { setCreateError("Impossible de créer l'adresse. Vérifie ta connexion."); return; }
      setCreatedAddr(addr);
      setCreateStep('done');
      setInputCode(addr.addressCode);
      setResolvedAddr(addr);
      onChange?.(addr.addressCode, addr);
      setReplacing(false);
    } catch { setCreateError("Erreur serveur. Réessaie."); }
    finally { setCreateLoading(false); }
  };

  const handleSaveToProfile = async () => {
    if (!activeAddr || !onSaveToProfile) return;
    const code = activeAddr.addressCode || inputCode;
    if (!code) return;
    setSavingProfile(true);
    try {
      await onSaveToProfile(code, activeAddr);
      setSaved(true);
      setReplacing(false);
    } catch { /* silent */ }
    finally { setSavingProfile(false); }
  };

  const handleRemoveFromProfile = async () => {
    if (!onRemoveFromProfile) return;
    setRemovingProfile(true);
    try {
      await onRemoveFromProfile();
      // Reset complet de l'état local
      setResolvedAddr(null);
      setCreatedAddr(null);
      setInputCode('');
      setMode('idle');
      setReplacing(false);
      setSaved(false);
      onChange?.('', null);
    } catch { /* silent */ }
    finally { setRemovingProfile(false); }
  };

  const handleReplace = () => {
    setReplacing(true);
    setSaved(false);
    setResolvedAddr(null);
    setCreatedAddr(null);
    setInputCode('');
    setMode('idle');
    setRepere(''); setQuartier(''); setCustomQuartier('');
    setCreateError(''); setResolveError('');
  };

  const handleCancel = () => {
    setReplacing(false);
    setMode('idle');
    // Restaurer l'adresse depuis value
    if (value && isValidAWCode(value)) {
      setInputCode(value);
      resolveAWCode(value).then(addr => { if (addr) setResolvedAddr(addr); }).catch(() => {});
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          📍 {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </p>
      )}

      {/* ── ADRESSE ACTIVE (en profil, pas en mode remplacement) ── */}
      {activeAddr?.repere && !replacing && (
        <div className="mb-3 p-3.5 bg-green-50 rounded-2xl border border-green-200 flex items-start gap-3">
          <span className="text-green-500 text-base flex-shrink-0">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-green-900 font-mono">{activeAddr.addressCode}</p>
            <p className="text-[11px] text-green-800 font-medium mt-0.5 leading-snug">{activeAddr.repere}</p>
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
            {activeAddr.addressCode && firebaseUid && (
              <div className="mt-1">
                <button disabled={editLoading}
                  onClick={async () => {
                    setEditLoading(true); setEditError('');
                    try {
                      const r = await fetch('https://addressweb.brumerie.com/api/brumerie-edit', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: activeAddr.addressCode, uid: firebaseUid }),
                      });
                      if (!r.ok) { window.open(`https://addressweb.brumerie.com/${activeAddr.addressCode}`, '_blank', 'noopener,noreferrer'); return; }
                      const d = await r.json();
                      window.open(d.editUrl || `https://addressweb.brumerie.com/${activeAddr.addressCode}`, '_blank', 'noopener,noreferrer');
                    } catch { window.open(`https://addressweb.brumerie.com/${activeAddr.addressCode}`, '_blank', 'noopener,noreferrer'); }
                    finally { setEditLoading(false); }
                  }}
                  className="text-[9px] text-green-700 font-bold underline bg-transparent border-none cursor-pointer p-0 flex items-center gap-1 disabled:opacity-50">
                  {editLoading ? <><span className="w-2.5 h-2.5 border border-green-600 border-t-transparent rounded-full animate-spin inline-block"/>Chargement...</> : <>✏️ Modifier / ajouter photos</>}
                </button>
                {editError && <p className="text-[9px] text-red-500 font-bold mt-0.5">{editError}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOUTONS ACTION : Sauvegarder / Remplacer / Supprimer ── */}
      {showSaveToProfile && (
        <div className="mb-3 space-y-2">

          {/* Cas 1 : Nouvelle adresse résolue/créée, pas encore en profil → Sauvegarder */}
          {activeAddr && !isInProfile && !replacing && (
            <button onClick={handleSaveToProfile} disabled={savingProfile}
              className="w-full py-3 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
              {savingProfile
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde...</>
                : <>💾 Sauvegarder dans mon profil</>}
            </button>
          )}

          {/* Confirmation save */}
          {saved && !replacing && (
            <p className="text-[10px] text-green-600 font-black text-center">✅ Adresse sauvegardée</p>
          )}

          {/* Cas 2 : Adresse déjà en profil (value défini) → Remplacer + Supprimer */}
          {isInProfile && !replacing && (
            <div className="flex gap-2">
              <button onClick={handleReplace}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                🔄 Remplacer
              </button>
              {onRemoveFromProfile && (
                <button onClick={handleRemoveFromProfile} disabled={removingProfile}
                  className="flex-1 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50">
                  {removingProfile
                    ? <><span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"/>...</>
                    : <>🗑️ Supprimer</>}
                </button>
              )}
            </div>
          )}

          {/* Cas 3 : En mode remplacement avec nouvelle adresse → Sauvegarder la nouvelle + Annuler */}
          {replacing && activeAddr && (
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wide active:scale-95 transition-all">
                ✕ Annuler
              </button>
              <button onClick={handleSaveToProfile} disabled={savingProfile}
                className="flex-[2] py-3 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
                {savingProfile
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde...</>
                  : <>💾 Sauvegarder</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FORMULAIRE DE SAISIE (si pas d'adresse active OU en mode remplacement) ── */}
      {(!activeAddr || replacing) && (

        <div className="space-y-3">
          {/* En-tête si remplacement */}
          {replacing && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex gap-2 items-center">
              <span>🔄</span>
              <p className="text-[10px] font-bold text-amber-800">Entre ton nouveau code AW ou crée une nouvelle adresse.</p>
            </div>
          )}

          {/* Saisie code existant */}
          {(mode === 'idle' || mode === 'enter_code') && (
            <div>
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
              {resolveError && <p className="text-[10px] text-red-500 font-bold px-1 mt-1">{resolveError}</p>}

              {/* Boutons créer */}
              <div className="flex gap-2 mt-3">
                <button onClick={handleGetGPS} disabled={gpsLoading}
                  className="flex-1 py-3 rounded-2xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60">
                  {gpsLoading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>GPS...</> : <>📍 Créer avec GPS</>}
                </button>
                <button onClick={() => setMode('create_manual')}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wide active:scale-95 transition-all">
                  ✏️ Manuel
                </button>
              </div>
              {gpsError && <p className="text-[10px] text-red-500 font-bold px-1 mt-1">{gpsError}</p>}
            </div>
          )}

          {/* Formulaire création GPS ou Manuel */}
          {(mode === 'create_gps' || mode === 'create_manual') && createStep === 'repere' && (
            <div className="bg-slate-50 rounded-3xl p-4 space-y-3 border border-slate-100">
              {mode === 'create_gps' && gpsCoords && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-2xl border border-green-100">
                  <span className="text-green-500 text-sm">📍</span>
                  <div>
                    <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Position GPS détectée</p>
                    <p className="text-[9px] text-green-600 font-mono">
                      {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                      {gpsCoords.accuracy && <span className="ml-2 font-bold text-green-600">±{gpsCoords.accuracy}m</span>}
                    </p>
                  </div>
                </div>
              )}
              {mode === 'create_manual' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-2xl border border-amber-100">
                  <span>✏️</span>
                  <p className="text-[9px] text-amber-700 font-bold">Création manuelle — ton quartier sera utilisé comme position.</p>
                </div>
              )}

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Repère visible *</label>
                <input value={repere} onChange={e => setRepere(e.target.value)}
                  placeholder="Ex: Face au magasin Carrefour, 2ème portail bleu"
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all"/>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Ville *</label>
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

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Quartier *</label>
                <select value={quartier} onChange={e => setQuartier(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all appearance-none mb-2">
                  <option value="">-- Sélectionne ton quartier --</option>
                  {QUARTIERS_ABIDJAN.map(q => <option key={q} value={q}>{q}</option>)}
                  <option value="__custom__">Autre quartier...</option>
                </select>
                {quartier === '__custom__' && (
                  <input value={customQuartier} onChange={e => setCustomQuartier(e.target.value)}
                    placeholder="Nom de ton quartier"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-[12px] outline-none focus:border-green-400 transition-all"/>
                )}
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Type de lieu</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'maison', label: '🏠 Maison' },
                    { value: 'commerce', label: '🏪 Commerce' },
                    { value: 'bureau', label: '🏢 Bureau' },
                    { value: 'restaurant', label: '🍽️ Restaurant' },
                    { value: 'evenement', label: '🎉 Événement' },
                    { value: 'autre', label: '📍 Autre' },
                  ].map(cat => (
                    <button key={cat.value} type="button" onClick={() => setCategorie(cat.value)}
                      className={`py-2.5 px-2 rounded-2xl border-2 text-[10px] font-bold transition-all text-center active:scale-95 ${
                        categorie === cat.value ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-500'
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {createError && <p className="text-[10px] text-red-500 font-bold px-1">{createError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setMode('idle'); setCreateError(''); }}
                  className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest active:scale-[0.98] transition-all">
                  Retour
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
      )}
    </div>
  );
}

export default AWAddressPicker;
