import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const BASE_URL = 'https://addressweb.brumerie.com';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/addresses/:code',
    title: 'Récupérer une adresse',
    desc: 'Retourne les détails complets d\'une adresse par son code AW.',
    example: `curl "${BASE_URL}/api/v1/addresses/AW-ABJ-84321" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
    response: `{
  "id": "uuid...",
  "addressCode": "AW-ABJ-84321",
  "latitude": 5.360012,
  "longitude": -4.008456,
  "repere": "Maison bleue derrière pharmacie",
  "ville": "Abidjan",
  "quartier": "Cocody",
  "pays": "Côte d'Ivoire",
  "isPublic": true,
  "viewCount": 42,
  "createdAt": "2026-03-17T00:00:00Z"
}`,
    color: 'bg-green-100 text-green-800',
  },
  {
    method: 'POST',
    path: '/api/v1/addresses',
    title: 'Créer une adresse',
    desc: 'Crée une nouvelle adresse numérique à partir de coordonnées GPS.',
    example: `curl -X POST "${BASE_URL}/api/v1/addresses" \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "latitude": 5.360012,
    "longitude": -4.008456,
    "repere": "Maison bleue derrière pharmacie",
    "ville": "Abidjan",
    "isPublic": true
  }'`,
    response: `{
  "addressCode": "AW-ABJ-84321",
  "shareLink": "https://addressweb.brumerie.com/AW-ABJ-84321",
  "latitude": 5.360012,
  "longitude": -4.008456
}`,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    method: 'GET',
    path: '/api/v1/addresses/search?q=:query',
    title: 'Rechercher des adresses',
    desc: 'Recherche des adresses publiques par ville, repère ou code AW.',
    example: `curl "${BASE_URL}/api/v1/addresses/search?q=Cocody&limit=10" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
    response: `{
  "results": [
    {
      "addressCode": "AW-ABJ-84321",
      "ville": "Abidjan",
      "quartier": "Cocody",
      "repere": "Maison bleue...",
      "latitude": 5.360012,
      "longitude": -4.008456
    }
  ],
  "total": 1
}`,
    color: 'bg-green-100 text-green-800',
  },
  {
    method: 'DELETE',
    path: '/api/v1/addresses/:code',
    title: 'Supprimer une adresse',
    desc: 'Supprime une adresse. Nécessite d\'en être le propriétaire.',
    example: `curl -X DELETE "${BASE_URL}/api/v1/addresses/AW-ABJ-84321" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
    response: `{
  "success": true,
  "message": "Adresse AW-ABJ-84321 supprimée"
}`,
    color: 'bg-red-100 text-red-800',
  },
];

