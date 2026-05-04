// src/pages/CGUPage.tsx — Conditions Générales d'Utilisation
// Conformes au droit ivoirien · Marketplace C2C · Version Bêta MVP
import React, { useState, useEffect } from 'react';

interface CGUPageProps { onBack: () => void; }

const DATE_MAJ = '29 mars 2026';

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden mb-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white active:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 pr-4">
          <span className="w-7 h-7 rounded-xl bg-green-100 text-green-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">{num}</span>
          <span className="font-black text-[12px] uppercase tracking-tight text-slate-800">{title}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-slate-50">
          <div className="text-[12px] text-slate-600 leading-relaxed space-y-3 pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

export function CGUPage({ onBack }: CGUPageProps) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-slate-100 z-50 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <h1 className="font-black text-slate-900 text-[14px] uppercase tracking-tight">Conditions d'utilisation</h1>
          <p className="text-[10px] text-slate-400">CGU · CGV · Marketplace C2C</p>
        </div>
      </div>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <span className="text-xl">🧪</span>
          <div>
            <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-1">Version Bêta — Plateforme en test</p>
            <p className="text-[11px] text-amber-700 leading-snug">Brumerie est actuellement en phase de test technique (MVP). Les présentes conditions régissent l'utilisation de la plateforme durant cette période.</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
          <p className="text-[11px] font-black text-green-700 uppercase tracking-widest mb-2">Brumerie · Abidjan, Côte d'Ivoire 🇨🇮</p>
          <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Brumerie accessible sur <span className="font-bold text-slate-800">brumerie.com</span>. En utilisant Brumerie, vous acceptez sans réserve les présentes conditions.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">Mise à jour : {DATE_MAJ}</p>
            <p className="text-[10px] text-slate-400">Droit applicable : Loi ivoirienne</p>
          </div>
        </div>

        <Section num="1" title="Nature de la plateforme">
          <p>Brumerie est une <strong>plateforme d'hébergement d'annonces et de mise en relation</strong> entre particuliers (C2C) basés principalement à Abidjan, Côte d'Ivoire.</p>
          <p>Brumerie agit en qualité d'<strong>hébergeur technique</strong> et à ce titre :</p>
          <div className="space-y-1">
            {["N'est pas vendeur des produits proposés sur la plateforme","N'est pas partie aux transactions conclues entre utilisateurs","Ne garantit pas la qualité ou la légalité des produits proposés","Fournit uniquement l'infrastructure technique de mise en relation"].map(t => (
              <p key={t} className="flex gap-2"><span className="text-green-600 font-bold flex-shrink-0">→</span>{t}</p>
            ))}
          </div>
        </Section>

        <Section num="2" title="Inscription et compte">
          <p>Pour vendre sur Brumerie, vous devez créer un compte avec une adresse email valide. Vous êtes seul responsable de la confidentialité de vos identifiants.</p>
          <p>Vous vous engagez à fournir des informations exactes et à ne pas créer de faux comptes. Toute personne de moins de 18 ans doit obtenir l'autorisation d'un parent ou tuteur légal.</p>
        </Section>

        <Section num="3" title="Règles des annonces">
          <p className="font-bold text-green-700">Vous vous engagez à :</p>
          <div className="space-y-1">
            {["Publier uniquement des annonces véridiques avec des photos réelles","Indiquer un prix réel et honnête","Décrire fidèlement l'état et les caractéristiques du produit","Honorer vos engagements envers les acheteurs","Respecter les acheteurs dans toutes vos communications"].map(t => (
              <p key={t} className="flex gap-2"><span className="text-green-600 font-bold flex-shrink-0">✓</span>{t}</p>
            ))}
          </div>
          <p className="font-bold text-red-600 mt-2">Sont strictement interdits :</p>
          <div className="space-y-1">
            {["Armes, munitions et substances dangereuses","Drogues et substances illicites","Médicaments soumis à ordonnance","Contrefaçons et produits piratés","Contenus pornographiques ou illicites","Animaux protégés par la loi"].map(t => (
              <p key={t} className="flex gap-2"><span className="text-red-500 flex-shrink-0">✗</span>{t}</p>
            ))}
          </div>
          <p className="text-red-600">Tout manquement entraîne la <strong>suppression immédiate et définitive</strong> du compte.</p>
        </Section>

        <Section num="4" title="Transactions et droit de rétractation">
          <p>Les transactions sont conclues <strong>directement entre acheteurs et vendeurs</strong>. Brumerie facilite techniquement les paiements via Wave, Orange Money, MTN MoMo et Moov Money.</p>
          <p>Durant la phase bêta, <strong>Brumerie ne perçoit aucune commission</strong> sur les transactions.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="font-bold text-amber-800 text-[11px] uppercase tracking-wide mb-1">⚖️ Droit de rétractation — C2C</p>
            <p>Conformément au droit ivoirien, <strong>le droit de rétractation légal ne s'applique pas aux ventes entre particuliers</strong>. Les conditions de retour sont à négocier directement entre acheteur et vendeur. Brumerie peut intervenir comme médiateur à la demande des deux parties.</p>
          </div>
        </Section>

        <Section num="5" title="Limitation de responsabilité">
          <p>Brumerie ne peut être tenu responsable des produits vendus, de leur qualité, des pertes financières résultant d'une transaction, des contenus publiés par les utilisateurs, ni des interruptions de service liées à la maintenance ou à des cas de force majeure.</p>
        </Section>

        <Section num="6" title="Propriété intellectuelle">
          <p>L'ensemble des éléments de la plateforme Brumerie (logo, interface, code, nom) sont la propriété exclusive de Brumerie. Les contenus publiés par les vendeurs restent leur propriété. En publiant, vous accordez à Brumerie une licence d'affichage non exclusive et gratuite.</p>
        </Section>

        <Section num="7" title="Suspension de compte">
          <p>Brumerie peut suspendre ou supprimer tout compte qui viole ces conditions, publie des informations fausses, harcèle d'autres utilisateurs ou tente de frauder la plateforme.</p>
          <p>Vous pouvez supprimer votre compte à tout moment depuis les Paramètres ou en contactant le support.</p>
        </Section>

        <Section num="8" title="Droit applicable">
          <p>Les présentes conditions sont soumises au <strong>droit ivoirien</strong>. Tout litige sera soumis à la compétence des tribunaux d'Abidjan, Côte d'Ivoire, après tentative de résolution amiable.</p>
        </Section>

        <Section num="9" title="Contact">
          <div className="space-y-2">
            <p className="flex gap-2"><span className="text-green-600 font-bold">📧</span>contact@brumerie.com</p>
            <p className="flex gap-2"><span className="text-green-600 font-bold">💬</span>WhatsApp : +225 05 86 86 76 93</p>
            <p className="flex gap-2"><span className="text-green-600 font-bold">🌐</span>brumerie.com</p>
          </div>
        </Section>

        <div className="bg-slate-900 rounded-2xl p-5 text-center mt-6">
          <p className="text-white font-black text-[13px] uppercase tracking-wide mb-1">Brumerie · Abidjan 🇨🇮</p>
          <p className="text-slate-400 text-[11px] mb-1">Marketplace C2C · Commerce local</p>
          <p className="text-slate-500 text-[10px]">© {new Date().getFullYear()} Brumerie. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
