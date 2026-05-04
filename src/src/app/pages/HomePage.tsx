import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  MapPin, Share2, Navigation, QrCode, Users, Truck,
  Building, Search, LogIn, User, CheckCircle, Star,
  ShieldCheck, Smartphone, Globe, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState('');

  const handleSearch = () => {
    if (searchCode.trim()) navigate(`/${searchCode.trim().toUpperCase()}`);
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      {/* ── HEADER ── */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size={36} />
              <h1 className="text-2xl font-bold text-gray-900">Address-Web</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/explorer">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Search className="w-4 h-4 mr-1" /> Explorer
                </Button>
              </Link>
              <Link to="/plans">
                <Button variant="ghost" size="sm" className="hidden sm:flex text-indigo-600">
                  ✨ Tarifs
                </Button>
              </Link>
              {user ? (
                <Link to="/profil">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <User className="w-4 h-4 mr-1" /> Mon profil
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">
                      <LogIn className="w-4 h-4 mr-1" /> Connexion
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Créer une adresse
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span>⭐</span> Une initiative Brumerie pour l'Afrique
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
          Créez votre adresse<br className="hidden sm:block" />
          <span className="text-indigo-600"> numérique précise</span>
        </h2>
        <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
          Partagez votre localisation exacte en un clic.
          Une solution simple pour les zones sans adresse postale.
        </p>
        <p className="text-sm text-gray-500 mb-8 max-w-xl mx-auto">
          En Afrique, plus de 60% des lieux n'ont pas d'adresse officielle. Address-Web résout ce problème en donnant à chaque maison, commerce et bureau un code unique permanent.
        </p>

        {/* Barre de recherche */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6">
          <input
            type="text"
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Entrez un code AW-ABJ-84321 ou un lieu..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-indigo-400 text-sm shadow-sm"
          />
          <Button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-sm">
            <Search className="w-4 h-4 mr-2" /> Chercher
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/create">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-md">
              <MapPin className="w-5 h-5 mr-2" /> Créer mon adresse gratuitement
            </Button>
          </Link>
          <Link to="/explorer">
            <Button size="lg" variant="outline" className="px-8">
              <Globe className="w-5 h-5 mr-2" /> Voir la carte
            </Button>
          </Link>
        </div>

        {/* Démo URL */}
        <div className="mt-8 inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-xl px-4 py-2.5 shadow-sm border border-white">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-400 font-mono text-sm">addressweb.brumerie.com/</span>
          <span className="text-indigo-600 font-bold font-mono text-sm">AW-ABJ-84321</span>
        </div>
      </section>

      {/* ── POURQUOI ADDRESS-WEB PLUTÔT QUE GOOGLE MAPS ── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Pourquoi pas juste Google Maps ?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Google Maps montre où vous êtes. Address-Web vous donne une adresse permanente, partageable et mémorisable — même sans internet.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: '📌', color: 'bg-indigo-50 border-indigo-200',
                title: 'Un code permanent',
                desc: 'Votre code AW-ABJ-84321 reste le même pour toujours. Partagez-le une fois, il fonctionne à vie. Impossible avec un lien Google Maps qui change.',
                example: 'Exemple : Donnez votre code à votre livreur MTN Money — il retrouve votre maison sans vous appeler.'
              },
              {
                icon: '📱', color: 'bg-green-50 border-green-200',
                title: 'Fonctionne sans connexion',
                desc: 'Une fois votre adresse créée, quiconque possède votre code peut la retrouver même avec une connexion lente ou limitée.',
                example: 'Exemple : Un livreur en zone peu couverte accède à votre adresse hors ligne.'
              },
              {
                icon: '🏪', color: 'bg-amber-50 border-amber-200',
                title: 'Pour les commerces',
                desc: 'Affichez votre code QR à l\'entrée de votre boutique. Les clients scannent et trouvent votre emplacement exact sur leur GPS.',
                example: 'Exemple : Un restaurant à Abidjan-Yopougon imprime son code AW sur ses menus.'
              },
              {
                icon: '🚚', color: 'bg-purple-50 border-purple-200',
                title: 'Idéal pour les livraisons',
                desc: 'Communiquez votre adresse AW aux services de livraison (Jumia, Glovo, livreurs indépendants) — ils naviguent directement.',
                example: 'Exemple : Commandez sur Brumerie, indiquez votre code AW — la livraison arrive directement chez vous.'
              },
              {
                icon: '👨‍👩‍👧', color: 'bg-red-50 border-red-200',
                title: 'Partagez avec votre famille',
                desc: 'Envoyez un lien WhatsApp avec votre adresse AW. Votre famille retrouve votre maison en un clic, même ceux qui ne connaissent pas Google Maps.',
                example: 'Exemple : Vos invités pour une fête reçoivent votre lien AW sur le groupe WhatsApp.'
              },
              {
                icon: '🏢', color: 'bg-teal-50 border-teal-200',
                title: 'Certifiable et officiel',
                desc: 'Quand 3 personnes confirment votre adresse, elle obtient le badge Certifié ✓ — un signal de confiance pour les entreprises et administrations.',
                example: 'Exemple : Utilisez votre adresse certifiée comme justificatif de domicile numérique.'
              },
            ].map(item => (
              <Card key={item.title} className={`p-5 border-2 ${item.color}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{item.desc}</p>
                    <p className="text-xs text-gray-500 italic bg-white/60 rounded-lg px-3 py-1.5">{item.example}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="py-16 px-4 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Comment ça marche</h2>
          <p className="text-gray-500">En 3 étapes, vous avez une adresse numérique permanente</p>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { num: '1', icon: '📍', title: 'Placez le repère', desc: 'Ouvrez la carte, zoomez sur votre maison ou commerce et placez le repère exactement au bon endroit.' },
            { num: '2', icon: '✏️', title: 'Personnalisez', desc: 'Ajoutez votre ville, un point de repère (ex: maison bleue, à côté du marché) et choisissez la catégorie.' },
            { num: '3', icon: '📲', title: 'Partagez', desc: 'Votre code AW est généré instantanément. Partagez-le par WhatsApp, SMS ou copiez le lien.' },
          ].map(step => (
            <Card key={step.num} className="p-6 text-center shadow-md">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">{step.num}</span>
              </div>
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.desc}</p>
            </Card>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/create">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 shadow-md">
              Commencer maintenant — c'est gratuit <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── CAS D'USAGE CONCRETS ── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Ils utilisent Address-Web</h2>
          <p className="text-gray-500 text-center mb-10">Des exemples concrets du quotidien en Afrique</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Truck className="w-6 h-6 text-blue-600" />, bg: 'bg-blue-50', cat: 'Livraison', desc: 'Kofi commande sur Brumerie et donne son code AW. Le livreur navigue directement — zéro appel.' },
              { icon: <Building className="w-6 h-6 text-green-600" />, bg: 'bg-green-50', cat: 'Commerce', desc: 'La pharmacie de Mme Bamba affiche son QR code. Les clients scannent et trouvent l\'adresse en 2 secondes.' },
              { icon: <Users className="w-6 h-6 text-purple-600" />, bg: 'bg-purple-50', cat: 'Famille', desc: 'Ama partage son lien AW sur le groupe famille. Tout le monde arrive à la cérémonie sans se perdre.' },
              { icon: <Star className="w-6 h-6 text-amber-600" />, bg: 'bg-amber-50', cat: 'Freelance', desc: 'Un plombier partage son adresse AW certifiée pour prouver son domicile à ses clients professionnels.' },
            ].map(item => (
              <Card key={item.cat} className={`p-5 ${item.bg} border-0`}>
                <div className="flex items-center gap-2 mb-3">
                  {item.icon}
                  <span className="font-bold text-gray-900 text-sm">{item.cat}</span>
                </div>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRUMERIE SECTION ── */}
      <section className="bg-indigo-700 py-12 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo-brumerie.png" alt="Brumerie" style={{width:40,height:40,objectFit:"contain"}} />
            <span className="text-indigo-300 font-semibold text-lg">Une initiative Brumerie</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">
            Connecté à l'écosystème Brumerie
          </h2>
          <p className="text-indigo-200 max-w-2xl mx-auto mb-6">
            Address-Web est développé par <strong className="text-white">Brumerie</strong>, la marketplace locale qui connecte acheteurs et vendeurs en Afrique. Si vous êtes déjà client Brumerie, connectez-vous en un clic avec votre compte existant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://brumerie.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-indigo-700 px-8">
                Découvrir Brumerie
              </Button>
            </a>
            <Link to="/auth">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 font-bold">
                Créer mon adresse Address-Web
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Tout ce qu'il vous faut</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Logo size={32} />, bg: 'bg-indigo-100', t: 'Localisation précise', d: 'Utilisez le GPS pour créer une adresse unique et précise au mètre près.' },
              { icon: <Share2 className="w-6 h-6 text-green-600" />, bg: 'bg-green-100', t: 'Partage facile', d: 'Partagez via WhatsApp, SMS ou un lien. Fini les explications compliquées.' },
              { icon: <Navigation className="w-6 h-6 text-orange-600" />, bg: 'bg-orange-100', t: 'Navigation GPS', d: 'Naviguez directement vers n\'importe quelle adresse via Google Maps ou Waze.' },
              { icon: <QrCode className="w-6 h-6 text-purple-600" />, bg: 'bg-purple-100', t: 'QR Code inclus', d: 'Chaque adresse génère un QR code imprimable pour votre vitrine ou porte.' },
              { icon: <ShieldCheck className="w-6 h-6 text-blue-600" />, bg: 'bg-blue-100', t: 'Adresse certifiée', d: '3 confirmations de la communauté = badge Certifié ✓. Signal de confiance.' },
              { icon: <Smartphone className="w-6 h-6 text-pink-600" />, bg: 'bg-pink-100', t: 'App installable', d: 'Installez Address-Web sur votre téléphone comme une app, fonctionne hors ligne.' },
            ].map(f => (
              <Card key={f.t} className="p-6">
                <div className={`w-12 h-12 ${f.bg} rounded-lg flex items-center justify-center mb-4`}>{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.t}</h3>
                <p className="text-gray-600 text-sm">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-16 px-4 text-center bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Prêt à créer votre adresse ?</h2>
          <p className="text-gray-500 mb-8">Gratuit, rapide et permanent. Pas de carte bancaire requise.</p>
          <Link to="/create">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 text-lg shadow-lg">
              <MapPin className="w-5 h-5 mr-2" /> Créer mon adresse maintenant
            </Button>
          </Link>
          <p className="text-xs text-gray-400 mt-4">Plus de 500 adresses déjà créées à Abidjan et dans toute la Côte d'Ivoire</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-semibold text-lg">Address-Web</span>
              <span className="text-gray-500 text-sm ml-2">par Brumerie</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400 flex-wrap justify-center">
              <Link to="/explorer" className="hover:text-white">Explorer</Link>
              <Link to="/plans" className="hover:text-white">Tarifs</Link>
              <Link to="/api" className="hover:text-white">API</Link>
              <Link to="/system-status" className="hover:text-white">Statut</Link>
              {!user && <Link to="/auth" className="hover:text-white">Connexion</Link>}
              <Link to="/politique-confidentialite" className="hover:text-white">Confidentialité</Link>
              <Link to="/conditions-utilisation" className="hover:text-white">Conditions</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-gray-500 text-xs">© 2026 Address-Web — Une solution d'adressage numérique pour l'Afrique</p>
            <p className="text-gray-600 text-xs mt-1">Développé par <a href="https://brumerie.com" className="text-gray-400 hover:text-white">Brumerie</a> — addressweb.brumerie.com</p>
          </div>
        </div>
      </footer>
    </div>

    <PageGuide storageKey="home" steps={[{"icon":"🏠","title":"Bienvenue","desc":"Donnez une adresse numérique précise à chaque lieu en Afrique."},{"icon":"🔍","title":"Rechercher","desc":"Entrez un code AW-ABJ-84321 dans la barre pour trouver un lieu."},{"icon":"➕","title":"Créer","desc":"Cliquez sur Créer mon adresse pour générer votre code unique."},{"icon":"🗺️","title":"Explorer","desc":"Utilisez Explorer pour voir toutes les adresses publiques près de vous."}]} />
    </>
  );
}
