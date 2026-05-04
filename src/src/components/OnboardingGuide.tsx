// src/components/OnboardingGuide.tsx
// Guide nouvel utilisateur — Modal multi-slides par page + bouton '?'
import React, { useState, useEffect } from 'react';

// ── Contenu des guides par page ────────────────────────────────
const GUIDES: Record<string, { title: string; steps: { icon: string; title: string; desc: string }[] }> = {
  home: {
    title: "Bienvenue sur Brumerie 🛍",
    steps: [
      { icon: "🏠", title: "Ton marché de quartier", desc: "Trouve des articles vendus près de chez toi à Abidjan. Filtre par quartier, catégorie ou prix." },
      { icon: "🔍", title: "Recherche & Filtres", desc: "Utilise la barre de recherche en haut ou les filtres pour trouver exactement ce que tu cherches." },
      { icon: "❤️", title: "Sauvegarde tes coups de cœur", desc: "Clique sur le cœur d'un article pour le mettre en favoris. Retrouve-les dans ton profil." },
      { icon: "💬", title: "Contacte le vendeur", desc: "Sur la fiche d'un article, envoie un message direct au vendeur via le chat intégré." },
      { icon: "✅", title: "Badge Vérifié", desc: "Les vendeurs avec un badge bleu ✅ ont une identité contrôlée par Brumerie. C'est plus sûr !" },
    ],
  },
  sell: {
    title: "Vendre sur Brumerie 📦",
    steps: [
      { icon: "📸", title: "Ajoute de belles photos", desc: "Prends jusqu'à 5 photos nettes de ton article. Les annonces avec photos reçoivent 5x plus de contacts !" },
      { icon: "✏️", title: "Décris bien ton article", desc: "Titre clair, prix juste, état correct. Plus c'est précis, plus vite tu vends." },
      { icon: "📍", title: "Choisis ton quartier", desc: "Indique où tu te trouves pour que les acheteurs proches te trouvent facilement." },
      { icon: "🚀", title: "Publie et attends !", desc: "Ton article apparaît immédiatement sur l'accueil. Les acheteurs intéressés t'enverront un message." },
    ],
  },
  profile: {
    title: "Ton espace personnel 👤",
    steps: [
      { icon: "🖼️", title: "Complete ton profil", desc: "Ajoute une photo et une bio pour inspirer confiance aux acheteurs et vendeurs." },
      { icon: "📦", title: "Gère tes annonces", desc: "Retrouve ici tous tes articles actifs. Tu peux les marquer comme vendus ou les supprimer." },
      { icon: "⭐", title: "Tes avis clients", desc: "Après chaque transaction, les acheteurs peuvent laisser un avis. Un bon score = plus de ventes !" },
      { icon: "✅", title: "Badge Vérifié", desc: "Active le badge Vérifié pour booster ta visibilité et inspirer plus confiance. 1er mois offert !" },
    ],
  },
  default: {
    title: "Besoin d'aide ? 💡",
    steps: [
      { icon: "🛍", title: "Brumerie en bref", desc: "Brumerie est le marché digital de quartier à Abidjan. Achetez et vendez simplement, localement." },
      { icon: "🔒", title: "Sécurité", desc: "Préférez les vendeurs vérifiés. Pour votre sécurité, ne partagez jamais vos infos bancaires par chat." },
      { icon: "💬", title: "Support", desc: "Un problème ? Allez dans Paramètres → Support pour contacter l'équipe Brumerie sur WhatsApp." },
    ],
  },
};

interface OnboardingGuideProps {
  page: 'home' | 'sell' | 'profile' | string;
  userId?: string;
  /** Si true, affiche directement le modal (ex: bouton ?) */
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = (userId: string, page: string) => `brumerie_guide_seen_${userId}_${page}`;

export function OnboardingGuide({ page, userId, forceOpen = false, onClose }: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);

  const guide = GUIDES[page] || GUIDES.default;
  const total = guide.steps.length;

  // Afficher automatiquement si 1er login sur cette page
  useEffect(() => {
    if (!userId) return;
    if (forceOpen) { setVisible(true); setStep(0); return; }
    const key = STORAGE_KEY(userId, page);
    if (!localStorage.getItem(key)) {
      // Petit délai pour laisser la page s'afficher d'abord
      const t = setTimeout(() => { setVisible(true); setStep(0); }, 700);
      return () => clearTimeout(t);
    }
  }, [userId, page, forceOpen]);

  const handleClose = () => {
    if (userId) localStorage.setItem(STORAGE_KEY(userId, page), '1');
    setVisible(false);
    setStep(0);
    onClose?.();
  };

  const next = () => { if (step < total - 1) setStep(s => s + 1); else handleClose(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  if (!visible) return null;

  const current = guide.steps[step];

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-md rounded-[2.5rem] overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}
      >
        {/* Header gradient */}
        <div style={{ background: 'linear-gradient(135deg, #16A34A 0%, #0f5c2e 100%)', padding: '32px 28px 24px' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Guide · Étape {step + 1}/{total}
              </p>
              <h2 className="text-white font-black text-lg leading-tight">{guide.title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 mt-5">
            {guide.steps.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                className="cursor-pointer transition-all"
                style={{
                  height: 4,
                  borderRadius: 99,
                  flex: i === step ? 3 : 1,
                  background: i === step ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Contenu de l'étape */}
        <div className="px-7 py-6">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5 text-3xl"
            style={{ background: '#f0fdf4' }}
          >
            {current.icon}
          </div>
          <h3 className="font-black text-slate-900 text-lg mb-2">{current.title}</h3>
          <p className="text-slate-500 text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* Navigation */}
        <div className="px-7 pb-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 transition-all active:scale-95"
              style={{ background: '#f8fafc' }}
            >
              ← Précédent
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #16A34A, #0f5c2e)',
              boxShadow: '0 8px 24px rgba(22,163,74,0.35)',
            }}
          >
            {step < total - 1 ? 'Suivant →' : '✓ Compris !'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bouton Guide — mode SettingItem dans les paramètres ────────
interface GuideButtonProps {
  page: string;
  userId?: string;
  asSettingItem?: boolean;
}

export function GuideButton({ page, userId, asSettingItem = false }: GuideButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  return (
    <>
      {asSettingItem ? (
        // Rendu comme un item de paramètres (dans SettingsPage)
        <button
          onClick={handleOpen}
          className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 bg-green-50 transition-transform group-active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold tracking-tight text-slate-900">Guide de l'application</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">Revoir le tutoriel de démarrage</p>
          </div>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-slate-200">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : null}

      {open && (
        <OnboardingGuide
          page={page}
          userId={userId}
          forceOpen={true}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
