import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getAppConfig } from '@/services/appConfigService';
import { setGuideMeta } from '@/utils/seo';

interface GuidePageProps { onBack: () => void; }

type SectionId = 'intro' | 'buyer' | 'seller' | 'verified' | 'payments' | 'orders' | 'delivery' | 'stories' | 'security' | 'rules' | 'contact';

const NAV: { id: SectionId; icon: string; label: string }[] = [
  { id: 'intro',    icon: '🛍',  label: 'Brumerie' },
  { id: 'buyer',    icon: '🛒',  label: 'Acheter' },
  { id: 'seller',   icon: '📦',  label: 'Vendre' },
  { id: 'verified', icon: '✅',  label: 'Vérifié' },
  { id: 'payments', icon: '💳',  label: 'Paiements' },
  { id: 'orders',   icon: '📋',  label: 'Commandes' },
  { id: 'delivery', icon: '🚚',  label: 'Livraison' },
  { id: 'stories',  icon: '📸',  label: 'Stories' },
  { id: 'security', icon: '🛡️',  label: 'Sécurité' },
  { id: 'rules',    icon: '📜',  label: 'Règles' },
  { id: 'contact',  icon: '💬',  label: 'Contact' },
];

function Block({ icon, title, children }: { icon?: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{title}</h3>
      </div>
      <div className="space-y-2 text-[12px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium text-white mt-0.5 bg-emerald-600">{n}</div>
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
    <div className="rounded-lg px-4 py-3 flex gap-2 font-medium text-xs"
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.text }}>
      <span>{s.icon}</span><span>{text}</span>
    </div>
  );
}

