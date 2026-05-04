import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useState, useRef } from 'react';
import { Link } from 'react-router';
import { MapPin, Upload, Download, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { saveAddress, generateAddressCode } from '../utils/supabaseService';
import { getCityFromCoordinates } from '../utils/geocodingService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface CsvRow {
  latitude: string;
  longitude: string;
  repere?: string;
  ville?: string;
  quartier?: string;
  categorie?: string;
}

interface ImportResult {
  row: number;
  status: 'success' | 'error';
  addressCode?: string;
  error?: string;
  repere?: string;
}

const CSV_EXAMPLE = `latitude,longitude,repere,ville,quartier,categorie
5.360012,-4.008456,Maison bleue portail noir,Abidjan,Cocody,maison
5.345678,-3.998765,Boutique Orange Money,Abidjan,Plateau,commerce
5.378901,-4.021234,Restaurant Le Palmier 2ème étage,Abidjan,Yopougon,restaurant`;

export function ImportCsvPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');

  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj as CsvRow;
    }).filter(r => r.latitude && r.longitude);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Fichier CSV requis (.csv)'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Fichier trop grand (max 2 MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsv(ev.target?.result as string);
      if (parsed.length === 0) { toast.error('Aucune ligne valide trouvée'); return; }
      if (parsed.length > 500) { toast.error('Maximum 500 adresses par import'); return; }
      setRows(parsed);
      setStep('preview');
      toast.success(`${parsed.length} adresses détectées`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    if (!user) { toast.error('Connexion requise'); return; }
    setImporting(true);
    setResults([]);
    const newResults: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress(Math.round(((i + 1) / rows.length) * 100));
      try {
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);
        if (isNaN(lat) || isNaN(lng)) throw new Error('Coordonnées invalides');

        // Auto-détecter ville si pas fournie
        let ville = row.ville?.trim();
        let quartier = row.quartier?.trim();
        if (!ville) {
          try {
            const geo = await getCityFromCoordinates(lat, lng);
            ville = geo.ville;
            if (!quartier) quartier = geo.quartier;
          } catch { ville = 'Afrique'; }
        }

        const addressCode = generateAddressCode(ville.substring(0, 3));
        const address = await saveAddress({
          addressCode,
          latitude: lat,
          longitude: lng,
          repere: row.repere || 'Importé via CSV',
          ville,
          quartier: quartier || undefined,
          isPublic: true,
        });

        newResults.push({ row: i + 1, status: 'success', addressCode: address.addressCode, repere: row.repere });
      } catch (err: any) {
        newResults.push({ row: i + 1, status: 'error', error: err.message, repere: row.repere });
      }

      // Petite pause pour ne pas surcharger Supabase
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    setResults(newResults);
    setImporting(false);
    setStep('done');
    const success = newResults.filter(r => r.status === 'success').length;
    toast.success(`Import terminé : ${success}/${rows.length} adresses créées`);
  };

  const downloadExample = () => {
    const blob = new Blob([CSV_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'exemple-import-addressweb.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/profil" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" /><span>Retour</span>
            </Link>
            <div className="flex items-center gap-2">
              
              <Logo size={32} /><h1 className="text-xl font-bold text-gray-900">Import en masse</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Étape upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-2">Importer des adresses via CSV</h2>
              <p className="text-gray-500 text-sm mb-5">
                Importez jusqu'à 500 adresses d'un coup. La ville est détectée automatiquement si non fournie.
              </p>

              {/* Colonnes attendues */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Colonnes CSV</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { col: 'latitude', req: true },
                    { col: 'longitude', req: true },
                    { col: 'repere', req: false },
                    { col: 'ville', req: false },
                    { col: 'quartier', req: false },
                    { col: 'categorie', req: false },
                  ].map(c => (
                    <span key={c.col} className={`text-xs px-2 py-1 rounded font-mono ${c.req ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                      {c.col}{c.req ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">* Obligatoire</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={downloadExample}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />Télécharger le modèle CSV
                </Button>
                <Button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />Importer un fichier CSV
                </Button>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </Card>
          </div>
        )}

        {/* Prévisualisation */}
        {step === 'preview' && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">{rows.length} adresses à importer</h2>
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  Changer le fichier
                </Button>
              </div>

              {/* Aperçu des 5 premières */}
              <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {rows.slice(0, 5).map((row, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-400">#{i + 1}</span>
                      <span className="font-medium text-gray-700">{row.ville || 'Auto-détecté'}</span>
                      {row.quartier && <span className="text-gray-500">· {row.quartier}</span>}
                    </div>
                    <p className="text-gray-600 text-xs">{row.repere || 'Pas de repère'}</p>
                    <p className="text-gray-400 text-xs font-mono">{row.latitude}, {row.longitude}</p>
                  </div>
                ))}
                {rows.length > 5 && (
                  <p className="text-center text-sm text-gray-400">... et {rows.length - 5} autres adresses</p>
                )}
              </div>

              {importing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Import en cours...</span>
                    <span className="font-medium text-indigo-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full"
                size="lg"
              >
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Import en cours ({progress}%)...</>
                  : <><Upload className="w-4 h-4 mr-2" />Lancer l'import ({rows.length} adresses)</>
                }
              </Button>
            </Card>
          </div>
        )}

        {/* Résultats */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center bg-green-50 border-green-200">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{successCount}</p>
                <p className="text-sm text-green-600">Importées</p>
              </Card>
              <Card className="p-4 text-center bg-red-50 border-red-200">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-sm text-red-500">Erreurs</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Détail des résultats</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg text-sm ${r.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {r.status === 'success'
                      ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 text-xs">Ligne {r.row} — {r.repere || '—'}</p>
                      {r.status === 'success'
                        ? <Link to={`/${r.addressCode}`} className="text-indigo-600 font-mono text-xs hover:underline">{r.addressCode}</Link>
                        : <p className="text-red-600 text-xs">{r.error}</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setResults([]); }} className="flex-1">
                Nouvel import
              </Button>
              <Link to="/profil" className="flex-1">
                <Button className="w-full">Voir mes adresses</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
      <PageGuide storageKey="import" steps={[{"icon": "📋", "title": "Import en masse", "desc": "Importez jusqu'à 500 adresses depuis un fichier CSV."}, {"icon": "📥", "title": "Télécharger le modèle", "desc": "Téléchargez notre modèle CSV avec les colonnes requises."}, {"icon": "📤", "title": "Uploader", "desc": "Sélectionnez votre CSV. Latitude et longitude sont obligatoires."}, {"icon": "✅", "title": "Résultats", "desc": "Un rapport s'affiche avec les adresses créées et les erreurs."}]} />
    </>
  );
}
