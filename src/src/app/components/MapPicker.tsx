import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Locate, Crosshair } from 'lucide-react';

// Fix icônes Leaflet (CDN)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: [number, number];
}

export function MapPicker({ onLocationSelect, initialPosition }: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const onSelectRef = useRef(onLocationSelect);
  onSelectRef.current = onLocationSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = initialPosition || [5.3600, -4.0083];
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Forcer le recalcul de la taille après le rendu
    setTimeout(() => map.invalidateSize(), 200);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker([lat, lng]).addTo(map);
      onSelectRef.current(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleLocateMe = () => {
    if (!mapRef.current || isLocating) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([lat, lng]).addTo(mapRef.current!);
        mapRef.current!.flyTo([lat, lng], 17);
        onSelectRef.current(lat, lng);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert("Impossible d'obtenir votre position. Cliquez sur la carte.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      {/* Conteneur carte avec hauteur explicite */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />

      {/* Bouton GPS */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          style={{
            width: 40, height: 40, borderRadius: 8,
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isLocating ? 'wait' : 'pointer',
          }}
          title="Me localiser"
        >
          {isLocating
            ? <div style={{ width: 18, height: 18, border: '2px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Locate size={18} color="#4f46e5" />
          }
        </button>
      </div>

      {/* Tooltip instruction */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'rgba(255,255,255,0.95)',
        padding: '8px 16px', borderRadius: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap',
      }}>
        <Crosshair size={14} color="#4f46e5" />
        Appuyez sur la carte pour placer votre adresse
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
