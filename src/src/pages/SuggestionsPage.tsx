// src/pages/SuggestionsPage.tsx — Suggestions quartiers et catégories
// Les utilisateurs ajoutent des villes/quartiers et catégories manquantes
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { NEIGHBORHOODS, CATEGORIES, CITIES } from '@/types';
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

  const allNeighborhoods = [...NEIGHBORHOODS, ...CITIES, ...customNeighborhoods];
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
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">📍 Suggérer un contenu</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Aide à améliorer Brumerie</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Info */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-black text-green-800 text-[12px] mb-1">Tu ne trouves pas ton quartier ou ta catégorie ?</p>
            <p className="text-[11px] text-green-700 leading-snug">
              Ajoute-le ici. Ta suggestion sera immédiatement disponible pour toi et tous les vendeurs Brumerie.
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setTab('quartier')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${tab === 'quartier' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            📍 Quartier / Ville
          </button>
          <button onClick={() => setTab('categorie')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${tab === 'categorie' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            🏷️ Catégorie
          </button>
        </div>

        {/* ── QUARTIERS ── */}
        {tab === 'quartier' && (
          <div className="space-y-4">
            {/* Saisie */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ajouter un quartier ou une ville</p>
              <div className="flex gap-2">
                <input value={newNeighborhood}
                  onChange={e => setNewNeighborhood(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNeighborhood()}
                  placeholder="Ex: Grand-Bassam, Divo, Riviera 4..."
                  className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
                <button onClick={handleAddNeighborhood}
                  disabled={saving || !newNeighborhood.trim()}
                  className="px-4 py-3.5 rounded-xl bg-green-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-green-200 flex-shrink-0">
                  {saving ? '...' : '+ Ajouter'}
                </button>
              </div>
              {saved === 'exists' && (
                <p className="text-[10px] text-amber-600 font-bold mt-2">⚠️ Ce quartier existe déjà dans Brumerie</p>
              )}
              {saved === 'neighborhood' && (
                <p className="text-[10px] text-green-600 font-bold mt-2">✅ Quartier ajouté ! Disponible immédiatement.</p>
              )}
            </div>

            {/* Suggestions ajoutées par la communauté */}
            {customNeighborhoods.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Ajoutés par la communauté ({customNeighborhoods.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {customNeighborhoods.map(n => (
                    <span key={n} className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                      📍 {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quartiers Abidjan existants */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Déjà disponibles sur Brumerie ({NEIGHBORHOODS.length + CITIES.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {[...CITIES, ...NEIGHBORHOODS].map(n => (
                  <span key={n} className="text-[9px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full">
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
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ajouter une catégorie</p>
              <div className="flex gap-2">
                <input value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  placeholder="Ex: Pagnes, Voitures, Immobilier..."
                  className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
                <button onClick={handleAddCategory}
                  disabled={saving || !newCategory.trim()}
                  className="px-4 py-3.5 rounded-xl bg-green-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-green-200 flex-shrink-0">
                  {saving ? '...' : '+ Ajouter'}
                </button>
              </div>
              {saved === 'exists' && (
                <p className="text-[10px] text-amber-600 font-bold mt-2">⚠️ Cette catégorie existe déjà dans Brumerie</p>
              )}
              {saved === 'category' && (
                <p className="text-[10px] text-green-600 font-bold mt-2">✅ Catégorie ajoutée ! Disponible immédiatement.</p>
              )}
            </div>

            {/* Catégories ajoutées */}
            {customCategories.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Ajoutées par la communauté ({customCategories.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {customCategories.map(c => (
                    <span key={c} className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                      🏷️ {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Catégories existantes */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Déjà disponibles ({CATEGORIES.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <span key={cat.id} className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
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
