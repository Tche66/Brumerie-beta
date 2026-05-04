// src/pages/PrivacyPage.tsx — Politique de Confidentialité + Mentions Légales
// Conforme Loi n°2013-450 (Protection des données personnelles, CI) · ARTCI
import React, { useState, useEffect } from 'react';

interface PrivacyPageProps {
  onBack: () => void;
  isTerms?: boolean;
}

const DATE_MAJ = '29 mars 2026';

function Section({ num, title, color = 'blue', children }: {
  num: string; title: string; color?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const colors: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    amber:  'bg-amber-100 text-amber-700',
  };
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden mb-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white active:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 pr-4">
          <span className={`w-7 h-7 rounded-xl text-[10px] font-black flex items-center justify-center flex-shrink-0 ${colors[color]}`}>{num}</span>
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

export function PrivacyPage({ onBack, isTerms }: PrivacyPageProps) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-50 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <h1 className="font-black text-slate-900 text-[14px] uppercase tracking-tight">
            {isTerms ? "Conditions d'utilisation" : "Politique de Confidentialité"}
          </h1>
          <p className="text-[10px] text-slate-400">Loi n°2013-450 · ARTCI · Côte d'Ivoire</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">

        {/* Intro */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-black text-[13px] text-slate-900">Politique de Confidentialité</p>
              <p className="text-[10px] text-slate-400">Brumerie · brumerie.com</p>
            </div>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            La protection de vos données personnelles est une priorité pour Brumerie. Cette politique explique quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits, conformément à la <strong>Loi n°2013-450 relative à la protection des données à caractère personnel</strong> en Côte d'Ivoire.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">Mise à jour : {DATE_MAJ}</p>
            <p className="text-[10px] text-slate-400">Autorité : ARTCI</p>
          </div>
        </div>

        {/* Sections Confidentialité */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-3">🔒 Protection des données</p>

        <Section num="1" title="Données collectées" color="blue">
          <p>Brumerie collecte les données suivantes :</p>
          <div className="space-y-2">
            {[
              { cat: "Données d'identification", items: ["Adresse email", "Nom d'utilisateur", "Photo de profil (optionnel)"] },
              { cat: "Données de contact", items: ["Numéro de téléphone (optionnel)", "Numéro WhatsApp (optionnel)"] },
              { cat: "Données de localisation", items: ["Quartier ou commune (renseigné par l'utilisateur)", "Adresse AddressWeb (optionnel)"] },
              { cat: "Données de transaction", items: ["Historique des commandes", "Méthode de paiement utilisée (sans numéro complet)"] },
              { cat: "Données techniques", items: ["Adresse IP", "Type d'appareil et navigateur", "Pages visitées sur la plateforme"] },
            ].map(({ cat, items }) => (
              <div key={cat} className="bg-blue-50 rounded-xl p-3">
                <p className="font-bold text-blue-800 text-[11px] mb-1">{cat}</p>
                {items.map(i => <p key={i} className="text-[11px] text-blue-700 flex gap-2"><span>·</span>{i}</p>)}
              </div>
            ))}
          </div>
        </Section>

        <Section num="2" title="Finalités du traitement" color="blue">
          <p>Vos données sont utilisées uniquement pour :</p>
          <div className="space-y-1">
            {[
              "Créer et gérer votre compte utilisateur",
              "Assurer la mise en relation entre acheteurs et vendeurs",
              "Faciliter les transactions et paiements",
              "Vous envoyer des notifications relatives à vos commandes et messages",
              "Améliorer la plateforme et prévenir les fraudes",
              "Respecter nos obligations légales",
            ].map(t => <p key={t} className="flex gap-2"><span className="text-blue-600 font-bold flex-shrink-0">→</span>{t}</p>)}
          </div>
          <p className="font-bold text-red-600">Vos données ne sont jamais vendues à des tiers.</p>
        </Section>

        <Section num="3" title="Hébergement et sécurité" color="blue">
          <p>
            Vos données sont stockées sur des <strong>serveurs sécurisés de Google (Firebase)</strong>, infrastructure certifiée conforme aux normes de sécurité internationales (ISO 27001, SOC 2).
          </p>
          <p>Les mesures de sécurité mises en place incluent :</p>
          <div className="space-y-1">
            {[
              "Chiffrement des données en transit (HTTPS/TLS)",
              "Authentification sécurisée par email et Google",
              "Accès aux données restreint aux personnes autorisées",
              "Surveillance continue des activités suspectes",
            ].map(t => <p key={t} className="flex gap-2"><span className="text-green-600 font-bold flex-shrink-0">✓</span>{t}</p>)}
          </div>
        </Section>

        <Section num="4" title="Partage des données" color="blue">
          <p>Brumerie peut partager vos données avec :</p>
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="font-bold text-slate-700 text-[11px] mb-1">Prestataires techniques</p>
              <p className="text-[11px] text-slate-600">Google Firebase (hébergement), Brevo (emails), Cloudinary (images) — uniquement pour assurer le service.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="font-bold text-slate-700 text-[11px] mb-1">Autorités légales</p>
              <p className="text-[11px] text-slate-600">En cas d'obligation légale ou de réquisition judiciaire uniquement.</p>
            </div>
          </div>
          <p className="font-bold text-red-600">Aucun partage à des fins publicitaires ou commerciales.</p>
        </Section>

        <Section num="5" title="Vos droits (Loi 2013-450)" color="purple">
          <p>Conformément à la <strong>Loi n°2013-450</strong> et sous le contrôle de l'<strong>ARTCI</strong>, vous disposez des droits suivants :</p>
          <div className="space-y-2">
            {[
              { droit: "Droit d'accès", desc: "Obtenir une copie de vos données personnelles détenues par Brumerie" },
              { droit: "Droit de rectification", desc: "Corriger vos données inexactes ou incomplètes" },
              { droit: "Droit à l'effacement", desc: "Demander la suppression de votre compte et de vos données" },
              { droit: "Droit d'opposition", desc: "Vous opposer au traitement de vos données pour certaines finalités" },
              { droit: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré et lisible" },
            ].map(({ droit, desc }) => (
              <div key={droit} className="bg-purple-50 rounded-xl p-3">
                <p className="font-bold text-purple-800 text-[11px]">{droit}</p>
                <p className="text-[11px] text-purple-700">{desc}</p>
              </div>
            ))}
          </div>
          <p>Pour exercer vos droits, contactez-nous à : <strong>contact@brumerie.com</strong></p>
          <p className="text-[11px] text-slate-500">Nous répondons dans un délai de 30 jours. En cas de non-réponse, vous pouvez saisir l'ARTCI : <strong>artci.ci</strong></p>
        </Section>

        <Section num="6" title="Cookies et traceurs" color="blue">
          <p>Brumerie utilise des cookies techniques <strong>strictement nécessaires</strong> au fonctionnement de la plateforme (session, authentification).</p>
          <p>Nous n'utilisons pas de cookies publicitaires ou de pistage comportemental.</p>
        </Section>

        <Section num="7" title="Durée de conservation" color="blue">
          <p>Vos données sont conservées :</p>
          <div className="space-y-1">
            <p className="flex gap-2"><span className="text-blue-600 font-bold flex-shrink-0">→</span>Données de compte : tant que votre compte est actif</p>
            <p className="flex gap-2"><span className="text-blue-600 font-bold flex-shrink-0">→</span>Données de transaction : 5 ans (obligation légale comptable)</p>
            <p className="flex gap-2"><span className="text-blue-600 font-bold flex-shrink-0">→</span>Logs techniques : 12 mois maximum</p>
          </div>
          <p>Après suppression de compte, vos données sont effacées sous 30 jours, sauf obligation légale contraire.</p>
        </Section>

        {/* Mentions Légales */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-3 mt-6">📋 Mentions légales</p>

        <Section num="ML" title="Mentions légales" color="amber">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">🧪 Phase Bêta MVP</p>
            <p className="text-[11px] text-amber-700">Brumerie est en phase de test technique. L'immatriculation formelle (RCCM, IDU) sera complétée avant le lancement commercial officiel.</p>
          </div>
          <div className="space-y-2">
            <div className="flex gap-3">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px]">Plateforme</span>
              <span className="text-[12px] text-slate-700 font-bold">Brumerie</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px]">Site web</span>
              <span className="text-[12px] text-slate-700">brumerie.com</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px]">Pays</span>
              <span className="text-[12px] text-slate-700">Côte d'Ivoire 🇨🇮</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px]">Email</span>
              <span className="text-[12px] text-slate-700">contact@brumerie.com</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px]">WhatsApp</span>
              <span className="text-[12px] text-slate-700">+225 05 86 86 76 93</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px]">Hébergeur</span>
              <span className="text-[12px] text-slate-700">Vercel Inc. · Google Firebase</span>
            </div>
          </div>
        </Section>

        <Section num="8" title="Contact DPO & ARTCI" color="purple">
          <p>Pour toute question relative à vos données personnelles :</p>
          <div className="space-y-2">
            <p className="flex gap-2"><span className="text-purple-600 font-bold">📧</span>contact@brumerie.com</p>
            <p className="flex gap-2"><span className="text-purple-600 font-bold">💬</span>WhatsApp : +225 05 86 86 76 93</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mt-2">
            <p className="font-bold text-purple-800 text-[11px] mb-1">Autorité de contrôle</p>
            <p className="text-[11px] text-purple-700">ARTCI — Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire</p>
            <p className="text-[11px] text-purple-700 mt-1">🌐 artci.ci</p>
          </div>
        </Section>

        {/* Footer */}
        <div className="bg-slate-900 rounded-2xl p-5 text-center mt-6">
          <p className="text-white font-black text-[13px] uppercase tracking-wide mb-1">Brumerie · Abidjan 🇨🇮</p>
          <p className="text-slate-400 text-[11px] mb-1">Conforme Loi n°2013-450 · ARTCI</p>
          <p className="text-slate-500 text-[10px]">© {new Date().getFullYear()} Brumerie. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
