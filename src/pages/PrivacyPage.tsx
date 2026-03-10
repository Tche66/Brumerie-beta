// src/pages/PrivacyPage.tsx — Sprint 10 : Légal complet CGU + Confidentialité + Anti-Fraude
import React, { useState } from 'react';
import { SUPPORT_EMAIL } from '@/types';

interface PrivacyPageProps {
  onBack: () => void;
  isTerms?: boolean;
  isAbout?: boolean;
}

const DATE = '26 février 2026';

// ── Composants réutilisables ──────────────────────────────────
function Article({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left active:bg-slate-50 transition-colors"
      >
        <span className="font-black text-[11px] uppercase tracking-widest text-slate-800 pr-4">{title}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-5 space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-slate-600 leading-relaxed">{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-slate-300 mt-1 flex-shrink-0 text-xs">·</span>
          <span className="text-[12px] text-slate-600 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
      <p className="text-[11px] font-black text-amber-800">⚠️ {children}</p>
    </div>
  );
}

// ── CGU ──────────────────────────────────────────────────────
function TabCGU() {
  return (
    <div>
      {/* Bandeau intro */}
      <div className="mx-4 mt-5 mb-1 bg-slate-900 rounded-3xl px-5 py-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Version 1.0 · {DATE}</p>
        <p className="text-white font-black text-[13px] leading-snug">Conditions Générales d'Utilisation</p>
        <p className="text-slate-400 text-[10px] font-medium mt-1">Plateforme de mise en relation C2C — sans paiement intégré</p>
      </div>

      <div className="mt-4 bg-white rounded-3xl mx-4 border border-slate-100 overflow-hidden">

        <Article title="Art. 1 — Objet">
          <P>Les présentes CGU régissent l'accès et l'utilisation de la plateforme numérique Brumerie.</P>
          <P>Brumerie est une plateforme technologique permettant la mise en relation entre utilisateurs souhaitant vendre ou acheter des biens ou services localement.</P>
          <P>Toute utilisation de la plateforme implique l'acceptation sans réserve des présentes CGU.</P>
        </Article>

        <Article title="Art. 2 — Nature du service (MVP)">
          <P>Brumerie est une <strong>plateforme de mise en relation</strong>. Brumerie :</P>
          <List items={[
            "N'est pas propriétaire des biens publiés",
            "N'est pas revendeur",
            "N'est pas partie au contrat de vente",
            "N'est pas transporteur",
            "N'est pas intermédiaire de paiement",
            "Ne collecte, ne conserve et ne transfère aucun fonds",
          ]} />
          <P>Les paiements sont effectués directement entre les utilisateurs, en dehors de la plateforme. Le contrat de vente est conclu exclusivement entre l'Acheteur et le Vendeur.</P>
        </Article>

        <Article title="Art. 3 — Évolution du service">
          <P>Certaines fonctionnalités peuvent être présentées comme prévues (paiement intégré, escrow). Ces fonctionnalités :</P>
          <List items={[
            "Ne sont pas actives dans la version actuelle (MVP)",
            "Ne constituent pas un engagement contractuel",
            "Peuvent être modifiées, reportées ou supprimées",
          ]} />
          <P>Seules les fonctionnalités effectivement disponibles dans l'application engagent Brumerie.</P>
        </Article>

        <Article title="Art. 4 — Inscription et compte">
          <P>L'utilisateur doit :</P>
          <List items={[
            "Être juridiquement capable",
            "Fournir des informations exactes",
            "Utiliser la plateforme de manière licite",
          ]} />
          <P>Chaque utilisateur est responsable de son compte et des activités réalisées via celui-ci.</P>
        </Article>

        <Article title="Art. 5 — Responsabilité des vendeurs">
          <P>Le Vendeur est seul responsable :</P>
          <List items={[
            "De la légalité des produits proposés",
            "De l'exactitude des descriptions",
            "De la conformité aux lois applicables",
            "De la fixation des prix",
            "De la réception des paiements",
            "De l'exécution de la livraison ou remise",
          ]} />
          <P>Brumerie ne garantit ni la solvabilité de l'acheteur ni la qualité des biens proposés.</P>
        </Article>

        <Article title="Art. 6 — Responsabilité des acheteurs">
          <P>L'Acheteur est seul responsable :</P>
          <List items={[
            "Du choix du vendeur",
            "Du paiement effectué hors plateforme",
            "De la vérification du produit",
            "Des modalités de remise",
          ]} />
          <Warning>Brumerie ne peut être tenue responsable en cas de non-livraison, défaut produit ou fraude.</Warning>
        </Article>

        <Article title="Art. 7 — Suivi des transactions">
          <P>La plateforme peut permettre l'enregistrement de statuts, le dépôt de preuves, la notation des utilisateurs et un système de réputation.</P>
          <P>Ces outils ont une finalité <strong>informative et communautaire uniquement</strong>. Les informations saisies ont valeur déclarative et ne constituent ni garantie contractuelle ni preuve juridique opposable.</P>
        </Article>

        <Article title='Art. 8 — Programme "Identité Vérifiée"'>
          <P>La validation signifie uniquement que les documents fournis ont été examinés selon les procédures internes de Brumerie. Le badge :</P>
          <List items={[
            "Ne constitue pas une certification commerciale",
            "Ne garantit pas l'honnêteté du vendeur",
            "Ne garantit pas la qualité des produits",
            "Ne constitue pas une assurance transactionnelle",
            "Ne supprime pas les risques liés aux transactions",
            "Ne transfère aucune responsabilité à Brumerie",
          ]} />
          <P>Le paiement correspond aux frais administratifs de vérification. Brumerie se réserve le droit de retirer le statut "Vérifié" à tout moment.</P>
        </Article>

        <Article title="Art. 9 — Activités interdites">
          <P>Il est strictement interdit de proposer :</P>
          <List items={[
            "Produits contrefaits ou volés",
            "Armes, drogues, produits illicites",
            "Arnaques financières ou systèmes pyramidaux",
          ]} />
          <Warning>Tout manquement peut entraîner une suppression immédiate du compte.</Warning>
        </Article>

        <Article title="Art. 10 — Litiges entre utilisateurs">
          <P>En cas de litige, les parties doivent tenter une résolution amiable. Brumerie peut analyser les éléments fournis et suspendre un compte.</P>
          <P>Brumerie ne dispose d'aucun pouvoir d'arbitrage juridiquement contraignant et n'intervient pas dans les remboursements.</P>
        </Article>

        <Article title="Art. 11 — Limitation de responsabilité">
          <P>Toute transaction financière réalisée hors plateforme relève de la seule responsabilité de l'utilisateur. Brumerie ne pourra être tenue responsable des pertes financières, fraudes, défauts produits, retards ou accords conclus hors plateforme.</P>
          <P>La responsabilité éventuelle de Brumerie est strictement limitée aux dommages directs résultant d'un dysfonctionnement technique avéré.</P>
        </Article>

        <Article title="Art. 12 — Suspension ou suppression">
          <P>Brumerie peut suspendre ou supprimer un compte en cas de comportement suspect, signalements répétés, fraude ou violation des CGU. Aucune indemnité ne pourra être réclamée.</P>
        </Article>

        <Article title="Art. 13 — Droit applicable">
          <P>Les présentes CGU sont régies par le droit ivoirien. Tout litige relève de la compétence des tribunaux d'Abidjan.</P>
        </Article>

      </div>
    </div>
  );
}

