// src/pages/CataloguePage.tsx — Catalogue partageable en 1 tap
// Génère un lien + message WhatsApp avec tous les articles actifs
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSellerProducts } from '@/services/productService';
import { Product } from '@/types';

interface CataloguePageProps { onBack: () => void; }

export function CataloguePage({ onBack }: CataloguePageProps) {
  const { currentUser, userProfile } = useAuth();

  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [copied, setCopied]       = useState(false);
  const [msgType, setMsgType]     = useState<'simple' | 'promo' | 'nouveau'>('simple');

  useEffect(() => {
    if (!currentUser?.uid) return;
    getSellerProducts(currentUser.uid).then(p => {
      const actifs = p.filter(x => x.status === 'active');
      setProducts(actifs);
      setSelected(new Set(actifs.map(x => x.id)));
      setLoading(false);
    });
  }, [currentUser?.uid]);

  const actifs    = products.filter(p => p.status === 'active');
  const choisis   = actifs.filter(p => selected.has(p.id));

  const profileUrl = `https://brumerie.com/vendeur/${currentUser?.uid}`;

  const buildMessage = () => {
    const nom = userProfile?.name || 'Votre vendeur';
    const intro: Record<string, string> = {
      simple:  `🛍️ Bonjour ! Je suis ${nom} sur Brumerie.\n\nVoici mes articles disponibles :`,
      promo:   `🎉 OFFRE SPÉCIALE ! Je suis ${nom} sur Brumerie.\n\nProfitez de ces articles à prix réduit :`,
      nouveau: `✨ NOUVEAUTÉS ! Je suis ${nom} sur Brumerie.\n\nDécouvrez mes derniers articles :`,
    };
    const lines = choisis.map((p, i) =>
      `${i + 1}. *${p.title}*\n   💰 ${p.price.toLocaleString('fr-CI')} FCFA${p.neighborhood ? `  📍 ${p.neighborhood}` : ''}`
    ).join('\n\n');
    return `${intro[msgType]}\n\n${lines}\n\n👉 Voir ma boutique complète :\n${profileUrl}\n\nContactez-moi directement pour commander ! 📲`;
  };

  const message = buildMessage();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const toggleAll = () => {
    if (selected.size === actifs.length) setSelected(new Set());
    else setSelected(new Set(actifs.map(p => p.id)));
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // ── Garde Vérifié / Premium ───────────────────────────────
  if (!userProfile?.isVerified && !userProfile?.isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-5xl mb-4">🔵</div>
        <h2 className="font-black text-[20px] text-slate-900 text-center mb-2">🖼️ Catalogue WhatsApp</h2>
        <p className="text-[12px] text-slate-500 text-center leading-relaxed mb-6 max-w-xs">
          Le catalogue de partage est réservé aux vendeurs <strong>🔵 Vérifiés</strong> et <strong>⭐ Premium</strong>.
        </p>
        <button onClick={{onBack}}
          className="w-full max-w-xs py-4 rounded-[2rem] bg-slate-100 text-slate-600 font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all">
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">🖼️ Catalogue WhatsApp</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase">{choisis.length}/{actifs.length} articles sélectionnés</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto"/>
          </div>
        ) : actifs.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="font-black text-slate-400 uppercase text-[12px] mb-1">Aucun article en ligne</p>
            <p className="text-[10px] text-slate-300">Publie des articles pour créer ton catalogue</p>
          </div>
        ) : (
          <>
            {/* Type de message */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Type de message</p>
              <div className="flex gap-2">
                {[
                  { id: 'simple', label: '📋 Standard' },
                  { id: 'promo',  label: '🎉 Promo' },
                  { id: 'nouveau', label: '✨ Nouveauté' },
                ].map(t => (
                  <button key={t.id} onClick={() => setMsgType(t.id as any)}
                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all border-2 ${
                      msgType === t.id ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection articles */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Choisir les articles</p>
                <button onClick={toggleAll}
                  className="text-[9px] font-black text-green-600 uppercase tracking-wide active:scale-95">
                  {selected.size === actifs.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {actifs.map(p => (
                  <button key={p.id} onClick={() => toggle(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-all text-left">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selected.has(p.id) ? 'bg-green-600 border-green-600' : 'border-slate-200'
                    }`}>
                      {selected.has(p.id) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-[12px] truncate">{p.title}</p>
                      <p className="text-[10px] text-green-600 font-bold">{p.price.toLocaleString('fr-CI')} FCFA</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aperçu message */}
            {choisis.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Aperçu du message</p>
                <div className="bg-slate-50 rounded-2xl p-4 max-h-52 overflow-y-auto">
                  <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-mono">{message}</p>
                </div>
              </div>
            )}

            {/* CTA */}
            {choisis.length > 0 && (
              <div className="space-y-2">
                {/* Lien boutique Brumerie — pour partager entre utilisateurs */}
                <button onClick={async () => {
                  const url = profileUrl;
                  if (navigator.share) {
                    try { await navigator.share({ title: userProfile?.name + ' sur Brumerie', url }); } catch {}
                  } else {
                    await navigator.clipboard.writeText(url);
                  }
                }}
                  className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Partager ma boutique Brumerie
                </button>
                <p className="text-[9px] text-center text-slate-400">— ou envoyer le catalogue complet sur —</p>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2 block text-center"
                  style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 2C6.465 2 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977A9.97 9.97 0 0012 2z"/></svg>
                  Envoyer sur WhatsApp
                </a>
                <button onClick={handleCopy}
                  className={`w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all ${
                    copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {copied ? '✅ Copié !' : '📋 Copier le message'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
