// src/pages/RapportPage.tsx — Rapport hebdomadaire vendeur
// "Chaque lundi, voici comment ta semaine s'est passée"
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeOrdersAsSeller } from '@/services/orderService';
import { getSellerProducts } from '@/services/productService';
import { Product } from '@/types';

interface RapportPageProps { onBack: () => void; }

function weekStart(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const mon = new Date(d.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}
function fmt(n: number) { return n.toLocaleString('fr-CI') + ' FCFA'; }

export function RapportPage({ onBack }: RapportPageProps) {
  const { currentUser, userProfile } = useAuth();

  const [orders, setOrders]     = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [semaine, setSemaine]   = useState(0); // 0 = semaine courante, -1 = semaine passée, etc.

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeOrdersAsSeller(currentUser.uid, o => { setOrders(o); setLoading(false); });
    getSellerProducts(currentUser.uid).then(setProducts);
    return unsub;
  }, [currentUser?.uid]);

  const wStart = weekStart(semaine);
  const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);

  const wOrders = orders.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d >= wStart && d < wEnd;
  });

  const delivered     = wOrders.filter(o => o.status === 'delivered' || o.status === 'cod_delivered');
  const pending       = wOrders.filter(o => !['delivered', 'cod_delivered', 'cancelled'].includes(o.status));
  const cancelled     = wOrders.filter(o => o.status === 'cancelled');
  const revenus       = delivered.reduce((s, o) => s + (o.sellerReceives || o.productPrice || 0), 0);
  const totalVues     = products.reduce((s, p) => s + (p.viewCount || 0), 0);
  const totalContacts = products.reduce((s, p) => s + (p.whatsappClickCount || 0), 0);
  const topProduit    = [...products].sort((a, b) => (b.whatsappClickCount || 0) - (a.whatsappClickCount || 0))[0];

  const wLabel = semaine === 0 ? 'Cette semaine'
    : semaine === -1 ? 'Semaine passée'
    : `Il y a ${Math.abs(semaine)} semaines`;

  const wRange = `${wStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${new Date(wEnd.getTime() - 1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;

  const scorePerf = (() => {
    if (delivered.length === 0) return { label: 'Pas encore de ventes', color: 'text-slate-400', emoji: '😴' };
    if (revenus >= 100000) return { label: 'Excellente semaine !', color: 'text-green-700', emoji: '🚀' };
    if (revenus >= 50000)  return { label: 'Bonne semaine !', color: 'text-green-600', emoji: '✅' };
    if (revenus >= 20000)  return { label: 'Semaine correcte', color: 'text-amber-600', emoji: '🟡' };
    return { label: 'Semaine calme', color: 'text-slate-500', emoji: '😐' };
  })();

  const shareRapport = async () => {
    const text = `📊 Mon rapport Brumerie — ${wLabel}\n\n✅ Ventes livrées : ${delivered.length}\n💰 Revenus : ${fmt(revenus)}\n📦 Commandes en cours : ${pending.length}\n\n${scorePerf.emoji} ${scorePerf.label}\n\nGéré avec Brumerie · brumerie.com`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  // ── Garde Vérifié / Premium ───────────────────────────────
  if (!userProfile?.isVerified && !userProfile?.isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-5xl mb-4">🔵</div>
        <h2 className="font-black text-[20px] text-slate-900 text-center mb-2">📬 Rapport Hebdomadaire</h2>
        <p className="text-[12px] text-slate-500 text-center leading-relaxed mb-6 max-w-xs">
          Le rapport de ventes est réservé aux vendeurs <strong>🔵 Vérifiés</strong> et <strong>⭐ Premium</strong>.
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
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">📬 Rapport Hebdo</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{wRange}</p>
        </div>
        <button onClick={shareRapport}
          className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-[9px] font-black text-slate-600 uppercase active:scale-95">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Partager
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Navigation semaines */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-100">
          <button onClick={() => setSemaine(s => s - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:scale-90 transition-all">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="text-center">
            <p className="font-black text-slate-900 text-[13px]">{wLabel}</p>
            <p className="text-[9px] text-slate-400">{wRange}</p>
          </div>
          <button onClick={() => setSemaine(s => Math.min(s + 1, 0))} disabled={semaine === 0}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:scale-90 transition-all disabled:opacity-30">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Score semaine */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center">
          <p className="text-5xl mb-2">{scorePerf.emoji}</p>
          <p className={`font-black text-[18px] ${scorePerf.color} mb-1`}>{scorePerf.label}</p>
          <p className="text-[11px] text-slate-400">{userProfile?.name} · Brumerie</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto"/>
          </div>
        ) : (
          <>
            {/* KPIs semaine */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '💰', label: 'Revenus semaine', value: fmt(revenus), bg: 'bg-green-50 border-green-200', vc: 'text-green-700' },
                { icon: '✅', label: 'Ventes livrées', value: String(delivered.length), bg: 'bg-blue-50 border-blue-100', vc: 'text-blue-700' },
                { icon: '📦', label: 'En cours', value: String(pending.length), bg: 'bg-amber-50 border-amber-100', vc: 'text-amber-700' },
                { icon: '❌', label: 'Annulées', value: String(cancelled.length), bg: 'bg-red-50 border-red-100', vc: 'text-red-600' },
              ].map(k => (
                <div key={k.label} className={`rounded-2xl p-4 border-2 ${k.bg}`}>
                  <p className="text-xl mb-1">{k.icon}</p>
                  <p className={`font-black text-[16px] leading-none ${k.vc}`}>{k.value}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Stats boutique (toutes périodes) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Boutique — Cumul total</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">👁 Vues totales</p>
                  <p className="font-black text-[15px] text-slate-800">{totalVues.toLocaleString('fr-CI')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">💬 Contacts</p>
                  <p className="font-black text-[15px] text-slate-800">{totalContacts.toLocaleString('fr-CI')}</p>
                </div>
              </div>
            </div>

            {/* Top produit */}
            {topProduit && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">⭐ Produit le plus populaire</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {topProduit.images?.[0] && <img src={topProduit.images[0]} alt="" className="w-full h-full object-cover"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-[13px] truncate">{topProduit.title}</p>
                    <p className="text-[12px] text-green-600 font-bold">{topProduit.price.toLocaleString('fr-CI')} FCFA</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[9px] text-slate-400">👁 {topProduit.viewCount || 0} vues</span>
                      <span className="text-[9px] text-slate-400">💬 {topProduit.whatsappClickCount || 0} contacts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conseil de la semaine */}
            <div className="bg-slate-900 rounded-3xl p-5">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">💡 Conseil Brumerie</p>
              {delivered.length === 0 ? (
                <p className="text-[12px] text-white leading-snug">
                  Tu n'as pas encore de ventes cette semaine. Partage ton catalogue WhatsApp à tes contacts pour attirer tes premiers clients !
                </p>
              ) : totalVues > 0 && (totalContacts / totalVues) < 0.05 ? (
                <p className="text-[12px] text-white leading-snug">
                  Tes produits sont vus mais peu de gens te contactent ({((totalContacts/totalVues)*100).toFixed(1)}% de taux de contact). Améliore tes photos et descriptions !
                </p>
              ) : revenus > 0 ? (
                <p className="text-[12px] text-white leading-snug">
                  Beau travail ! {delivered.length} vente{delivered.length > 1 ? 's' : ''} cette semaine pour {fmt(revenus)}. Continue à publier régulièrement pour maintenir ton rythme.
                </p>
              ) : (
                <p className="text-[12px] text-white leading-snug">
                  Active les notifications pour être alerté dès qu'un client te contacte. Ne laisse jamais une opportunité sans réponse !
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
