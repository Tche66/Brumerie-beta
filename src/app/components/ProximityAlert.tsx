import { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, AlertTriangle, CheckCircle, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import type { NearbyAddress } from '../utils/proximityCheck';

interface ProximityAlertProps {
  nearby: NearbyAddress[];
  currentUserId?: string;
  onClaim: (address: NearbyAddress) => void;   // S'approprier une adresse existante
  onCreateNew: () => void;                      // Créer quand même une nouvelle
  onCancel: () => void;
}

export function ProximityAlert({
  nearby, currentUserId, onClaim, onCreateNew, onCancel
}: ProximityAlertProps) {

  const [selected, setSelected] = useState<NearbyAddress | null>(null);
  const myAddress = nearby.find(a => a.user_id === currentUserId);
  const othersAddresses = nearby.filter(a => a.user_id !== currentUserId);

  const categLabel = (c: string | null) => {
    const map: Record<string,string> = {
      maison:'🏠 Maison', commerce:'🏪 Commerce', bureau:'🏢 Bureau',
      restaurant:'🍽️ Restaurant', pharmacie:'💊 Pharmacie',
      supermarche:'🛒 Supermarché', evenement:'🎉 Événement', autre:'📍 Autre',
    };
    return c ? (map[c] || c) : '📍 Lieu';
  };

  const distLabel = (m: number) =>
    m === 0 ? 'Même emplacement exact' : `${m} m de votre point`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-amber-500 px-5 py-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-white flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-base">
                {nearby.length === 1 ? '1 adresse' : `${nearby.length} adresses`} déjà présente{nearby.length > 1 ? 's' : ''} ici
              </p>
              <p className="text-amber-100 text-xs mt-0.5">
                Dans un rayon de 5 mètres autour de votre point
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/80 hover:text-white mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Si l'utilisateur a déjà une adresse ici */}
          {myAddress && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-indigo-700 font-semibold text-sm mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Vous avez déjà une adresse ici
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-indigo-900 font-mono text-sm">{myAddress.address_code}</p>
                  <p className="text-indigo-600 text-xs mt-0.5">{distLabel(myAddress.distanceMeters)}</p>
                  {myAddress.repere && <p className="text-gray-600 text-xs mt-1">{myAddress.repere}</p>}
                </div>
                <Link to={`/${myAddress.address_code}`}>
                  <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300 text-xs">
                    Voir →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Adresses des autres */}
          {othersAddresses.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {myAddress ? 'Autres adresses à proximité :' : 'Adresses existantes à cet emplacement :'}
              </p>
              <div className="space-y-2">
                {othersAddresses.map(addr => (
                  <button
                    key={addr.id}
                    onClick={() => setSelected(selected?.id === addr.id ? null : addr)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                      selected?.id === addr.id
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs">{categLabel(addr.categorie)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            addr.distanceMeters === 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {distLabel(addr.distanceMeters)}
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 font-mono text-sm">{addr.address_code}</p>
                        {addr.repere && (
                          <p className="text-gray-500 text-xs mt-0.5 truncate">{addr.repere}</p>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${selected?.id === addr.id ? 'rotate-90 text-indigo-600' : 'text-gray-400'}`} />
                    </div>

                    {/* Options quand sélectionné */}
                    {selected?.id === addr.id && (
                      <div className="mt-3 pt-3 border-t border-indigo-200 space-y-2">
                        <p className="text-xs text-gray-600 mb-2">Que voulez-vous faire avec cette adresse ?</p>
                        <Button
                          size="sm"
                          className="w-full text-xs bg-indigo-600 hover:bg-indigo-700"
                          onClick={(e) => { e.stopPropagation(); onClaim(addr); }}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Revendiquer / S'approprier cette adresse
                        </Button>
                        <Link to={`/${addr.address_code}`} onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            <MapPin className="w-3.5 h-3.5 mr-1" />
                            Consulter l'adresse existante
                          </Button>
                        </Link>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Créer quand même */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3">
              Vous pouvez aussi créer une nouvelle adresse distincte pour cet emplacement (ex : appartement dans le même immeuble, bureau dans le même bâtiment).
            </p>
            <Button
              variant="outline"
              className="w-full text-sm border-gray-300"
              onClick={onCreateNew}
            >
              Créer quand même une nouvelle adresse
            </Button>
          </div>

        </div>
      </Card>
    </div>
  );
}
