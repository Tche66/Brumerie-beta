// src/pages/GuidePage.tsx — Guide complet Brumerie (Mode acheteur, vendeur simple, vendeur vérifié)
import React, { useState } from 'react';
import { getAppConfig } from '@/services/appConfigService';

interface GuidePageProps { onBack: () => void; }

type SectionId = 'intro' | 'buyer' | 'seller_simple' | 'seller_verified' | 'security' | 'payments' | 'stories' | 'orders' | 'rules' | 'contact';

const NAV: { id: SectionId; icon: string; label: string }[] = [
  { id: 'intro',           icon: '🛍',  label: 'Brumerie' },
  { id: 'buyer',           icon: '🛒',  label: 'Acheter' },
  { id: 'seller_simple',   icon: '📦',  label: 'Vendre' },
  { id: 'seller_verified', icon: '✅',  label: 'Vérifié' },
  { id: 'payments',        icon: '💳',  label: 'Paiements' },
  { id: 'orders',          icon: '📋',  label: 'Commandes' },
  { id: 'stories',         icon: '📸',  label: 'Stories' },
  { id: 'security',        icon: '🛡️',  label: 'Sécurité' },
  { id: 'rules',           icon: '📜',  label: 'Règles' },
  { id: 'contact',         icon: '💬',  label: 'Contact' },
];

function Block({ icon, title, children }: { icon?: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <h3 className="font-black text-slate-900 text-[14px] leading-tight">{title}</h3>
      </div>
      <div className="space-y-2 text-[12px] text-slate-600 font-medium leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white mt-0.5"
        style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>{n}</div>
      <p className="flex-1">{text}</p>
    </div>
  );
}

function Tip({ text, color = 'green' }: { text: string; color?: 'green' | 'orange' | 'blue' | 'red' }) {
  const styles = {
    green:  { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', icon: '💡' },
    orange: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⚠️' },
    blue:   { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: 'ℹ️' },
    red:    { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '🚫' },
  };
  const s = styles[color];
  return (
    <div className="rounded-2xl px-4 py-3 flex gap-2 text-[11px] font-bold"
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.text }}>
      <span>{s.icon}</span><span>{text}</span>
    </div>
  );
}

