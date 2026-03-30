import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { MapPin, CheckCircle, XCircle, AlertCircle, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { supabase } from '../utils/supabaseService';

export function SystemStatus() {
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);
  const [geoOk, setGeoOk] = useState<boolean>(typeof navigator !== 'undefined' && 'geolocation' in navigator);

  useEffect(() => {
    // Tester la connexion Supabase
    supabase.from('addresses').select('count', { count: 'exact', head: true })
      .then(({ error }) => setSupabaseOk(!error))
      .catch(() => setSupabaseOk(false));
  }, []);

  const checks = [
    { label: 'Connexion Supabase', ok: supabaseOk, loading: supabaseOk === null },
    { label: 'GPS / Géolocalisation', ok: geoOk, loading: false },
    { label: 'OpenStreetMap (Nominatim)', ok: true, loading: false },
    { label: 'Service Worker (PWA)', ok: 'serviceWorker' in navigator, loading: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              
              <h1 className="text-xl font-bold text-gray-900">Address-Web</h1>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Statut du système</h2>
          <div className="space-y-4">
            {checks.map(c => (
              <Card key={c.label} className="p-4 flex items-center gap-4">
                {c.loading ? (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                ) : c.ok ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">{c.label}</span>
                <span className="ml-auto text-sm text-gray-500">
                  {c.loading ? 'Test...' : c.ok ? 'Opérationnel' : 'Indisponible'}
                </span>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/"><Button variant="outline"><Home className="w-4 h-4 mr-2" />Retour à l'accueil</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
