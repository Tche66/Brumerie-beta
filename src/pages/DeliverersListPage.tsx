import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatLastSeen } from '@/services/shopFeaturesService';

interface DelivererInfo {
  id: string;
  name: string;
  photoURL?: string;
  phone?: string;
  neighborhood?: string;
  city?: string;
  isVerified?: boolean;
  deliveryZones?: string[];
  vehicleType?: string;
  rating?: number;
  reviewCount?: number;
  completedDeliveries?: number;
  lastActiveAt?: any;
  bio?: string;
}

interface Props {
  onBack: () => void;
  onDelivererClick?: (delivererId: string) => void;
  onContact?: (delivererId: string, delivererName: string) => void;
}

export function DeliverersListPage({ onBack, onDelivererClick, onContact }: Props) {
  const [deliverers, setDeliverers] = useState<DelivererInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'nearby'>('all');

  useEffect(() => {
    loadDeliverers();
  }, []);

  async function loadDeliverers() {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'livreur'),
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DelivererInfo[];
      list.sort((a, b) => {
        const aActive = a.lastActiveAt?.seconds || 0;
        const bActive = b.lastActiveAt?.seconds || 0;
        return bActive - aActive;
      });
      setDeliverers(list);
    } catch (e) {
      console.error('[DeliverersList]', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredDeliverers = deliverers.filter(d => {
    if (filter === 'verified') return d.isVerified;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Livreurs Brumerie</h1>
            <p className="text-[10px] text-slate-400 font-bold">{filteredDeliverers.length} livreur{filteredDeliverers.length > 1 ? 's' : ''} disponible{filteredDeliverers.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {([
            { id: 'all', label: 'Tous' },
            { id: 'verified', label: 'Vérifiés' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredDeliverers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="text-4xl mb-3">🚚</div>
            <p className="text-[13px] font-black text-slate-700">Aucun livreur disponible</p>
            <p className="text-[10px] text-slate-400 mt-1">Reviens bientôt !</p>
          </div>
        ) : (
          filteredDeliverers.map(d => (
            <div key={d.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <button onClick={() => onDelivererClick?.(d.id)} className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {d.photoURL ? (
                      <img src={d.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
                          <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onDelivererClick?.(d.id)} className="font-black text-[13px] text-slate-900 truncate">
                      {d.name}
                    </button>
                    {d.isVerified && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <polyline points="9,12 11,14 15,10"/>
                      </svg>
                    )}
                  </div>

                  {/* Zones & véhicule */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {d.neighborhood && (
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
                        {d.neighborhood}
                      </span>
                    )}
                    {d.vehicleType && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {d.vehicleType === 'moto' ? '🏍️' : d.vehicleType === 'voiture' ? '🚗' : '🚶'} {d.vehicleType}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2">
                    {(d.rating ?? 0) > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                        ⭐ {d.rating?.toFixed(1)}
                        {(d.reviewCount ?? 0) > 0 && <span className="text-slate-400">({d.reviewCount})</span>}
                      </span>
                    )}
                    {(d.completedDeliveries ?? 0) > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        📦 {d.completedDeliveries} livraisons
                      </span>
                    )}
                    {d.lastActiveAt && (
                      <span className="text-[9px] font-medium text-slate-300">
                        {formatLastSeen(d.lastActiveAt)}
                      </span>
                    )}
                  </div>

                  {/* Zones de livraison */}
                  {d.deliveryZones && d.deliveryZones.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.deliveryZones.slice(0, 4).map(zone => (
                        <span key={zone} className="text-[8px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          {zone}
                        </span>
                      ))}
                      {d.deliveryZones.length > 4 && (
                        <span className="text-[8px] font-bold text-slate-400">+{d.deliveryZones.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => onDelivererClick?.(d.id)}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-[9px] font-black text-slate-700 uppercase tracking-wider active:scale-95 transition-all">
                    Profil
                  </button>
                  <button onClick={() => onContact?.(d.id, d.name)}
                    className="px-3 py-2 rounded-xl bg-green-600 text-[9px] font-black text-white uppercase tracking-wider active:scale-95 transition-all shadow-sm">
                    Contacter
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
