import { Link } from 'react-router';
import { MapPin, ArrowLeft, Shield } from 'lucide-react';

export function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" /><span>Retour</span>
            </Link>
            <div className="flex items-center gap-2">
              
              <h1 className="text-xl font-bold text-gray-900">Address-Web</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Politique de confidentialité</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Mars 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Présentation</h2>
            <p className="text-gray-600 leading-relaxed">
              Address-Web est une plateforme numérique de géolocalisation permettant à toute personne de créer, partager et retrouver des adresses numériques précises. Le présent document décrit la manière dont Address-Web collecte, utilise et protège vos données personnelles, conformément à la législation ivoirienne sur la protection des données personnelles et aux recommandations de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Données collectées</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Address-Web collecte uniquement les données nécessaires au fonctionnement du service :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Coordonnées GPS</strong> (latitude et longitude) — fournies volontairement par l'utilisateur lors de la création d'une adresse.</li>
              <li><strong>Point de repère</strong> — texte libre saisi par l'utilisateur pour décrire le lieu.</li>
              <li><strong>Nom de la ville et du quartier</strong> — détectés automatiquement via OpenStreetMap (Nominatim) ou saisis manuellement.</li>
              <li><strong>Adresse e-mail et mot de passe</strong> — uniquement si l'utilisateur choisit de créer un compte (optionnel).</li>
              <li><strong>Données de navigation</strong> — nombre de consultations d'une adresse (compteur anonyme).</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Address-Web ne collecte pas de nom, prénom, numéro de téléphone, adresse postale ni aucune donnée sensible sans consentement explicite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Consentement</h2>
            <p className="text-gray-600 leading-relaxed">
              La création d'une adresse est entièrement volontaire. En plaçant un repère sur la carte et en cliquant sur "Créer mon adresse", l'utilisateur consent explicitement à la publication de la localisation choisie. L'utilisateur peut à tout moment supprimer son adresse depuis son espace personnel ou en contactant l'équipe Address-Web.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Visibilité des adresses</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Par défaut, une adresse créée est publique : toute personne disposant du lien peut la consulter. L'utilisateur peut choisir de :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Garder son adresse publique (accessible via le lien).</li>
              <li>La rendre privée (visible uniquement par lui-même après connexion).</li>
              <li>La supprimer définitivement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Utilisation des données</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Les données collectées sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Générer et afficher la page de l'adresse numérique.</li>
              <li>Permettre la navigation GPS vers le lieu.</li>
              <li>Permettre le partage du lien.</li>
              <li>Améliorer le service (statistiques anonymes d'utilisation).</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Address-Web ne vend, ne loue et ne cède aucune donnée personnelle à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Services tiers</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Address-Web utilise les services tiers suivants :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>OpenStreetMap / Nominatim</strong> — cartographie et géocodage. Données sous licence ODbL. Aucune donnée personnelle n'est transmise au-delà des coordonnées GPS pour la détection de ville.</li>
              <li><strong>Supabase</strong> — stockage sécurisé des adresses. Données hébergées sur des serveurs sécurisés en Europe (RGPD compatible).</li>
              <li><strong>Google Maps / Waze / Apple Maps</strong> — navigation GPS externe. Ces services s'ouvrent uniquement à la demande explicite de l'utilisateur.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Sécurité des données</h2>
            <p className="text-gray-600 leading-relaxed">
              Address-Web applique les mesures de sécurité suivantes : connexion HTTPS obligatoire, base de données protégée avec Row Level Security (RLS), accès aux données restreint par utilisateur, mots de passe chiffrés (jamais stockés en clair). Malgré ces précautions, aucun système n'est infaillible. Address-Web ne peut garantir une sécurité absolue contre toute intrusion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Droits des utilisateurs</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Conformément à la réglementation en vigueur, tout utilisateur dispose des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Droit d'accès</strong> — consulter les données le concernant.</li>
              <li><strong>Droit de rectification</strong> — corriger ses informations.</li>
              <li><strong>Droit de suppression</strong> — supprimer son adresse et son compte.</li>
              <li><strong>Droit d'opposition</strong> — s'opposer à certains traitements.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@addressweb.brumerie.com" className="text-indigo-600 hover:underline">contact@addressweb.brumerie.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Address-Web utilise uniquement des cookies fonctionnels nécessaires au bon fonctionnement du service (session utilisateur, préférences). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question relative à la protection de vos données : <a href="mailto:contact@addressweb.brumerie.com" className="text-indigo-600 hover:underline">contact@addressweb.brumerie.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
          <Link to="/conditions-utilisation" className="text-indigo-600 hover:underline text-sm">
            Conditions d'utilisation →
          </Link>
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