export function ApiDocsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      toast.success('Copié !');
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              
              <Logo size={32} /><span className="text-xl font-bold text-gray-900">Address-Web</span>
              <span className="text-gray-400 mx-1">›</span>
              <span className="text-gray-600 font-medium">API</span>
            </Link>
            <Link to="/auth">
              <Button size="sm">Obtenir une clé API</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Intro */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">API Address-Web</h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Intégrez Address-Web dans vos applications. Créez, consultez et recherchez des adresses numériques depuis n'importe quelle plateforme — e-commerce, livraison, taxi, fintech.
          </p>
        </div>

        {/* Authentification */}
        <Card className="p-6 mb-8 border-indigo-200 bg-indigo-50">
          <h2 className="font-semibold text-indigo-900 mb-2">🔑 Authentification</h2>
          <p className="text-sm text-indigo-700 mb-3">
            Toutes les requêtes nécessitent un header <code className="bg-white px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs">Authorization: Bearer VOTRE_CLE_API</code>
          </p>
          <div className="bg-white rounded-lg p-3 font-mono text-xs text-gray-700 border">
            Base URL : {BASE_URL}/api/v1
          </div>
          <p className="text-xs text-indigo-600 mt-3">
            💡 Créez un compte pour obtenir votre clé API gratuite (100 requêtes/jour en plan gratuit).
          </p>
        </Card>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { plan: 'Gratuit', price: '0 FCFA', req: '100 req/jour', features: ['Lecture seule', 'Recherche', 'Support communauté'] },
            { plan: 'Starter', price: '5 000 FCFA/mois', req: '10 000 req/jour', features: ['Lecture + Écriture', 'Suppression', 'Support email'], highlight: true },
            { plan: 'Business', price: 'Sur devis', req: 'Illimité', features: ['Toutes les fonctions', 'Import CSV', 'SLA 99.9%', 'Support dédié'] },
          ].map(p => (
            <Card key={p.plan} className={`p-5 ${p.highlight ? 'border-indigo-400 border-2' : ''}`}>
              {p.highlight && (
                <span className="inline-block text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full mb-2 font-medium">
                  Recommandé
                </span>
              )}
              <h3 className="font-bold text-gray-900">{p.plan}</h3>
              <p className="text-indigo-600 font-semibold mt-1">{p.price}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.req}</p>
              <ul className="mt-3 space-y-1">
                {p.features.map(f => (
                  <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Endpoints */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Endpoints</h2>
        <div className="space-y-3">
          {ENDPOINTS.map((ep, i) => (
            <Card key={i} className="overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${ep.color}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-gray-600 flex-1">{ep.path}</code>
                <span className="text-sm text-gray-700 font-medium hidden sm:block">{ep.title}</span>
                {openIndex === i
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </button>

              {openIndex === i && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <p className="text-sm text-gray-600">{ep.desc}</p>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Exemple</span>
                      <button
                        onClick={() => copyCode(ep.example, i * 2)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedIndex === i * 2
                          ? <><Check className="w-3 h-3" /> Copié</>
                          : <><Copy className="w-3 h-3" /> Copier</>
                        }
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto leading-relaxed">
                      {ep.example}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Réponse</span>
                      <button
                        onClick={() => copyCode(ep.response, i * 2 + 1)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedIndex === i * 2 + 1
                          ? <><Check className="w-3 h-3" /> Copié</>
                          : <><Copy className="w-3 h-3" /> Copier</>
                        }
                      </button>
                    </div>
                    <pre className="bg-gray-50 text-gray-700 text-xs p-4 rounded-lg overflow-x-auto border leading-relaxed">
                      {ep.response}
                    </pre>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="mt-10 p-8 text-center bg-indigo-600 border-0">
          <h2 className="text-xl font-bold text-white mb-2">Prêt à intégrer Address-Web ?</h2>
          <p className="text-indigo-200 text-sm mb-5">
            Créez votre compte, obtenez votre clé API gratuite et commencez en quelques minutes.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/auth">
              <Button variant="secondary" size="lg">Créer un compte gratuit</Button>
            </Link>
            <a href="mailto:contact@addressweb.brumerie.com">
              <Button variant="outline" size="lg" className="border-indigo-300 text-white hover:bg-indigo-700">
                Contacter l'équipe
              </Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
      <PageGuide storageKey="api" steps={[{"icon": "🔌", "title": "API Address-Web", "desc": "Intégrez Address-Web dans vos applications, sites ou systèmes de livraison."}, {"icon": "🔑", "title": "Obtenir une clé API", "desc": "Créez un compte et allez dans Profil → API pour générer votre clé gratuite."}, {"icon": "📡", "title": "Faire une requête", "desc": "Utilisez l'en-tête Authorization: Bearer VOTRE_CLE dans chaque requête."}, {"icon": "📊", "title": "Limites", "desc": "100 requêtes/jour en gratuit. Passez premium pour 10 000 req/jour."}]} />
      <PageGuide storageKey="api" steps={[{"icon": "🔌", "title": "API Address-Web", "desc": "Intégrez Address-Web dans vos apps et systèmes de livraison."}, {"icon": "🔑", "title": "Obtenir une clé", "desc": "Allez dans Profil puis API pour générer votre clé gratuite."}, {"icon": "📡", "title": "Faire une requête", "desc": "Utilisez Authorization: Bearer VOTRE_CLE dans chaque requête."}, {"icon": "📊", "title": "Limites", "desc": "100 requêtes/jour en gratuit. Premium donne 10 000/jour."}]} />
    </>
  );
}
