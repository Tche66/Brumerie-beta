// src/pages/GuidePage.tsx — Guide intégré dans l'app (fonctionne sans internet)
import React from 'react';

interface GuidePageProps { onBack: () => void; }

const sections = [
  {
    icon: '🛍',
    title: 'Acheter un article',
    steps: [
      'Parcours la page d\'accueil ou utilise la recherche',
      'Clique sur un article pour voir les détails',
      'Clique sur "Acheter" ou contacte le vendeur via le chat',
      'Choisis ton mode de paiement (Mobile Money ou Payer à la livraison)',
      'Confirme la réception et note le vendeur',
    ],
  },
  {
    icon: '📦',
    title: 'Publier une annonce',
    steps: [
      'Va sur l\'onglet "Vendre" (icône +)',
      'Ajoute des photos, un titre et une description',
      'Choisis la catégorie, le quartier et le prix',
      'Publie — ton article est visible immédiatement',
    ],
  },
  {
    icon: '💳',
    title: 'Modes de paiement',
    desc: 'Wave · Orange Money · MTN · Moov — ou Payer à la livraison.\n\nConfigure tes numéros dans Paramètres → Moyens de paiement.',
  },
  {
    icon: '🤝',
    title: 'Payer à la livraison',
    steps: [
      'Sélectionne "Payer à la livraison" lors de l\'achat',
      'Le vendeur confirme et prépare la livraison',
      'Tu reçois l\'article et tu paies sur place',
      'Confirme la réception pour terminer la transaction',
    ],
  },
  {
    icon: '⭐',
    title: 'Badge Vendeur Vérifié',
    desc: 'Obtiens le badge pour 2 000 FCFA et booste ta crédibilité. Les acheteurs voient ton badge sur tous tes articles.',
  },
  {
    icon: '🎁',
    title: 'Code de parrainage',
    desc: 'Partage ton code de parrainage (visible sur ton profil) et gagne des avantages quand quelqu\'un s\'inscrit avec ton code.',
  },
  {
    icon: '🤝',
    title: 'Partage ta boutique',
    desc: 'Sur ton profil vendeur, appuie sur l\'icône partage pour envoyer ton lien ou QR code sur WhatsApp, Facebook, Telegram...',
  },
  {
    icon: '📞',
    title: 'Support Brumerie',
    desc: 'WhatsApp : +225 05 86 86 76 93\nEmail : contact@brumerie.com',
  },
];

export function GuidePage({ onBack }: GuidePageProps) {
  return (
    <div className="min-h-screen pb-10 font-sans" style={{ background: '#0F172A' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 px-5 py-4 flex items-center gap-4"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack}
          className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-black text-white text-[13px] uppercase tracking-widest">Guide Brumerie</h1>
      </div>

      {/* Hero */}
      <div className="text-center px-6 pt-10 pb-8">
        <div className="text-5xl mb-4">📖</div>
        <h2 className="text-2xl font-black text-white mb-2" style={{ letterSpacing: '-0.5px' }}>
          Guide <span style={{ color: '#4ADE80' }}>Brumerie</span>
        </h2>
        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Tout ce qu'il faut savoir pour bien utiliser l'application
        </p>
      </div>

      {/* Sections */}
      <div className="px-5 space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-[1.25rem] p-5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{s.icon}</span>
              <p className="font-black text-white text-[13px]">{s.title}</p>
            </div>

            {s.steps ? (
              <div className="space-y-2">
                {s.steps.map((step, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(22,163,74,0.2)' }}>
                      <span className="text-[9px] font-black" style={{ color: '#4ADE80' }}>
                        {j === s.steps!.length - 1 ? '✓' : j + 1}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{step}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {s.desc}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 px-6">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Brumerie · Abidjan 🇨🇮
        </p>
      </div>
    </div>
  );
}