export function GuidePage({ onBack }: GuidePageProps) {
  const [section, setSection] = useState<SectionId>('intro');
  const config = getAppConfig();
  const ytLink = config.youtubeChannel || 'https://youtube.com/@brumerie';

  return (
    <div className="min-h-full bg-slate-50 font-sans pb-24">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md sticky top-0 z-50 px-5 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">Guide Brumerie</h1>
          <p className="text-[10px] text-slate-400 font-bold">Tout ce qu'il faut savoir</p>
        </div>
        <a href={ytLink} target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 active:scale-95 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#DC2626"><path d="M23 7s-.3-2-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.2 3 12 3 12 3s-4.2 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.7c1.1 1.2 2.6 1.1 3.3 1.2C7.2 21.4 12 21.5 12 21.5s4.2 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.7 1.2-2.7 1.2-2.7s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.4l6.6 3.6-6.6 3.5z"/></svg>
          <span className="text-[10px] font-black text-red-600 uppercase tracking-wide">Tutoriels</span>
        </a>
      </div>

      {/* Nav horizontale */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-b border-slate-100">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-[10px] uppercase tracking-wide transition-all ${section === n.id ? 'text-white shadow-lg' : 'text-slate-500 bg-slate-50'}`}
            style={section === n.id ? { background: 'linear-gradient(135deg,#16A34A,#115E2E)' } : {}}>
            <span>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ══ INTRO ══ */}
        {section === 'intro' && (<>
          <Block icon="🛍" title="Qu'est-ce que Brumerie ?">
            <p>Brumerie est le <strong>marché digital de quartier</strong> d'Abidjan. On connecte les acheteurs et les vendeurs du secteur informel — sans intermédiaire, sans paperasse, sans boutique physique.</p>
            <p>Tu peux acheter et vendre des articles d'occasion ou neufs : vêtements, chaussures, électronique, beauté, alimentation et bien plus.</p>
          </Block>
          <Block icon="🔄" title="Deux modes d'utilisation">
            <Step n={1} text="Mode Acheteur — tu parcours les annonces, tu contactes les vendeurs, tu commandes." />
            <Step n={2} text="Mode Vendeur — tu publies tes articles, tu gères tes commandes et tu encaisses." />
            <Tip text="Tu peux basculer entre les deux modes depuis tes Paramètres → Changer de mode." color="blue" />
          </Block>
          <Block icon="📍" title="Disponible à Abidjan">
            <p>Brumerie couvre tous les quartiers d'Abidjan. Tu filtres les articles par quartier pour trouver les vendeurs proches de toi.</p>
          </Block>
          <Block icon="📱" title="Application mobile">
            <p>Brumerie est une application web progressive (PWA). Tu peux l'installer sur ton téléphone comme une vraie app, sans passer par Play Store.</p>
            <Tip text="Sur Chrome Android : menu ⋮ → Ajouter à l'écran d'accueil." color="blue" />
          </Block>
        </>)}

        {/* ══ ACHETEUR ══ */}
        {section === 'buyer' && (<>
          <Block icon="🔍" title="Trouver un article">
            <Step n={1} text="Ouvre l'onglet Accueil. Les articles récents s'affichent automatiquement." />
            <Step n={2} text="Utilise la barre de recherche en haut pour chercher par mot-clé." />
            <Step n={3} text="Utilise les filtres (catégorie, quartier, fourchette de prix) pour affiner." />
            <Step n={4} text="Clique sur un article pour voir les photos, la description et le vendeur." />
          </Block>
          <Block icon="💬" title="Contacter un vendeur">
            <Step n={1} text="Sur la fiche de l'article, clique sur le bouton Chat." />
            <Step n={2} text="Une conversation s'ouvre directement avec le vendeur." />
            <Step n={3} text="Tu peux négocier le prix via le bouton Faire une offre." />
            <Tip text="Le chat est limité à 5 messages/jour pour les vendeurs du plan Simple. Vendeur Vérifié = illimité." color="blue" />
          </Block>
          <Block icon="🛒" title="Passer une commande">
            <Step n={1} text="Clique sur le bouton Acheter sur la fiche du produit." />
            <Step n={2} text="Choisis ton mode de paiement : Payer à la livraison (recommandé) ou Paiement Mobile Money." />
            <Step n={3} text="Si tu choisis Mobile Money, confirme d'abord la disponibilité du produit avec le vendeur." />
            <Step n={4} text="Suis l'avancement de ta commande dans l'onglet Commandes." />
          </Block>
          <Block icon="⭐" title="Noter un vendeur">
            <p>Après la livraison confirmée (code de livraison validé), tu peux laisser un avis au vendeur. Ton avis aide les autres acheteurs à choisir en confiance.</p>
            <Tip text="Tu ne peux noter qu'une seule fois par commande. Sois honnête !" color="green" />
          </Block>
          <Block icon="❤️" title="Favoris">
            <p>Clique sur le cœur d'un article pour l'ajouter à tes favoris. Retrouve-les dans ton Profil → Favoris.</p>
          </Block>
          <Block icon="🔔" title="Alertes de recherche">
            <p>Tu cherches quelque chose de précis ? Crée une alerte depuis la barre de recherche. Brumerie te notifiera dès qu'un article correspondant est publié.</p>
          </Block>
        </>)}

        {/* ══ VENDEUR SIMPLE ══ */}
        {section === 'seller_simple' && (<>
          <Block icon="📦" title="Plan Vendeur Simple — Gratuit">
            <p>Sans abonnement tu bénéficies de :</p>
            <Step n={1} text="5 annonces actives simultanées." />
            <Step n={2} text="5 messages chat par jour." />
            <Step n={3} text="0 boost disponible (les boosts s'achètent séparément)." />
            <Tip text="Pour plus de capacité, passe au plan Vérifié (1 000 FCFA/mois)." color="blue" />
          </Block>
          <Block icon="📸" title="Publier une annonce">
            <Step n={1} text="Clique sur le bouton + en bas de l'écran." />
            <Step n={2} text="Ajoute au moins 2 photos nettes de ton article." />
            <Step n={3} text="Remplis le titre, le prix et une description claire (état, taille, marque...)." />
            <Step n={4} text="Choisis la catégorie et ton quartier." />
            <Step n={5} text="Publie — ton article est visible immédiatement sur l'accueil." />
            <Tip text="Une photo de profil est obligatoire pour publier. Ajoute-la dans Paramètres → Modifier mon profil." color="orange" />
          </Block>
          <Block icon="💰" title="Configurer tes paiements">
            <Step n={1} text="Va dans Paramètres → Modifier mon profil." />
            <Step n={2} text="Ajoute tes numéros Mobile Money (Wave, Orange Money, MTN, Moov)." />
            <Step n={3} text="Indique si tu gères la livraison et tes tarifs." />
            <Tip text="Sans numéro de paiement configuré, les acheteurs ne peuvent pas te payer en Mobile Money." color="orange" />
          </Block>
          <Block icon="🚀" title="Boosts — Passer devant tout le monde">
            <p>Un boost propulse ton annonce en tête de liste pour une durée limitée :</p>
            <Step n={1} text="24h — 500 FCFA" />
            <Step n={2} text="48h — 800 FCFA" />
            <Step n={3} text="7 jours — 2 000 FCFA" />
            <p>Paiement via Wave (lien direct). Va sur ton Dashboard → Mes annonces → Booster.</p>
          </Block>
          <Block icon="📊" title="Tableau de bord vendeur">
            <p>Depuis l'onglet Dashboard tu vois :</p>
            <Step n={1} text="Tes annonces actives et leurs performances (vues, contacts)." />
            <Step n={2} text="Tes commandes en cours et leur statut." />
            <Step n={3} text="Tes avis reçus." />
            <Step n={4} text="Tes statistiques de vente." />
          </Block>
        </>)}

        {/* ══ VENDEUR VÉRIFIÉ ══ */}
        {section === 'seller_verified' && (<>
          <Block icon="✅" title="Badge Vendeur Vérifié — 1 000 FCFA/mois">
            <p>Le badge Vérifié prouve que Brumerie a contrôlé ton identité. Il inspire confiance aux acheteurs et booste ta visibilité.</p>
            <p>Avantages :</p>
            <Step n={1} text="Badge ✅ visible sur toutes tes annonces et ton profil." />
            <Step n={2} text="20 annonces actives (au lieu de 5)." />
            <Step n={3} text="Chat illimité avec les acheteurs." />
            <Step n={4} text="20 boosts offerts par mois." />
            <Step n={5} text="Accès aux Stories (contenu éphémère 48h)." />
            <Step n={6} text="Liens réseaux sociaux sur ton profil." />
          </Block>
          <Block icon="📋" title="Comment obtenir le badge ?">
            <Step n={1} text="Va dans Paramètres → Badge Vérifié → Demander la vérification." />
            <Step n={2} text="Effectue le paiement de 1 000 FCFA via le lien de paiement affiché." />
            <Step n={3} text="Contacte Brumerie sur WhatsApp avec ta preuve de paiement." />
            <Step n={4} text="Prépare une photo de ton visage + une pièce d'identité (CNI, passeport, permis, carte électorale ou carte étudiant)." />
            <Step n={5} text="Brumerie valide ton identité et active le badge sous 24h." />
            <Tip text="Le badge est valable 30 jours. Il se renouvelle automatiquement si tu continues à payer." color="green" />
            <Tip text="Le registre de commerce n'est PAS requis. Brumerie accepte les vendeurs informels." color="blue" />
          </Block>
          <Block icon="📸" title="Stories — Contenu éphémère">
            <p>Les vendeurs Vérifiés peuvent publier des Stories visibles 48h par tous les utilisateurs.</p>
            <Step n={1} text="Clique sur ta bulle de story en haut de l'accueil." />
            <Step n={2} text="Ajoute une photo et une légende." />
            <Step n={3} text="Tu peux lier un article à ta story : les acheteurs peuvent commander directement depuis la story." />
            <Tip text="Publie régulièrement des stories pour rester visible et augmenter tes ventes." color="green" />
          </Block>
          <Block icon="🔄" title="Renouvellement et expiration">
            <p>Le badge expire après 30 jours. Tu reçois une notification 3 jours avant l'expiration.</p>
            <Tip text="Si ton badge expire, tes annonces restent visibles mais sans le badge ✅ et tu repasses à 5 annonces max." color="orange" />
          </Block>
        </>)}

        {/* ══ PAIEMENTS ══ */}
        {section === 'payments' && (<>
          <Block icon="💳" title="Méthodes de paiement acceptées">
            <p>Brumerie supporte 4 opérateurs Mobile Money :</p>
            <Step n={1} text="Wave — Paiement via lien deeplink ou virement direct." />
            <Step n={2} text="Orange Money — Virement au numéro du vendeur." />
            <Step n={3} text="MTN MoMo — Virement au numéro du vendeur." />
            <Step n={4} text="Moov Money — Virement au numéro du vendeur." />
          </Block>
          <Block icon="🤝" title="Payer à la livraison (recommandé)">
            <Step n={1} text="Sélectionne Payer à la livraison lors de ta commande." />
            <Step n={2} text="Le vendeur prépare et livre l'article." />
            <Step n={3} text="Tu paies en cash ou Mobile Money à la réception." />
            <Step n={4} text="Entre le code de livraison 6 caractères pour confirmer la réception." />
            <Tip text="C'est le mode le plus sécurisé — tu ne paies que si tu reçois l'article." color="green" />
          </Block>
          <Block icon="💸" title="Payer en avance (Mobile Money)">
            <Step n={1} text="Vérifie d'abord la disponibilité du produit avec le vendeur." />
            <Step n={2} text="Envoie le montant exact au numéro indiqué." />
            <Step n={3} text="Prends une capture de la confirmation de paiement." />
            <Step n={4} text="Uploade la preuve sur Brumerie dans ta commande." />
            <Step n={5} text="Le vendeur confirme réception et prépare la livraison." />
            <Tip text="Paye en avance uniquement si tu connais et fais confiance au vendeur." color="orange" />
            <Tip text="Brumerie ne rembourse pas en cas de litige au stade MVP." color="red" />
          </Block>
          <Block icon="🔐" title="Code de livraison">
            <p>Après paiement confirmé, le vendeur clique sur Prêt à livrer. Un code à 6 caractères est généré (ex: XK9B2R).</p>
            <Step n={1} text="Le vendeur voit le code dans sa commande." />
            <Step n={2} text="L'acheteur voit le code dans sa commande." />
            <Step n={3} text="À la livraison physique, l'acheteur saisit le code pour confirmer la réception." />
            <Step n={4} text="La transaction est terminée — les avis se débloquent immédiatement." />
            <Tip text="Ne communique JAMAIS ton code de livraison avant de recevoir l'article." color="red" />
          </Block>
        </>)}

        {/* ══ COMMANDES ══ */}
        {section === 'orders' && (<>
          <Block icon="📋" title="Cycle de vie d'une commande">
            <Step n={1} text="Initié — L'acheteur a passé commande." />
            <Step n={2} text="Preuve envoyée — L'acheteur a uploadé la preuve de paiement." />
            <Step n={3} text="Paiement confirmé — Le vendeur a reçu l'argent." />
            <Step n={4} text="Prêt à livrer — Le vendeur a généré le code de livraison." />
            <Step n={5} text="Livré ✓ — L'acheteur a saisi le code et confirmé la réception." />
          </Block>
          <Block icon="⏱" title="Délais à respecter">
            <Step n={1} text="Vendeur : confirmer la réception du paiement sous 24h après la preuve envoyée." />
            <Step n={2} text="Si pas de confirmation en 24h → litige automatique ouvert." />
            <Tip text="Vendeur : vérifie régulièrement ton solde Mobile Money et confirme rapidement." color="orange" />
          </Block>
          <Block icon="⚠️" title="Litiges">
            <p>En cas de problème, clique sur Signaler un problème dans ta commande. L'équipe Brumerie examine sous 48h.</p>
            <Tip text="Le vendeur est bloqué pendant l'examen d'un litige." color="red" />
          </Block>
          <Block icon="📞" title="Contact dans une commande">
            <p>Dans chaque commande tu as accès à :</p>
            <Step n={1} text="Chat intégré — Messagerie directe dans l'app." />
            <Step n={2} text="WhatsApp — Message pré-rempli avec le numéro de commande." />
          </Block>
        </>)}

        {/* ══ STORIES ══ */}
        {section === 'stories' && (<>
          <Block icon="📸" title="C'est quoi les Stories ?">
            <p>Les Stories sont des publications éphémères (48h) visibles en haut de l'accueil. Elles permettent aux vendeurs Vérifiés de promouvoir leurs articles en temps réel.</p>
          </Block>
          <Block icon="🎯" title="Publier une story">
            <Step n={1} text="Clique sur ta bulle Ma story en haut de l'accueil." />
            <Step n={2} text="Sélectionne une photo depuis ta galerie." />
            <Step n={3} text="Ajoute une légende (120 caractères max)." />
            <Step n={4} text="Optionnel : lie un article de ta boutique pour que les acheteurs commandent directement." />
            <Step n={5} text="Clique Publier (48h)." />
            <Tip text="Seuls les vendeurs avec Badge Vérifié peuvent publier des Stories." color="blue" />
          </Block>
          <Block icon="👁" title="Voir une story">
            <Step n={1} text="Les stories des vendeurs s'affichent en haut de l'accueil." />
            <Step n={2} text="Clique sur la bulle d'un vendeur pour voir sa story." />
            <Step n={3} text="Si la story est liée à un article, tu vois un bouton Commander ou Faire une offre." />
            <Step n={4} text="Sans article lié, un bouton Contacter le vendeur s'affiche pour ouvrir le chat." />
            <Tip text="Le vendeur ne voit pas de bouton Contact sur sa propre story." color="green" />
          </Block>
        </>)}

        {/* ══ SÉCURITÉ ══ */}
        {section === 'security' && (<>
          <Block icon="🛡️" title="Règles de sécurité fondamentales">
            <Tip text="Ne partage jamais ton mot de passe ou code OTP avec quiconque, même Brumerie ne te le demandera jamais." color="red" />
            <Tip text="Ne paie jamais en avance sans avoir vérifié l'identité du vendeur ou sans le connaître." color="red" />
            <Tip text="Préfère les vendeurs avec le badge Vérifié ✅ — leur identité a été contrôlée." color="green" />
          </Block>
          <Block icon="🔍" title="Reconnaître un vendeur fiable">
            <Step n={1} text="Badge ✅ Vérifié — identité contrôlée par Brumerie." />
            <Step n={2} text="Photo de profil réelle et biographie complète." />
            <Step n={3} text="Avis positifs d'acheteurs précédents." />
            <Step n={4} text="Annonces cohérentes avec des photos nettes." />
            <Tip text="Méfie-toi des prix trop bas par rapport au marché." color="orange" />
          </Block>
          <Block icon="🚨" title="Signaler un vendeur suspect">
            <Step n={1} text="Ouvre la fiche du vendeur ou de l'article." />
            <Step n={2} text="Clique sur les 3 points ⋮ → Signaler." />
            <Step n={3} text="Brumerie examine sous 24h et peut suspendre le compte." />
          </Block>
          <Block icon="🔐" title="Sécurité de ton compte">
            <Step n={1} text="Utilise un email valide — c'est ton seul moyen de connexion." />
            <Step n={2} text="Active les notifications push pour être alerté en temps réel." />
            <Step n={3} text="Déconnecte-toi depuis Paramètres → Déconnexion si tu utilises un appareil partagé." />
          </Block>
        </>)}

        {/* ══ RÈGLES ══ */}
        {section === 'rules' && (<>
          <Block icon="📜" title="Ce qui est autorisé">
            <Step n={1} text="Articles légaux : vêtements, chaussures, électronique, beauté, alimentation, maison..." />
            <Step n={2} text="Articles d'occasion en bon état, clairement décrits." />
            <Step n={3} text="Prix libres fixés par le vendeur." />
            <Step n={4} text="Troc (échange) via la description de l'article." />
          </Block>
          <Block icon="🚫" title="Ce qui est interdit">
            <Tip text="Armes, drogues, médicaments non autorisés, alcool, contrefaçons." color="red" />
            <Tip text="Contenus pornographiques, offensants ou haineux." color="red" />
            <Tip text="Comptes multiples ou faux profils." color="red" />
            <Tip text="Spam, arnaques ou tentatives d'escroquerie." color="red" />
            <Tip text="Contacter des utilisateurs en dehors de Brumerie pour éviter les frais." color="red" />
          </Block>
          <Block icon="⚖️" title="Conséquences en cas de violation">
            <Step n={1} text="Avertissement pour les infractions mineures." />
            <Step n={2} text="Suspension temporaire du compte." />
            <Step n={3} text="Suppression définitive du compte sans remboursement pour les infractions graves." />
            <Tip text="Les décisions de modération de Brumerie sont finales au stade MVP." color="orange" />
          </Block>
          <Block icon="🏪" title="Responsabilités">
            <p>Brumerie est une plateforme de mise en relation. Brumerie n'est pas responsable :</p>
            <Step n={1} text="De la qualité des articles vendus." />
            <Step n={2} text="Des transactions effectuées en dehors de l'app." />
            <Step n={3} text="Des litiges entre acheteurs et vendeurs au stade MVP." />
            <Tip text="Utilise toujours le système de commande Brumerie pour être protégé." color="green" />
          </Block>
        </>)}

        {/* ══ CONTACT ══ */}
        {section === 'contact' && (<>
          <Block icon="💬" title="Nous contacter">
            <p>L'équipe Brumerie est disponible pour t'aider :</p>
            <Step n={1} text="Support technique : support@brumerie.com" />
            <Step n={2} text="Contact général : contact@brumerie.com" />
            <Step n={3} text="WhatsApp : +225 05 86 86 76 93" />
          </Block>
          <Block icon="🎥" title="Chaîne YouTube — Tutoriels vidéo">
            <p>Regarde nos tutoriels vidéo pour apprendre à utiliser Brumerie pas à pas.</p>
            <a href={ytLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mt-2 active:scale-95 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#DC2626"><path d="M23 7s-.3-2-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.2 3 12 3 12 3s-4.2 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.7c1.1 1.2 2.6 1.1 3.3 1.2C7.2 21.4 12 21.5 12 21.5s4.2 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.7 1.2-2.7 1.2-2.7s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.4l6.6 3.6-6.6 3.5z"/></svg>
              <div>
                <p className="font-black text-red-700 text-[12px]">Brumerie sur YouTube</p>
                <p className="text-red-500 text-[10px] font-bold truncate">{ytLink}</p>
              </div>
            </a>
          </Block>
          <Block icon="⏱" title="Délais de réponse">
            <Step n={1} text="WhatsApp : réponse en général sous 2h (jours ouvrables)." />
            <Step n={2} text="Email support : sous 24h." />
            <Step n={3} text="Email contact : sous 48h." />
          </Block>
          <Block icon="📖" title="Consulter les CGU">
            <p>Nos Conditions Générales d'Utilisation sont accessibles depuis Paramètres → CGU & Confidentialité.</p>
          </Block>
        </>)}

      </div>
    </div>
  );
}
