import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  MapPin, Navigation, Package, CheckCircle, Clock,
  XCircle, Truck, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  getDeliveriesByLivreur, updateDeliveryStatus,
  getCurrentUser, getGoogleMapsLink, type Delivery,
} from '../utils/supabaseService';

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Truck },
  livre: { label: 'Livré', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  echec: { label: 'Échec', color: 'bg-red-100 text-red-800', icon: XCircle },
  annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-800', icon: XCircle },
} as const;

export function LivreurDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'tous' | 'en_attente' | 'en_cours' | 'livre'>('tous');

  const loadDeliveries = async () => {
    const user = await getCurrentUser();
    if (!user) { setLoading(false); return; }
    const data = await getDeliveriesByLivreur(user.id);
    setDeliveries(data);
    setLoading(false);
  };

  useEffect(() => { loadDeliveries(); }, []);

  const handleUpdateStatus = async (deliveryId: string, newStatut: Delivery['statut']) => {
    setUpdating(deliveryId);
    const ok = await updateDeliveryStatus(deliveryId, newStatut);
    if (ok) {
      toast.success(`Statut mis à jour : ${STATUT_CONFIG[newStatut].label}`);
      await loadDeliveries();
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
    setUpdating(null);
  };

  const filtered = filter === 'tous' ? deliveries : deliveries.filter(d => d.statut === filter);
  const stats = {
    total: deliveries.length,
    en_attente: deliveries.filter(d => d.statut === 'en_attente').length,
    en_cours: deliveries.filter(d => d.statut === 'en_cours').length,
    livre: deliveries.filter(d => d.statut === 'livre').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              
              <h1 className="text-xl font-bold text-gray-900">Address-Web</h1>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600 font-medium">Tableau de bord livreur</span>
            </Link>
            <Button variant="outline" size="sm" onClick={loadDeliveries}>
              <RefreshCw className="w-4 h-4 mr-2" />Actualiser
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'En attente', value: stats.en_attente, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'En cours', value: stats.en_cours, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Livrés', value: stats.livre, color: 'text-green-700', bg: 'bg-green-50' },
          ].map(s => (
            <Card key={s.label} className={`p-4 text-center ${s.bg}`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['tous', 'en_attente', 'en_cours', 'livre'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'tous' ? 'Toutes' : STATUT_CONFIG[f as keyof typeof STATUT_CONFIG]?.label}
            </Button>
          ))}
        </div>

        {/* Liste des livraisons */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Chargement des livraisons...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucune livraison {filter !== 'tous' ? 'avec ce statut' : ''}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(delivery => {
              const config = STATUT_CONFIG[delivery.statut];
              const Icon = config.icon;
              const isExpanded = expandedId === delivery.id;
              const addr = delivery.address;

              return (
                <Card key={delivery.id} className="overflow-hidden">
                  {/* En-tête livraison */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-indigo-600">{addr?.addressCode || delivery.addressId}</p>
                        <p className="text-sm text-gray-500">{addr?.ville || '—'}{addr?.quartier ? ` · ${addr.quartier}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <Icon className="w-3 h-3" />{config.label}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Détails expandés */}
                  {isExpanded && addr && (
                    <div className="border-t bg-gray-50 p-4 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Point de repère</p>
                          <p className="font-medium">{addr.repere}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Coordonnées</p>
                          <p className="font-mono">{addr.latitude.toFixed(5)}, {addr.longitude.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tentatives</p>
                          <p className="font-medium">{delivery.tentatives}</p>
                        </div>
                        {delivery.notes && (
                          <div>
                            <p className="text-gray-500">Notes</p>
                            <p className="font-medium">{delivery.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(getGoogleMapsLink(addr.latitude, addr.longitude), '_blank')}
                        >
                          <Navigation className="w-4 h-4 mr-1" />Naviguer
                        </Button>

                        {delivery.statut === 'en_attente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            disabled={updating === delivery.id}
                            onClick={() => handleUpdateStatus(delivery.id, 'en_cours')}
                          >
                            <Truck className="w-4 h-4 mr-1" />Démarrer
                          </Button>
                        )}

                        {delivery.statut === 'en_cours' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              disabled={updating === delivery.id}
                              onClick={() => handleUpdateStatus(delivery.id, 'livre')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />Livré
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              disabled={updating === delivery.id}
                              onClick={() => handleUpdateStatus(delivery.id, 'echec')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />Échec
                            </Button>
                          </>
                        )}

                        {(delivery.statut === 'echec') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating === delivery.id}
                            onClick={() => handleUpdateStatus(delivery.id, 'en_attente')}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />Réessayer
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
