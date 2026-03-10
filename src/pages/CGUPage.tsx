import { useEffect } from 'react';

interface CGUPageProps { onBack: () => void; }

export function CGUPage({ onBack }: CGUPageProps) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 z-50 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">Conditions d'utilisation</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-green-700 uppercase tracking-widest mb-1">Brumerie</p>
          <p className="text-[12px] text-green-800">Plateforme de commerce local à Abidjan, Côte d'Ivoire.</p>
          <p className="text-[11px] text-slate-500 mt-1">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {[
          {
            title: "1. Acceptation des conditions",
            content: "En utilisant Brumerie, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser la plateforme."
          },
          {
            title: "2. Description du service",
            content: "Brumerie est une plateforme de mise en relation entre acheteurs et vendeurs locaux à Abidjan. Brumerie n'est pas partie aux transactions entre utilisateurs et n'assume aucune responsabilité quant aux produits vendus, à leur qualité ou à leur conformité."
          },
          {
            title: "3. Inscription et compte",
            content: "Pour utiliser Brumerie en tant que vendeur, vous devez créer un compte avec une adresse email valide. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités effectuées depuis votre compte."
          },
          {
            title: "4. Règles pour les vendeurs",
            content: "Les vendeurs s'engagent à : publier uniquement des annonces véridiques avec des photos réelles, ne pas vendre de produits illicites, contrefaits ou dangereux, honorer leurs engagements de vente, respecter les acheteurs dans toutes les communications."
          },
          {
            title: "5. Produits interdits",
            content: "Sont strictement interdits : armes et munitions, drogues et substances illicites, médicaments sans ordonnance, contrefaçons et produits piratés, contenus à caractère pornographique, animaux protégés. Tout manquement entraîne la suppression immédiate du compte."
          },
          {
            title: "6. Paiements et transactions",
            content: "Brumerie facilite les paiements via Wave, Orange Money, MTN MoMo et Moov Money. Les transactions sont directes entre acheteur et vendeur. Brumerie ne perçoit aucune commission sur le plan MVP. En cas de litige, contactez notre support WhatsApp."
          },
          {
            title: "7. Données personnelles",
            content: "Brumerie collecte votre email et les informations de profil que vous fournissez. Ces données sont utilisées uniquement pour faire fonctionner la plateforme. Vos données ne sont pas vendues à des tiers. Vous pouvez demander la suppression de votre compte à tout moment via les paramètres."
          },
          {
            title: "8. Propriété intellectuelle",
            content: "Les photos et contenus publiés par les vendeurs restent leur propriété. En publiant sur Brumerie, vous accordez à Brumerie une licence d'affichage de ces contenus sur la plateforme."
          },
          {
            title: "9. Limitation de responsabilité",
            content: "Brumerie n'est pas responsable des transactions entre utilisateurs, des produits défectueux ou non conformes, des pertes financières résultant d'une transaction, ni des contenus publiés par les utilisateurs."
          },
          {
            title: "10. Suspension de compte",
            content: "Brumerie se réserve le droit de suspendre ou supprimer tout compte qui viole ces conditions, publie de fausses informations, harcèle d'autres utilisateurs ou nuit à l'image de la plateforme."
          },
          {
            title: "11. Contact",
            content: "Pour toute question, litige ou demande de support : WhatsApp +225 05 86 86 76 93 · Email contact@brumerie.com"
          },
        ].map(({ title, content }) => (
          <div key={title} className="bg-white border border-slate-100 rounded-2xl p-4">
            <h2 className="font-black text-slate-900 text-[13px] uppercase tracking-tight mb-2">{title}</h2>
            <p className="text-[12px] text-slate-600 leading-relaxed">{content}</p>
          </div>
        ))}

        <div className="bg-slate-900 rounded-2xl p-5 text-center">
          <p className="text-white font-black text-[13px] uppercase tracking-wide mb-1">Brumerie · Abidjan 🇨🇮</p>
          <p className="text-slate-400 text-[11px]">© {new Date().getFullYear()} Brumerie. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