// ── CONFIDENTIALITÉ ───────────────────────────────────────────
function TabPrivacy() {
  return (
    <div>
      <div className="mx-4 mt-5 mb-1 bg-blue-600 rounded-3xl px-5 py-5">
        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">En vigueur au {DATE}</p>
        <p className="text-white font-black text-[13px] leading-snug">Politique de Confidentialité</p>
        <p className="text-blue-200 text-[10px] font-medium mt-1">Tes données ne sont jamais vendues.</p>
      </div>

      <div className="mt-4 bg-white rounded-3xl mx-4 border border-slate-100 overflow-hidden">

        <Article title="Art. 1 — Données collectées">
          <P>Brumerie peut collecter :</P>
          <List items={[
            "Nom, numéro de téléphone, adresse email",
            "Photo de profil",
            "Historique des publications",
            "Données techniques (logs, appareils)",
            "Échanges effectués via la plateforme",
          ]} />
          <P>Brumerie ne collecte aucune donnée bancaire dans le cadre du MVP actuel.</P>
        </Article>

        <Article title="Art. 2 — Finalités">
          <P>Les données sont utilisées pour :</P>
          <List items={[
            "Mise en relation entre utilisateurs",
            "Gestion des comptes",
            "Sécurité de la plateforme",
            "Détection des fraudes",
            "Amélioration du service",
          ]} />
        </Article>

        <Article title="Art. 3 — Conservation">
          <P>Les données sont conservées pendant la durée d'utilisation du compte et jusqu'à cinq (5) ans à des fins probatoires.</P>
        </Article>

        <Article title="Art. 4 — Sécurité">
          <P>Brumerie met en œuvre des mesures techniques raisonnables de protection.</P>
          <Warning>Aucun système informatique ne peut garantir une sécurité absolue.</Warning>
        </Article>

        <Article title="Art. 5 — Tes droits">
          <P>Tu peux demander l'accès, la rectification ou la suppression de tes données en nous contactant :</P>
          <div className="bg-slate-50 rounded-2xl px-4 py-3 mt-1">
            <p className="text-[12px] font-black text-slate-900">{SUPPORT_EMAIL}</p>
          </div>
        </Article>

      </div>
    </div>
  );
}

