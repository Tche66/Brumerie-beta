import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Check, ShieldCheck, QrCode, Zap, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0',
    period: 'pour toujours',
    color: 'border-gray-200',
    icon: <Logo size={24} />,
    highlight: false,
    features: [
      'Créer des adresses AW',
      'Partager via WhatsApp / lien',
      'Navigation GPS',
      'QR code numérique',
      'Visible sur la carte Explorer',
      '100 req/jour via API',
    ],
    cta: 'Commencer gratuitement',
    ctaLink: '/auth',
  },
  {
    id: 'premium_annual',
    name: 'Premium Annuel',
    price: '10',
    period: 'par an (~833 FCFA/mois)',
    color: 'border-indigo-400',
    icon: <ShieldCheck className="w-6 h-6 text-indigo-600" />,
    highlight: true,
    badge: 'Recommandé',
    features: [
      'Tout le plan Gratuit',
      'Badge ✓ Vérifié sur toutes vos adresses',
      'Adresses mises en avant sur Explorer',
      'Statistiques : vues, partages',
      '10 000 req/jour via API',
      'Import CSV jusqu\'à 1000 adresses',
      'Support prioritaire par email',
    ],
    cta: 'Choisir Premium Annuel',
    ctaLink: '/paiement?plan=premium_annual',
  },
  {
    id: 'premium_lifetime',
    name: 'Premium Lifetime',
    price: '25',
    period: 'paiement unique à vie',
    color: 'border-amber-300',
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    highlight: false,
    badge: 'Offre limitée',
    features: [
      'Tout le plan Premium',
      'Accès à vie sans abonnement',
      'QR code physique inclus (1 plaque)',
      'Adresse prioritaire dans les recherches',
      'Certificat d\'adresse numérique',
    ],
    cta: 'Obtenir Lifetime',
    ctaLink: '/paiement?plan=premium_lifetime',
  },
  {
    id: 'enterprise',
    name: 'API Entreprise',
    price: '50',
    period: 'par mois',
    color: 'border-purple-300',
    icon: <Building2 className="w-6 h-6 text-purple-600" />,
    highlight: false,
    features: [
      'Requêtes API illimitées',
      'SLA 99.9% de disponibilité',
      'Import CSV illimité',
      'Accès en lecture à toutes les adresses publiques',
      'Tableau de bord d\'analytique',
      'Support dédié + onboarding',
      'Intégration GPS / ERP personnalisée',
    ],
    cta: 'Contacter l\'équipe',
    ctaLink: 'mailto:api@addressweb.brumerie.com',
  },
];

const QR_ORDER = {
  price: '2.5',
  desc: 'Plaque ou sticker QR code physique avec votre adresse AW',
  features: [
    'Format plaque plastique résistante',
    'QR code + code AW imprimé',
    'Livraison dans votre ville',
    'Idéal pour commerces, bureaux, domiciles',
  ],
};

export function PlansPage() {
  const { user } = useAuth();
  const [qrAddress, setQrAddress] = useState('');

  const handleQrOrder = () => {
    if (!qrAddress.trim()) { toast.error('Entrez votre code AW'); return; }
    if (!user) { toast.error('Connexion requise pour commander'); return; }
    toast.success('Commande enregistrée ! Nous vous contacterons par email.');
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              
              <Logo size={32} /><span className="text-xl font-bold text-gray-900">Address-Web</span>
            </Link>
            {!user && <Link to="/auth"><Button size="sm">Se connecter</Button></Link>}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Plans et tarifs</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Commencez gratuitement. Passez premium pour débloquer la visibilité, le badge certifié et l'API.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          {PLANS.map(plan => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col relative ${plan.highlight ? 'border-2 border-indigo-400 shadow-lg' : `border ${plan.color}`}`}
            >
              {(plan.badge) && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${
                  plan.badge === 'Recommandé' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                {plan.icon}
                <h2 className="font-bold text-gray-900">{plan.name}</h2>
              </div>

              <div className="mb-5">
                <span className="text-4xl font-bold text-gray-900">{plan.price}$</span>
                <span className="text-gray-500 text-sm ml-2">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.ctaLink.startsWith('mailto:') ? (
                <a href={plan.ctaLink}>
                  <Button variant="outline" className="w-full">{plan.cta}</Button>
                </a>
              ) : (
                <Link to={plan.ctaLink}>
                  <Button className={`w-full ${plan.highlight ? '' : 'variant-outline'}`}
                    variant={plan.highlight ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
              )}
            </Card>
          ))}
        </div>

        {/* QR Code physique */}
        <Card className="p-8 mb-12 border-2 border-dashed border-gray-300">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <QrCode className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">QR Code physique</h2>
                <span className="text-2xl font-bold text-indigo-600">2.5$ / plaque</span>
              </div>
              <p className="text-gray-600 mb-4">{QR_ORDER.desc}</p>
              <ul className="space-y-2">
                {QR_ORDER.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 max-w-sm w-full">
              <p className="text-sm font-medium text-gray-700 mb-2">Votre code AW</p>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-3 focus:outline-none focus:border-indigo-400"
                placeholder="AW-ABJ-84321"
                value={qrAddress}
                onChange={e => setQrAddress(e.target.value.toUpperCase())}
              />
              <Button className="w-full" onClick={handleQrOrder}>
                <QrCode className="w-4 h-4 mr-2" />Commander ma plaque QR
              </Button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Paiement par Mobile Money — livraison sous 5–7 jours
              </p>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
              { q: 'Comment payer ?', r: 'Nous acceptons Mobile Money (MTN, Orange, Wave, M-Pesa), carte bancaire et virement. Contactez-nous par email pour valider votre abonnement.' },
              { q: 'L\'API fonctionne-t-elle sans abonnement ?', r: 'Oui — le plan gratuit donne accès à 100 requêtes par jour. Pour plus, passez sur un plan payant.' },
              { q: 'Qu\'est-ce que le badge "Certifiée" ?', r: 'Quand 3 utilisateurs différents confirment qu\'une adresse est correcte, elle obtient le badge Certifié. C\'est un signal de confiance pour les livreurs et visiteurs.' },
              { q: 'Puis-je annuler mon abonnement ?', r: 'Oui, contactez-nous et votre accès reste actif jusqu\'à la fin de la période payée.' },
            ].map(faq => (
              <Card key={faq.q} className="p-5">
                <p className="font-semibold text-gray-900 mb-2">{faq.q}</p>
                <p className="text-gray-600 text-sm">{faq.r}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
      <PageGuide storageKey="plans" steps={[{"icon": "🆓", "title": "Plan gratuit", "desc": "Commencez sans payer — créez vos adresses et partagez-les."}, {"icon": "⭐", "title": "Premium Annuel", "desc": "Badge Certifié, stats et API avancée pour 10 dollars par an."}, {"icon": "♾️", "title": "Lifetime", "desc": "Payez une fois, accès à vie. Idéal pour usage durable."}, {"icon": "📱", "title": "Paiement", "desc": "Mobile Money MTN, Orange, Wave. Contactez-nous après votre choix."}]} />
    </>
  );
}
