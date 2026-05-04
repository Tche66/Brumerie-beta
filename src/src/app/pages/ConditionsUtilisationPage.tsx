import { Link } from 'react-router';
import { MapPin, ArrowLeft, FileText } from 'lucide-react';

export function ConditionsUtilisationPage() {
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
          <FileText className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Conditions d'utilisation</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Mars 2026</p>

        <div className="space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptation des conditions</h2>
            <p className="text-gray-600 leading-relaxed">
              En utilisant Address-Web (ci-après "le Service"), vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service. Address-Web se réserve le droit de modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication sur cette page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description du service</h2>
            <p className="text-gray-600 leading-relaxed">
              Address-Web est une plateforme numérique permettant à ses utilisateurs de créer des adresses numériques géolocalisées, de les partager et d'y accéder via un lien unique. Le Service est accessible sans création de compte obligatoire pour les fonctionnalités de base.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Utilisation autorisée</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Vous vous engagez à utiliser Address-Web uniquement à des fins légales et conformément aux présentes conditions. Il est notamment interdit de :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Créer des adresses portant atteinte à la vie privée d'autrui sans son consentement.</li>
              <li>Publier des informations fausses, trompeuses ou malveillantes dans les champs de repère.</li>
              <li>Utiliser le Service à des fins d'espionnage, surveillance ou harcèlement.</li>
              <li>Tenter de pirater, surcharger ou perturber les serveurs d'Address-Web.</li>
              <li>Utiliser des robots ou scripts automatisés pour créer des adresses en masse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Propriété du contenu</h2>
            <p className="text-gray-600 leading-relaxed">
              Les adresses créées par les utilisateurs leur appartiennent. En créant une adresse publique, l'utilisateur accorde à Address-Web une licence non-exclusive, gratuite et mondiale pour afficher cette adresse dans le cadre du Service. Address-Web ne revendique aucun droit de propriété sur le contenu créé par les utilisateurs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Responsabilité et exactitude</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Address-Web est une plateforme d'hébergement d'adresses créées par ses utilisateurs. À ce titre :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Address-Web n'est pas responsable de l'exactitude des adresses créées par les utilisateurs.</li>
              <li>La précision de la localisation GPS dépend du dispositif de l'utilisateur et des conditions réseau.</li>
              <li>Address-Web n'est pas responsable des erreurs de navigation résultant d'adresses imprécises.</li>
              <li>Les informations de repère sont fournies à titre indicatif uniquement.</li>
              <li>Address-Web ne garantit pas la disponibilité permanente et ininterrompue du Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Licences des données cartographiques</h2>
            <p className="text-gray-600 leading-relaxed">
              Les données cartographiques affichées sur Address-Web proviennent d'OpenStreetMap, sous licence Open Database License (ODbL). Les données cartographiques appartiennent aux contributeurs d'OpenStreetMap. Conformément à cette licence, la source est mentionnée sur toutes les cartes affichées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Suspension et suppression</h2>
            <p className="text-gray-600 leading-relaxed">
              Address-Web se réserve le droit de supprimer toute adresse ou de suspendre tout compte qui violerait les présentes conditions d'utilisation, sans préavis ni justification. Les utilisateurs peuvent demander la suppression de leurs données à tout moment en contactant l'équipe via <a href="mailto:contact@addressweb.brumerie.com" className="text-indigo-600 hover:underline">contact@addressweb.brumerie.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation de responsabilité</h2>
            <p className="text-gray-600 leading-relaxed">
              Dans les limites autorisées par la loi applicable, Address-Web ne saurait être tenu responsable des dommages directs, indirects, accessoires ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser le Service, y compris les pertes de données, erreurs de livraison ou préjudices commerciaux.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Droit applicable</h2>
            <p className="text-gray-600 leading-relaxed">
              Les présentes conditions d'utilisation sont régies par le droit ivoirien. Tout litige relatif à l'interprétation ou à l'exécution des présentes conditions sera soumis aux tribunaux compétents d'Abidjan, Côte d'Ivoire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question : <a href="mailto:contact@addressweb.brumerie.com" className="text-indigo-600 hover:underline">contact@addressweb.brumerie.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
          <Link to="/politique-confidentialite" className="text-indigo-600 hover:underline text-sm">
            Politique de confidentialité →
          </Link>
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