export function GuidePage({ onBack }: GuidePageProps) {
  const [section, setSection] = useState<SectionId>('intro');
  const config = getAppConfig();
  const ytLink = config.youtubeChannel || 'https://youtube.com/@brumerie';

  useEffect(() => { setGuideMeta(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={onBack} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center active:scale-95 transition-transform">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Guide Brumerie</h1>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Tout savoir pour acheter et vendre</p>
        </div>
        <a href={ytLink} target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 active:scale-95 transition-transform">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#DC2626"><path d="M23 7s-.3-2-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.2 3 12 3 12 3s-4.2 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.7c1.1 1.2 2.6 1.1 3.3 1.2C7.2 21.4 12 21.5 12 21.5s4.2 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.7 1.2-2.7 1.2-2.7s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.4l6.6 3.6-6.6 3.5z"/></svg>
          <span className="text-xs font-medium text-red-600">Tutoriels</span>
        </a>
      </div>

      {/* Navigation horizontale */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${section === n.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700'}`}>
            <span>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ══ INTRO ══ */}
        {section === 'intro' && (<>
          <Block icon="🛍" title="Qu'est-ce que Brumerie ?">
            <p><strong>Brumerie est le premier social commerce de Côte d'Ivoire.</strong> On connecte les acheteurs et les vendeurs de ton quartier — sans intermédiaire, sans paperasse, sans boutique physique.</p>
            <p>Achète et vends des articles neufs ou d'occasion : mode, high-tech, beauté, maison, alimentation et bien plus.</p>
          </Block>
          <Block icon="🌍" title="Disponible partout en Côte d'Ivoire">
            <p>Brumerie couvre Abidjan, Bouaké, Yamoussoukro, San-Pédro et toutes les villes de Côte d'Ivoire. Tu filtres par ville et par quartier pour acheter près de chez toi.</p>
          </Block>
          <Block icon="🔄" title="Trois modes d'utilisation">
            <Step n={1} text="Mode Acheteur — Parcours les annonces, contacte les vendeurs, commande et reçois chez toi." />
            <Step n={2} text="Mode Vendeur — Publie tes articles, gère tes commandes et encaisse via Mobile Money." />
            <Step n={3} text="Mode Livreur (BruMove) — Accepte des missions de livraison et gagne de l'argent dans ton quartier." />
            <Tip text="Tu peux basculer entre les modes depuis Paramètres." color="blue" />
          </Block>
          <Block icon="🤖" title="Brume IA — Ton assistant intelligent">
            <p>Brumerie intègre une intelligence artificielle pour t'aider :</p>
            <Step n={1} text="Suggestions de prix basées sur le marché local." />
            <Step n={2} text="Amélioration automatique de tes descriptions d'annonces." />
            <Step n={3} text="Réponses rapides aux questions fréquentes." />
          </Block>
          <Block icon="📱" title="Installer l'application">
            <p>Brumerie est une application web progressive (PWA). Installe-la sur ton téléphone comme une vraie app, sans passer par Play Store.</p>
            <Tip text="Sur Chrome Android : menu ⋮ → Ajouter à l'écran d'accueil." color="blue" />
            <Tip text="Sur iPhone Safari : bouton partage → Sur l'écran d'accueil." color="blue" />
          </Block>
        </>)}

        {/* ══ ACHETEUR ══ */}
        {section === 'buyer' && (<>
          <Block icon="🔍" title="Trouver un article">
            <Step n={1} text="Ouvre l'accueil — les articles récents de ta ville s'affichent automatiquement." />
            <Step n={2} text="Utilise la barre de recherche pour chercher par mot-clé (ex: 'iPhone 13', 'robe wax')." />
            <Step n={3} text="Filtre par catégorie, quartier, fourchette de prix ou état (neuf/occasion)." />
            <Step n={4} text="Clique sur un article pour voir les photos, la description et le profil du vendeur." />
            <Tip text="Tape @nom dans la recherche pour trouver directement un vendeur." color="blue" />
          </Block>
          <Block icon="💬" title="Contacter un vendeur">
            <Step n={1} text="Sur la fiche article, clique sur le bouton Chat." />
            <Step n={2} text="Une conversation s'ouvre directement avec le vendeur." />
            <Step n={3} text="Tu peux négocier le prix via le bouton Faire une offre." />
            <Tip text="Privilégie le chat intégré — toutes les conversations sont archivées et servent de preuve en cas de litige." color="green" />
          </Block>
          <Block icon="🛒" title="Passer une commande">
            <Step n={1} text="Clique sur Acheter sur la fiche produit." />
            <Step n={2} text="Choisis ton mode de paiement : Escrow sécurisé (recommandé) ou Payer à la livraison." />
            <Step n={3} text="Confirme ta commande — le vendeur est notifié instantanément." />
            <Step n={4} text="Suis l'avancement dans l'onglet Commandes." />
          </Block>
          <Block icon="⭐" title="Noter un vendeur">
            <p>Après réception confirmée (code de livraison validé), tu peux laisser un avis. Tes avis aident la communauté à acheter en confiance.</p>
            <Tip text="Tu ne peux noter qu'une seule fois par commande." color="green" />
          </Block>
          <Block icon="🔖" title="Favoris et alertes">
            <Step n={1} text="Clique sur le signet d'un article pour l'ajouter à tes favoris." />
            <Step n={2} text="Crée une alerte de recherche pour être notifié dès qu'un article correspondant est publié." />
          </Block>
        </>)}

        {/* ══ VENDEUR ══ */}
        {section === 'seller' && (<>
          <Block icon="📦" title="Plan Vendeur — Gratuit">
            <p>Sans abonnement, tu bénéficies de :</p>
            <Step n={1} text="5 annonces actives simultanées." />
            <Step n={2} text="5 messages chat par jour." />
            <Step n={3} text="Accès au tableau de bord vendeur." />
            <Tip text="Pour débloquer plus de capacités, passe au Badge Vérifié (3 000 FCFA/mois)." color="blue" />
          </Block>
          <Block icon="📸" title="Publier une annonce">
            <Step n={1} text="Clique sur le bouton + en bas de l'écran." />
            <Step n={2} text="Ajoute au moins 2 photos nettes de ton article (5 max)." />
            <Step n={3} text="Remplis : titre clair, prix, description détaillée (état, taille, marque)." />
            <Step n={4} text="Choisis la catégorie et ton quartier." />
            <Step n={5} text="Publie — ton article est visible immédiatement." />
            <Tip text="Les photos de qualité augmentent tes chances de vente. Évite les photos floues ou sombres." color="green" />
            <Tip text="Une photo de profil est obligatoire pour publier." color="orange" />
          </Block>
          <Block icon="💰" title="Configurer tes paiements">
            <Step n={1} text="Va dans Paramètres → Paiements Mobile Money." />
            <Step n={2} text="Ajoute tes numéros : Wave, Orange Money, MTN MoMo ou Moov Money." />
            <Step n={3} text="Indique le nom du titulaire du compte." />
            <Tip text="Sans moyen de paiement configuré, les acheteurs ne peuvent pas te payer par Mobile Money." color="orange" />
          </Block>
          <Block icon="🚀" title="Booster une annonce">
            <p>Un boost propulse ton annonce en tête de liste :</p>
            <Step n={1} text="24h — 500 FCFA" />
            <Step n={2} text="48h — 800 FCFA" />
            <Step n={3} text="7 jours — 3 000 FCFA" />
            <Tip text="Les vendeurs Vérifiés reçoivent 20 boosts gratuits par mois." color="green" />
          </Block>
          <Block icon="📊" title="Tableau de bord">
            <p>Depuis ton Dashboard tu vois en temps réel :</p>
            <Step n={1} text="Tes annonces actives et leurs vues." />
            <Step n={2} text="Tes commandes en cours et leur statut." />
            <Step n={3} text="Tes avis clients et ta note moyenne." />
            <Step n={4} text="Tes revenus et statistiques de vente." />
          </Block>
        </>)}

        {/* ══ VÉRIFIÉ / PREMIUM ══ */}
        {section === 'verified' && (<>
          <Block icon="✅" title="Badge Vérifié — 3 000 FCFA/mois">
            <p>Le badge prouve que Brumerie a contrôlé ton identité. Il inspire confiance et booste ta visibilité.</p>
            <p><strong>Avantages :</strong></p>
            <Step n={1} text="Badge ✅ visible sur toutes tes annonces et ton profil." />
            <Step n={2} text="20 annonces actives (au lieu de 5)." />
            <Step n={3} text="Chat illimité avec les acheteurs." />
            <Step n={4} text="20 boosts offerts par mois." />
            <Step n={5} text="Accès aux Stories (contenu éphémère 48h)." />
            <Step n={6} text="Liens réseaux sociaux sur ton profil boutique." />
            <Step n={7} text="Outils business : Comptabilité, CRM, Catalogue WhatsApp, Calculateur de marge." />
          </Block>
          <Block icon="📋" title="Comment obtenir le badge ?">
            <Step n={1} text="Va dans Paramètres → Vérification & Abonnement." />
            <Step n={2} text="Effectue le paiement de 3 000 FCFA via le lien affiché." />
            <Step n={3} text="Envoie ta preuve de paiement sur WhatsApp au numéro indiqué." />
            <Step n={4} text="Prépare : une photo de ton visage + une pièce d'identité (CNI, passeport, permis ou carte étudiant)." />
            <Step n={5} text="Brumerie valide et active ton badge sous 24h." />
            <Tip text="Le registre de commerce n'est PAS requis. Les vendeurs informels sont bienvenus." color="blue" />
          </Block>
          <Block icon="🔄" title="Renouvellement">
            <p>Le badge est valable 30 jours. Tu reçois une notification 3 jours avant l'expiration.</p>
            <Tip text="Si ton badge expire, tu repasses au plan gratuit (5 annonces, 5 messages/jour) mais tes annonces restent en ligne." color="orange" />
          </Block>
          <Block icon="🤝" title="Programme d'affiliation">
            <p>Parraine des vendeurs et gagne <strong>20% de commission</strong> sur leurs abonnements :</p>
            <Step n={1} text="Partage ton lien d'affiliation depuis Paramètres → Affiliation vendeur." />
            <Step n={2} text="Quand un vendeur s'abonne grâce à ton lien, tu gagnes 600 FCFA/mois tant qu'il reste abonné." />
            <Tip text="Aucune limite sur le nombre de filleuls." color="green" />
          </Block>
        </>)}

        {/* ══ PAIEMENTS ══ */}
        {section === 'payments' && (<>
          <Block icon="🔐" title="Escrow — Paiement sécurisé (recommandé)">
            <p><strong>L'escrow protège ton argent</strong> : le paiement est bloqué par Brumerie jusqu'à la confirmation de réception.</p>
            <Step n={1} text="L'acheteur paie — l'argent est sécurisé par Brumerie (+ 100 FCFA de frais de sécurisation)." />
            <Step n={2} text="Le vendeur prépare et envoie l'article." />
            <Step n={3} text="L'acheteur confirme la réception avec le code de livraison." />
            <Step n={4} text="L'argent est libéré au vendeur." />
            <Tip text="Si l'article n'arrive pas ou ne correspond pas, l'acheteur est remboursé." color="green" />
          </Block>
          <Block icon="💳" title="Moyens de paiement acceptés">
            <Step n={1} text="Wave — Paiement par lien direct ou virement." />
            <Step n={2} text="Orange Money — Virement au numéro du vendeur." />
            <Step n={3} text="MTN MoMo — Virement au numéro du vendeur." />
            <Step n={4} text="Moov Money — Virement au numéro du vendeur." />
          </Block>
          <Block icon="🤝" title="Payer à la livraison">
            <Step n={1} text="Sélectionne Payer à la livraison lors de ta commande." />
            <Step n={2} text="Le vendeur prépare et livre l'article." />
            <Step n={3} text="Tu paies en cash ou Mobile Money à la réception." />
            <Step n={4} text="Saisis le code de livraison pour confirmer." />
            <Tip text="Idéal pour les transactions en face-à-face dans ton quartier." color="green" />
          </Block>
          <Block icon="💸" title="Payer en avance (Mobile Money direct)">
            <Step n={1} text="Vérifie d'abord la disponibilité avec le vendeur via le chat." />
            <Step n={2} text="Envoie le montant exact au numéro indiqué." />
            <Step n={3} text="Prends une capture d'écran de la confirmation." />
            <Step n={4} text="Uploade la preuve dans ta commande sur Brumerie." />
            <Step n={5} text="Le vendeur confirme et prépare la livraison." />
            <Tip text="Préfère l'escrow pour les vendeurs que tu ne connais pas encore." color="orange" />
          </Block>
          <Block icon="🔑" title="Code de livraison">
            <p>Un code unique à 6 caractères (ex: XK9B2R) est généré pour chaque commande confirmée :</p>
            <Step n={1} text="L'acheteur et le vendeur voient le code dans leur commande." />
            <Step n={2} text="À la réception physique, l'acheteur saisit le code pour confirmer." />
            <Step n={3} text="La transaction se termine — les avis se débloquent." />
            <Tip text="Ne communique JAMAIS ton code avant d'avoir reçu et vérifié l'article." color="red" />
          </Block>
        </>)}

        {/* ══ COMMANDES ══ */}
        {section === 'orders' && (<>
          <Block icon="📋" title="Cycle d'une commande">
            <Step n={1} text="Initiée — L'acheteur a passé commande." />
            <Step n={2} text="Preuve envoyée — L'acheteur a uploadé sa preuve de paiement (si paiement avance)." />
            <Step n={3} text="Paiement confirmé — Le vendeur a reçu l'argent." />
            <Step n={4} text="Prête à livrer — Le vendeur prépare l'article et génère le code." />
            <Step n={5} text="En livraison — Un livreur a pris en charge le colis." />
            <Step n={6} text="Livrée ✓ — L'acheteur a confirmé la réception avec le code." />
          </Block>
          <Block icon="⏱" title="Délais">
            <Step n={1} text="Vendeur : confirmer la réception du paiement sous 24h." />
            <Step n={2} text="Vendeur : préparer la livraison sous 48h après confirmation." />
            <Step n={3} text="Sans action du vendeur en 24h → un litige est automatiquement ouvert." />
            <Tip text="Vendeur : vérifie régulièrement tes notifications pour ne rien manquer." color="orange" />
          </Block>
          <Block icon="❌" title="Annuler une commande">
            <p>L'acheteur peut annuler une commande tant que le vendeur n'a pas confirmé le paiement.</p>
            <Tip text="Après confirmation du paiement, contacte le vendeur ou ouvre un litige pour annuler." color="blue" />
          </Block>
          <Block icon="⚠️" title="Litiges">
            <Step n={1} text="Clique sur Signaler un problème dans ta commande." />
            <Step n={2} text="Décris le problème (article non reçu, non conforme, etc.)." />
            <Step n={3} text="L'équipe Brumerie examine sous 48h." />
            <Tip text="En cas d'escrow, l'argent reste bloqué pendant l'examen du litige." color="green" />
          </Block>
        </>)}

        {/* ══ LIVRAISON ══ */}
        {section === 'delivery' && (<>
          <Block icon="🚚" title="Comment fonctionne la livraison ?">
            <Step n={1} text="Le vendeur prépare le colis et indique qu'il est prêt." />
            <Step n={2} text="Un livreur disponible dans le quartier accepte la mission." />
            <Step n={3} text="Le livreur récupère le colis chez le vendeur." />
            <Step n={4} text="Le livreur livre à l'adresse de l'acheteur." />
            <Step n={5} text="L'acheteur confirme avec le code de livraison." />
          </Block>
          <Block icon="💪" title="Devenir livreur (BruMove)">
            <p>Tu veux gagner de l'argent en livrant dans ton quartier ? Deviens livreur Brumerie :</p>
            <Step n={1} text="Va dans Paramètres → Devenir Livreur." />
            <Step n={2} text="Accepte les CGU livreur." />
            <Step n={3} text="Tu apparais dans la liste des livreurs disponibles." />
            <Step n={4} text="Accepte les missions qui te conviennent et livre." />
            <Tip text="Tu choisis tes horaires et ta zone — aucune obligation de volume." color="green" />
          </Block>
          <Block icon="📍" title="Adresse numérique">
            <p>Brumerie utilise un système d'adresse numérique pour faciliter les livraisons :</p>
            <Step n={1} text="Crée ton adresse depuis Paramètres → Modifier mon profil." />
            <Step n={2} text="Un code unique est généré (ex: BRM-4K9X)." />
            <Step n={3} text="Le livreur utilise ce code pour te localiser précisément." />
            <Tip text="Plus besoin d'expliquer ta position — partage simplement ton code d'adresse." color="green" />
          </Block>
          <Block icon="💵" title="Frais de livraison">
            <p>Les frais dépendent de la distance entre le vendeur et l'acheteur. Ils sont affichés avant la confirmation de commande.</p>
            <Tip text="Les vendeurs peuvent aussi gérer eux-mêmes la livraison si le livreur n'est pas disponible." color="blue" />
          </Block>
        </>)}

        {/* ══ STORIES ══ */}
        {section === 'stories' && (<>
          <Block icon="📸" title="C'est quoi les Stories ?">
            <p>Les Stories sont des publications éphémères (48h) visibles en haut de l'accueil. Elles permettent aux vendeurs Vérifiés de montrer leurs nouveautés en temps réel.</p>
          </Block>
          <Block icon="🎯" title="Publier une story">
            <Step n={1} text="Clique sur ta bulle Ma story en haut de l'accueil." />
            <Step n={2} text="Sélectionne une photo depuis ta galerie." />
            <Step n={3} text="Ajoute une légende (120 caractères max)." />
            <Step n={4} text="Optionnel : lie un article pour que les acheteurs commandent directement." />
            <Step n={5} text="Publie — visible 48h pour tous les utilisateurs." />
            <Tip text="Réservé aux vendeurs avec Badge Vérifié." color="blue" />
          </Block>
          <Block icon="👁" title="Voir et interagir avec une story">
            <Step n={1} text="Les bulles des vendeurs s'affichent en haut de l'accueil." />
            <Step n={2} text="Clique sur une bulle pour voir la story." />
            <Step n={3} text="Si un article est lié : boutons Commander et Faire une offre." />
            <Step n={4} text="Sans article lié : bouton Contacter le vendeur." />
          </Block>
          <Block icon="💡" title="Conseils pour des stories efficaces">
            <Step n={1} text="Publie régulièrement pour rester visible en tête de liste." />
            <Step n={2} text="Lie toujours un article — ça facilite l'achat impulsif." />
            <Step n={3} text="Montre le produit en situation réelle (porté, utilisé, en contexte)." />
          </Block>
        </>)}

        {/* ══ SÉCURITÉ ══ */}
        {section === 'security' && (<>
          <Block icon="🛡️" title="Règles de sécurité">
            <Tip text="Ne partage jamais ton mot de passe ou code OTP — même Brumerie ne te le demandera jamais." color="red" />
            <Tip text="Utilise l'escrow pour toute transaction avec un vendeur que tu ne connais pas." color="green" />
            <Tip text="Privilégie les vendeurs avec le badge Vérifié ✅." color="green" />
          </Block>
          <Block icon="🔍" title="Reconnaître un vendeur fiable">
            <Step n={1} text="Badge ✅ Vérifié — identité contrôlée par Brumerie." />
            <Step n={2} text="Photo de profil réelle et bio complète." />
            <Step n={3} text="Avis positifs d'acheteurs précédents." />
            <Step n={4} text="Annonces cohérentes avec des photos nettes et originales." />
            <Step n={5} text="Répond rapidement dans le chat." />
            <Tip text="Méfie-toi des prix anormalement bas par rapport au marché." color="orange" />
          </Block>
          <Block icon="🚨" title="Signaler un comportement suspect">
            <Step n={1} text="Ouvre le profil du vendeur ou la fiche article." />
            <Step n={2} text="Clique sur les 3 points ⋮ → Signaler." />
            <Step n={3} text="Choisis le motif (arnaque, faux profil, contenu interdit)." />
            <Step n={4} text="Brumerie examine sous 24h et prend les mesures nécessaires." />
            <Tip text="Consulte aussi la page Anti-Arnaque (Paramètres → Anti-Arnaque) pour voir la liste noire." color="blue" />
          </Block>
          <Block icon="🔐" title="Protéger ton compte">
            <Step n={1} text="Utilise un email valide et un mot de passe unique." />
            <Step n={2} text="Active les notifications push pour les alertes de sécurité." />
            <Step n={3} text="Déconnecte-toi si tu utilises un appareil partagé." />
            <Step n={4} text="Ne clique jamais sur des liens suspects reçus en message." />
          </Block>
        </>)}

        {/* ══ RÈGLES ══ */}
        {section === 'rules' && (<>
          <Block icon="✅" title="Ce qui est autorisé">
            <Step n={1} text="Articles légaux : mode, chaussures, électronique, beauté, alimentation, maison, sport..." />
            <Step n={2} text="Articles d'occasion en bon état, clairement décrits avec photos réelles." />
            <Step n={3} text="Prix libres fixés par le vendeur." />
            <Step n={4} text="Négociation via le système d'offres intégré." />
          </Block>
          <Block icon="🚫" title="Ce qui est strictement interdit">
            <Tip text="Armes, drogues, médicaments non autorisés, produits contrefaits." color="red" />
            <Tip text="Contenus pornographiques, offensants, discriminatoires ou haineux." color="red" />
            <Tip text="Faux profils, comptes multiples ou usurpation d'identité." color="red" />
            <Tip text="Spam, arnaques ou manipulation des avis." color="red" />
          </Block>
          <Block icon="⚖️" title="Sanctions">
            <Step n={1} text="Avertissement pour les infractions mineures (annonce mal catégorisée, description incomplète)." />
            <Step n={2} text="Suspension temporaire en cas de récidive ou infraction modérée." />
            <Step n={3} text="Suppression définitive du compte pour arnaque, contenu illégal ou comportement dangereux." />
            <Tip text="Les vendeurs signalés sont visibles dans la liste Anti-Arnaque." color="orange" />
          </Block>
          <Block icon="📝" title="Bonnes pratiques">
            <Step n={1} text="Décris honnêtement l'état de tes articles (défauts inclus)." />
            <Step n={2} text="Réponds rapidement aux messages des acheteurs." />
            <Step n={3} text="Utilise toujours le système de commande Brumerie pour être protégé." />
            <Step n={4} text="Ne communique pas tes coordonnées personnelles dans les annonces." />
          </Block>
        </>)}

        {/* ══ CONTACT ══ */}
        {section === 'contact' && (<>
          <Block icon="💬" title="Nous contacter">
            <p>L'équipe Brumerie est disponible pour t'aider :</p>
            <Step n={1} text="WhatsApp : +225 05 86 86 76 93 (réponse sous 2h en semaine)." />
            <Step n={2} text="Email support : support@brumerie.com (réponse sous 24h)." />
            <Step n={3} text="Email général : contact@brumerie.com (réponse sous 48h)." />
          </Block>
          <Block icon="🎥" title="Tutoriels vidéo">
            <p>Apprends à utiliser Brumerie pas à pas avec nos vidéos :</p>
            <a href={ytLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-2 active:scale-95 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#DC2626"><path d="M23 7s-.3-2-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.2 3 12 3 12 3s-4.2 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.7c1.1 1.2 2.6 1.1 3.3 1.2C7.2 21.4 12 21.5 12 21.5s4.2 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.7 1.2-2.7 1.2-2.7s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.4l6.6 3.6-6.6 3.5z"/></svg>
              <div>
                <p className="font-semibold text-red-700 text-xs">Brumerie sur YouTube</p>
                <p className="text-red-500 text-[10px] font-medium">Tutoriels, astuces et nouveautés</p>
              </div>
            </a>
          </Block>
          <Block icon="👥" title="Rejoindre la communauté">
            <p>Échange avec d'autres vendeurs et acheteurs :</p>
            <Step n={1} text="Instagram : @brumerie" />
            <Step n={2} text="TikTok : @brumerie" />
            <Tip text="Suis-nous pour les annonces de nouvelles fonctionnalités et promotions." color="green" />
          </Block>
          <Block icon="📖" title="Documents légaux">
            <p>Consulte nos CGU et politique de confidentialité depuis Paramètres → Légal.</p>
          </Block>
        </>)}

      </div>
    </div>
  );
}
