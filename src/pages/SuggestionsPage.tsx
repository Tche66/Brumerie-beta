// src/pages/SuggestionsPage.tsx — Suggestions quartiers et catégories
// Les utilisateurs ajoutent des villes/quartiers et catégories manquantes
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { NEIGHBORHOODS, CATEGORIES, CITIES, CITY_NEIGHBORHOODS } from '@/types';
import { subscribeAppConfig } from '@/services/appConfigService';

interface SuggestionsPageProps { onBack: () => void; }

export function SuggestionsPage({ onBack }: SuggestionsPageProps) {
  const { userProfile } = useAuth();

  const [tab, setTab]               = useState<'quartier' | 'categorie'>('quartier');
  const [customNeighborhoods, setCustomNeighborhoods] = useState<string[]>([]);
  const [customCategories, setCustomCategories]       = useState<string[]>([]);
  const [newNeighborhood, setNewNeighborhood]         = useState('');
  const [newCategory, setNewCategory]                 = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState('');

  // Charger les suggestions existantes depuis Firestore appConfig
  useEffect(() => {
    const unsub = subscribeAppConfig(cfg => {
      setCustomNeighborhoods((cfg as any).customNeighborhoods || []);
      setCustomCategories((cfg as any).customCategories || []);
    });
    return unsub;
  }, []);

  const allNeighborhoods = [...Object.values(CITY_NEIGHBORHOODS).flat(), ...customNeighborhoods];
  const allCategories    = [...CATEGORIES.map(c => c.label), ...customCategories];

  const handleAddNeighborhood = async () => {
    const val = newNeighborhood.trim();
    if (!val || allNeighborhoods.some(n => n.toLowerCase() === val.toLowerCase())) {
      setSaved('exists');
      setTimeout(() => setSaved(''), 2000);
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'appConfig', 'main'), {
        customNeighborhoods: arrayUnion(val),
      });
      setNewNeighborhood('');
      setSaved('neighborhood');
      setTimeout(() => setSaved(''), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleAddCategory = async () => {
    const val = newCategory.trim();
    if (!val || allCategories.some(c => c.toLowerCase() === val.toLowerCase())) {
      setSaved('exists');
      setTimeout(() => setSaved(''), 2000);
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'appConfig', 'main'), {
        customCategories: arrayUnion(val),
      });
      setNewCategory('');
      setSaved('category');
      setTimeout(() => setSaved(''), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={onBack} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center active:scale-95 transition-transform">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Suggestions</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Info */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-semibold text-green-800 text-[12px] mb-1">Tu ne trouves pas ton quartier ou ta catégorie ?</p>
            <p className="text-[11px] text-green-700 leading-snug">
              Ajoute-le ici. Ta suggestion sera immédiatement disponible pour toi et tous les vendeurs Brumerie.
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button onClick={() => setTab('quartier')}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${tab === 'quartier' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>
            📍 Quartier / Ville
          </button>
          <button onClick={() => setTab('categorie')}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${tab === 'categorie' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>
            🏷️ Catégorie
          </button>
        </div>

        {/* ── QUARTIERS ── */}
        {tab === 'quartier' && (
          <div className="space-y-4">
            {/* Saisie */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Ajouter un quartier ou une ville</p>
              <div className="flex gap-2">
                <input value={newNeighborhood}
                  onChange={e => setNewNeighborhood(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNeighborhood()}
                  placeholder="Ex: Grand-Bassam, Divo, Riviera 4..."
                  className="flex-1 px-4 py-3.5 rounded-lg border-2 border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[13px] outline-none focus:border-green-400 transition-all"/>
                <button onClick={handleAddNeighborhood}
                  disabled={saving || !newNeighborhood.trim()}
                  className="px-4 py-3.5 rounded-lg bg-emerald-600 text-white font-medium text-sm active:scale-95 disabled:opacity-40 transition-all flex-shrink-0">
                  {saving ? '...' : '+ Ajouter'}
                </button>
              </div>
              {saved === 'exists' && (
                <p className="text-[10px] text-amber-600 font-medium mt-2">⚠️ Ce quartier existe déjà dans Brumerie</p>
              )}
              {saved === 'neighborhood' && (
                <p className="text-[10px] text-green-600 font-medium mt-2">✅ Quartier ajouté ! Disponible immédiatement.</p>
              )}
            </div>

            {/* Suggestions ajoutées par la communauté */}
            {customNeighborhoods.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Ajoutés par la communauté ({customNeighborhoods.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {customNeighborhoods.map(n => (
                    <span key={n} className="text-[10px] font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                      📍 {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quartiers Abidjan existants */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                Déjà disponibles sur Brumerie ({Object.values(CITY_NEIGHBORHOODS).flat().length} quartiers · {CITIES.length} villes)
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {[...CITIES, ...Object.values(CITY_NEIGHBORHOODS).flat()].map(n => (
                  <span key={n} className="text-[9px] font-medium bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CATÉGORIES ── */}
        {tab === 'categorie' && (
          <div className="space-y-4">
            {/* Saisie */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Ajouter une catégorie</p>
              <div className="flex gap-2">
                <input value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  placeholder="Ex: Pagnes, Voitures, Immobilier..."
                  className="flex-1 px-4 py-3.5 rounded-lg border-2 border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-[13px] outline-none focus:border-green-400 transition-all"/>
                <button onClick={handleAddCategory}
                  disabled={saving || !newCategory.trim()}
                  className="px-4 py-3.5 rounded-lg bg-emerald-600 text-white font-medium text-sm active:scale-95 disabled:opacity-40 transition-all flex-shrink-0">
                  {saving ? '...' : '+ Ajouter'}
                </button>
              </div>
              {saved === 'exists' && (
                <p className="text-[10px] text-amber-600 font-medium mt-2">⚠️ Cette catégorie existe déjà dans Brumerie</p>
              )}
              {saved === 'category' && (
                <p className="text-[10px] text-green-600 font-medium mt-2">✅ Catégorie ajoutée ! Disponible immédiatement.</p>
              )}
            </div>

            {/* Catégories ajoutées */}
            {customCategories.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Ajoutées par la communauté ({customCategories.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {customCategories.map(c => (
                    <span key={c} className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                      🏷️ {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Catégories existantes */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                Déjà disponibles ({CATEGORIES.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <span key={cat.id} className="text-[10px] font-medium bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
                    <span>{cat.icon}</span>{cat.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