// ── ANTI-FRAUDE ───────────────────────────────────────────────
function TabAntiFraud() {
  return (
    <div>
      <div className="mx-4 mt-5 mb-1 rounded-3xl px-5 py-5" style={{ background: '#0F172A' }}>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">En vigueur au {DATE}</p>
        <p className="text-white font-black text-[13px] leading-snug">Process Anti-Fraude</p>
        <p className="text-slate-400 text-[10px] font-medium mt-1">Brumerie protège son écosystème numérique.</p>
      </div>

      <div className="mt-4 bg-white rounded-3xl mx-4 border border-slate-100 overflow-hidden">

        <Article title="1. Surveillance comportementale">
          <P>Analyse des comportements suspects : multiplication de comptes, incohérences déclaratives, signalements répétés par d'autres utilisateurs.</P>
        </Article>

        <Article title="2. Vérification renforcée">
          <P>Brumerie peut demander à tout moment une pièce d'identité, une photo en temps réel ou un justificatif d'activité.</P>
          <Warning>Le refus de fournir ces documents peut entraîner une restriction ou suspension du compte.</Warning>
        </Article>

        <Article title="3. Système de réputation">
          <P>Basé sur les confirmations de transactions, les signalements et le respect des engagements déclarés.</P>
          <P>Un score faible peut entraîner une réduction de visibilité ou une suspension temporaire.</P>
        </Article>

        <Article title="4. Limites d'intervention">
          <Warning>Limites importantes à comprendre</Warning>
          <List items={[
            "Brumerie n'intervient pas dans les paiements",
            "Brumerie n'indemnise pas les pertes financières",
            "Brumerie ne bloque aucun fonds",
          ]} />
          <P>La plateforme protège son <strong>environnement numérique</strong>, non les transactions financières réalisées hors plateforme.</P>
        </Article>

      </div>

      {/* Note finale importante */}
      <div className="mx-4 mt-4 mb-6 bg-amber-50 border border-amber-100 rounded-3xl px-5 py-5">
        <p className="font-black text-amber-900 text-[11px] uppercase tracking-wider mb-2">💡 Bonnes pratiques</p>
        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
          Toujours se rencontrer dans un lieu public, vérifier le produit avant paiement, et privilégier les vendeurs avec un badge d'identité vérifiée.
        </p>
      </div>
    </div>
  );
}

// ── À PROPOS ──────────────────────────────────────────────────
function TabAbout({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white pb-12 font-sans">
      <div className="bg-white sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">À propos</h1>
      </div>
      <div className="px-6 py-8 space-y-6">
        <div className="text-center">
          <p className="text-6xl mb-4">🛍️</p>
          <h2 className="font-black text-3xl text-slate-900 uppercase tracking-tight">BRUMERIE</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">Mise en relation locale ·  Abidjan</p>
        </div>
        <div className="bg-slate-50 rounded-3xl p-5 space-y-3">
          <p className="text-[12px] text-slate-600 leading-relaxed">Brumerie est une plateforme numérique de mise en relation C2C permettant aux habitants d'Abidjan de publier, découvrir et échanger des biens localement.</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">Notre mission : faciliter le commerce de proximité de manière simple, accessible et transparente.</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden">
          {[
            { label: 'Version', value: 'MVP 1.6' },
            { label: 'Date', value: DATE },
            { label: 'Marché', value: ' Abidjan, Côte d\'Ivoire' },
            { label: 'Contact', value: SUPPORT_EMAIL },
          ].map((row, i, arr) => (
            <div key={i} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
              <span className="text-[11px] font-black text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────
export function PrivacyPage({ onBack, isTerms, isAbout }: PrivacyPageProps) {
  const [activeTab, setActiveTab] = useState<'cgu' | 'privacy' | 'antifraud'>(
    isTerms ? 'cgu' : 'privacy'
  );

  if (isAbout) {
    return <TabAbout onBack={onBack} />;
  }

  const TABS = [
    { id: 'cgu' as const,       label: 'CGU' },
    { id: 'privacy' as const,   label: 'Confidentialité' },
    { id: 'antifraud' as const, label: 'Anti-Fraude' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans">

      {/* Header sticky */}
      <div className="bg-white sticky top-0 z-50 border-b border-slate-100">
        <div className="px-5 py-5 flex items-center gap-4">
          <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Informations légales</h1>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-t border-slate-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu par onglet */}
      <div className="pb-8">
        {activeTab === 'cgu'       && <TabCGU />}
        {activeTab === 'privacy'   && <TabPrivacy />}
        {activeTab === 'antifraud' && <TabAntiFraud />}
      </div>
    </div>
  );
}
