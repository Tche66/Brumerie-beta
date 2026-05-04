import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { getMapAddresses, searchAddresses, type Address } from '../utils/supabaseService';
import { toast } from 'sonner';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CATEGORIES = [
  { value: 'tous', label: 'Tous', color: '#6366f1' },
  { value: 'maison', label: '🏠 Maison', color: '#10b981' },
  { value: 'commerce', label: '🏪 Commerce', color: '#f59e0b' },
  { value: 'bureau', label: '🏢 Bureau', color: '#3b82f6' },
  { value: 'restaurant', label: '🍽️ Restaurant', color: '#ef4444' },
  { value: 'autre', label: '📍 Autre', color: '#8b5cf6' },
];

function createPinIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

export function ExplorePage() {
  const mapRef = useRef<L.Map | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [filteredCat, setFilteredCat] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Address[] | null>(null);
  const [selectedAddr, setSelectedAddr] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Init carte
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current).setView([5.36, -4.008], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    // Charger les adresses
    getMapAddresses().then(addrs => {
      setAddresses(addrs);
      setLoading(false);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Mettre à jour les marqueurs quand filtres changent
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Supprimer anciens marqueurs
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const toShow = (searchResults ?? addresses).filter(
      addr => filteredCat === 'tous' || addr.categorie === filteredCat
    );

    toShow.forEach(addr => {
      const cat = CATEGORIES.find(c => c.value === (addr.categorie || 'autre')) || CATEGORIES[CATEGORIES.length - 1];
      const marker = L.marker([addr.latitude, addr.longitude], { icon: createPinIcon(cat.color) })
        .addTo(map)
        .on('click', () => setSelectedAddr(addr));
      marker.bindTooltip(`<strong>${addr.addressCode}</strong><br/>${addr.repere}`, { direction: 'top' });
      markersRef.current.push(marker);
    });
  }, [addresses, filteredCat, searchResults]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const results = await searchAddresses(searchQuery);
    setSearchResults(results);
    if (results.length === 0) toast.info('Aucune adresse trouvée');
    else if (results.length === 1 && mapRef.current) {
      mapRef.current.flyTo([results[0].latitude, results[0].longitude], 16);
    }
  };

  return (
    <>
    <div className="flex flex-col bg-gray-50" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      {/* Header compact */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            
            <Logo size={28} /><span className="font-bold text-gray-900">Explorer</span>
          </Link>
          <span className="text-xs text-gray-400">{(searchResults ?? addresses).length} adresses publiques</span>
        </div>
      </header>

      {/* Barre de recherche + filtres */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher une ville, un repère, un code AW..."
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} size="sm" className="px-4">Chercher</Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="px-3">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setFilteredCat(cat.value)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  filteredCat === cat.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carte — prend tout l'espace restant */}
      <div className="relative min-h-0" style={{ flex: "1 1 0", maxHeight: "55vh" }}>
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
        <div ref={mapEl} className="w-full h-full z-0" />

        {/* Fiche adresse sélectionnée */}
        {selectedAddr && (
          <div className="absolute left-4 right-4 z-20" style={{ bottom: '80px' }}>
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-indigo-600">{selectedAddr.addressCode}</p>
                  <p className="text-gray-700 font-medium text-sm mt-0.5">{selectedAddr.ville}{selectedAddr.quartier ? ` · ${selectedAddr.quartier}` : ''}</p>
                  <p className="text-gray-500 text-xs mt-1 truncate">{selectedAddr.repere}</p>
                </div>
                <button onClick={() => setSelectedAddr(null)} className="ml-3 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {selectedAddr.photos && selectedAddr.photos.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {selectedAddr.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Link to={`/${selectedAddr.addressCode}`} className="flex-1">
                  <Button size="sm" className="w-full text-xs">Voir l'adresse</Button>
                </Link>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                  window.open(`https://www.google.com/maps?q=${selectedAddr.latitude},${selectedAddr.longitude}`, '_blank');
                }}>
                  Naviguer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      <PageGuide storageKey="explore" steps={[{"icon": "🗺️", "title": "Carte des adresses", "desc": "Cette carte affiche toutes les adresses publiques Address-Web."}, {"icon": "🔍", "title": "Rechercher", "desc": "Trouvez par ville, repère ou code AW dans la barre de recherche."}, {"icon": "📌", "title": "Cliquer un pin", "desc": "Cliquez sur un marqueur pour voir les détails et naviguer."}]} />
    </>
  );
}
