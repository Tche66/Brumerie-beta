// src/pages/CGULivreurPage.tsx
// Conditions Générales d'Utilisation — Livreurs Partenaires Brumerie

import React, { useState } from 'react';

interface Props {
  onAccept: () => void;
  onBack: () => void;
}

export function CGULivreurPage({ onAccept, onBack }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolled(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[500] flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-14 pb-4 border-b border-slate-100">
        <button onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <h1 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">
            Conditions Livreur Partenaire
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Lis entièrement avant d'accepter
          </p>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-6" onScroll={handleScroll}>
        <div className="max-w-lg mx-auto space-y-6 text-[12px] text-slate-600 leading-relaxed">

          <div className="bg-green-50 rounded-2xl p-4">
            <p className="font-black text-green-800 text-[13px] mb-1">Brumerie — Réseau de Livreurs Partenaires</p>
            <p className="text-green-700 text-[11px]">En vigueur depuis le 1er mars 2026 · Abidjan, Côte d'Ivoire</p>
          </div>

          <Section title="1. Qui peut devenir livreur Brumerie ?">
            <p>Pour rejoindre le réseau de livreurs partenaires Brumerie, tu dois :</p>
            <ul>
              <li>• Avoir au minimum <strong>18 ans révolus</strong></li>
              <li>• Posséder un moyen de transport personnel (moto, vélo, voiture) en bon état de marche</li>
              <li>• Détenir un <strong>permis de conduire valide</strong> correspondant à ton véhicule (si applicable)</li>
              <li>• Avoir un téléphone avec accès internet pour utiliser l'application</li>
              <li>• Résider ou opérer dans les quartiers d'Abidjan couverts par Brumerie</li>
            </ul>
            <p className="mt-2">Brumerie se réserve le droit de refuser ou de suspendre un livreur ne remplissant pas ces critères.</p>
          </Section>

          <Section title="2. Statut du livreur partenaire">
            <p>Le livreur partenaire Brumerie est un <strong>prestataire indépendant</strong>. À ce titre :</p>
            <ul>
              <li>• Il n'est pas salarié ni employé de Brumerie</li>
              <li>• Il gère librement ses horaires, ses zones et sa disponibilité</li>
              <li>• Il fixe lui-même ses tarifs de livraison</li>
              <li>• Il est seul responsable de ses obligations fiscales et sociales éventuelles</li>
              <li>• Il assure ses propres moyens de transport et équipements</li>
            </ul>
            <p className="mt-2">Brumerie agit uniquement comme <strong>plateforme de mise en relation</strong> entre livreurs, vendeurs et acheteurs.</p>
          </Section>

          <Section title="3. Missions de livraison — Engagement et responsabilités">
            <p>En acceptant une mission, le livreur s'engage à :</p>
            <ul>
              <li>• <strong>Prendre en charge le colis</strong> dans les délais convenus avec le vendeur</li>
              <li>• <strong>Livrer en bon état</strong> l'article chez l'acheteur — tout colis endommagé ou perdu est sous la responsabilité du livreur</li>
              <li>• <strong>Ne pas ouvrir, modifier ou substituer</strong> le colis entre la prise en charge et la livraison</li>
              <li>• Récupérer ou confirmer le <strong>code de validation</strong> auprès de l'acheteur à la livraison</li>
              <li>• Signaler immédiatement tout incident (accident, vol, refus de livraison) via l'application</li>
            </ul>
            <p className="mt-2 font-bold text-slate-800">En cas de perte ou dommage dû à la négligence du livreur, Brumerie peut retenir les gains correspondants et suspendre le compte.</p>
          </Section>

          <Section title="4. Comportement et éthique">
            <p>Le livreur partenaire Brumerie s'engage à :</p>
            <ul>
              <li>• Adopter un <strong>comportement respectueux et professionnel</strong> envers les vendeurs et acheteurs</li>
              <li>• Ne jamais solliciter de paiements en dehors de la plateforme</li>
              <li>• Ne jamais utiliser les informations des clients (adresses, numéros) à des fins personnelles ou commerciales</li>
              <li>• Ne jamais accepter de livrer des marchandises interdites, dangereuses ou illicites</li>
              <li>• Respecter le code de la route et ne pas mettre en danger la vie d'autrui</li>
            </ul>
            <p className="mt-2">Tout comportement frauduleux, menaçant ou contraire à l'éthique entraîne la <strong>suspension immédiate et définitive</strong> du compte livreur.</p>
          </Section>

          <Section title="5. Confidentialité et données personnelles">
            <p>Dans le cadre de son activité, le livreur accède à des informations personnelles (noms, adresses, numéros de téléphone des clients). Il s'engage à :</p>
            <ul>
              <li>• Traiter ces données avec la <strong>plus stricte confidentialité</strong></li>
              <li>• Ne jamais transmettre, vendre ou partager ces informations avec des tiers</li>
              <li>• Supprimer mentalement ces données une fois la mission terminée</li>
              <li>• Ne jamais contacter un client en dehors du cadre d'une mission active</li>
            </ul>
            <p className="mt-2">Brumerie collecte les données du livreur (nom, photo, zones, gains) pour faire fonctionner le service. Ces données sont protégées conformément à notre Politique de Confidentialité.</p>
          </Section>

          <Section title="6. Gains et paiements">
            <ul>
              <li>• Les <strong>tarifs sont fixés librement</strong> par le livreur lors de son inscription</li>
              <li>• Brumerie n'applique <strong>aucune commission</strong> sur les livraisons au stade MVP</li>
              <li>• Les paiements sont effectués directement entre l'acheteur/vendeur et le livreur, via les moyens de paiement convenus</li>
              <li>• Brumerie n'est pas responsable des impayés — le livreur assume ce risque</li>
            </ul>
          </Section>

          <Section title="7. Disponibilité et qualité de service">
            <ul>
              <li>• Le livreur s'engage à n'activer sa disponibilité que lorsqu'il est réellement disponible</li>
              <li>• Accepter une mission et ne pas l'effectuer sans motif valable constitue un <strong>manquement grave</strong></li>
              <li>• Un taux de refus excessif ou des avis négatifs répétés peuvent entraîner la suspension du profil</li>
              <li>• Brumerie se réserve le droit de retirer un livreur de sa liste de recommandation sans préavis</li>
            </ul>
          </Section>

          <Section title="8. Limitation de responsabilité de Brumerie">
            <p>Brumerie ne peut être tenu responsable :</p>
            <ul>
              <li>• Des incidents survenant pendant la livraison (accidents, vols, dommages)</li>
              <li>• Des litiges entre le livreur et un client</li>
              <li>• De l'indisponibilité temporaire de l'application</li>
              <li>• Des pertes de revenus liées à l'absence de missions</li>
            </ul>
            <p className="mt-2">Brumerie s'engage à traiter les litiges signalés de façon équitable et à mettre à disposition un canal de support.</p>
          </Section>

          <Section title="9. Modification des conditions">
            <p>Brumerie se réserve le droit de modifier les présentes conditions. Le livreur sera informé par notification dans l'application. L'utilisation continue du service vaut acceptation des nouvelles conditions.</p>
          </Section>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="font-black text-slate-800 text-[12px] mb-1">Brumerie — Marketplace de commerce de proximité</p>
            <p className="text-[10px] text-slate-500">Incubated by FasterCapital — Raise Capital Programme</p>
            <p className="text-[10px] text-slate-500">contact.brumerie@gmail.com · +225 05 86 86 76 93</p>
          </div>

          <div className="h-8"/>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 bg-white">
        {!scrolled && (
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">
            ↓ Fais défiler jusqu'en bas pour accepter
          </p>
        )}
        <button onClick={() => setChecked(!checked)}
          className="flex items-center gap-3 w-full mb-4">
          <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            checked ? 'bg-green-600 border-green-600' : 'border-slate-300 bg-white'}`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p className="text-[11px] text-slate-700 font-bold text-left leading-relaxed">
            J'ai lu et j'accepte les Conditions Générales du Livreur Partenaire Brumerie
          </p>
        </button>

        <button
          onClick={onAccept}
          disabled={!scrolled || !checked}
          className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.15em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
          ✅ Accepter et continuer
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-black text-slate-900 text-[13px] mb-2 uppercase tracking-tight">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
