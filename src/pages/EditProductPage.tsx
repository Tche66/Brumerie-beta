import React, { useState } from 'react';
import { Product, CATEGORIES, NEIGHBORHOODS } from '@/types';
import { updateProduct } from '@/services/productService';
import { ConditionSelector, Condition } from '@/components/ConditionBadge';

interface EditProductPageProps {
  product: Product;
  onBack: () => void;
  onSaved: () => void;
}

export function EditProductPage({ product, onBack, onSaved }: EditProductPageProps) {
  const [title, setTitle]               = useState(product.title);
  const [description, setDescription]   = useState(product.description || '');
  const [price, setPrice]               = useState(String(product.price));
  const [originalPrice, setOriginalPrice] = useState(product.originalPrice ? String(product.originalPrice) : '');
  const [category, setCategory]         = useState(product.category);
  const [neighborhood, setNeighborhood] = useState(product.neighborhood);
  const [condition, setCondition]       = useState<Condition | ''>((product.condition as Condition) || '');
  const [quantity, setQuantity]         = useState(String(product.quantity || 1));
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [hideStats, setHideStats]       = useState(product.hideStats || false);

  const discountPercent = (() => {
    const op = parseFloat(originalPrice);
    const p  = parseFloat(price);
    if (!isNaN(op) && !isNaN(p) && op > p && op > 0) return Math.round(((op - p) / op) * 100);
    return null;
  })();

  const handleSave = async () => {
    setError('');
    const priceNum = parseInt(price.replace(/\s/g, ''), 10);
    if (!title.trim())              { setError('Le titre est obligatoire.'); return; }
    if (isNaN(priceNum) || priceNum <= 0) { setError('Prix invalide.'); return; }
    const opNum = originalPrice.trim() ? parseInt(originalPrice.replace(/\s/g, ''), 10) : null;
    if (opNum !== null && opNum <= priceNum) { setError("L'ancien prix doit être supérieur au prix actuel."); return; }

    setLoading(true);
    try {
      // Construire le payload sans undefined (Firestore refuse)
      const updatePayload: Record<string, any> = {
        title:       title.trim(),
        description: description.trim(),
        price:       priceNum,
        category,
        neighborhood,
        // null = supprimer le champ, valeur = mettre à jour
        originalPrice: opNum ?? null,
      };
      if (condition)               updatePayload.condition = condition;
      else                         updatePayload.condition = null;
      if (parseInt(quantity) > 1)  updatePayload.quantity  = parseInt(quantity);
      else                         updatePayload.quantity  = null;
      updatePayload.hideStats = hideStats;
      await updateProduct(product.id, updatePayload as any);
      onSaved();
    } catch {
      setError('Erreur lors de la mise à jour. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 flex-1">Modifier l'article</h1>
        <span className="text-[9px] text-slate-400 font-bold">Photos non modifiables</span>
      </div>

      <div className="px-6 py-8 space-y-6">
        {/* Preview */}
        {(product.images || [])[0] && (
          <div className="w-full h-48 rounded-3xl overflow-hidden bg-slate-100 relative">
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="bg-black/50 text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">📷 Photos non modifiables</span>
            </div>
          </div>
        )}

        {/* Titre */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 block">Titre</label>
          <input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setTitle(e.target.value)} maxLength={80}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-bold text-slate-900 text-sm focus:outline-none focus:border-green-500 transition-colors"
            placeholder="Titre de l'article" />
        </div>

        {/* Prix */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 block">Prix actuel (FCFA)</label>
          <input value={price} onChange={(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setPrice(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-black text-slate-900 text-lg focus:outline-none focus:border-green-500 transition-colors"
            placeholder="0" />
        </div>

        {/* Ancien prix */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1 block">Ancien prix — optionnel</label>
          <input value={originalPrice} onChange={(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setOriginalPrice(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-bold text-slate-600 text-sm focus:outline-none focus:border-amber-400 transition-colors"
            placeholder="Ex: 25 000" />
          {discountPercent !== null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="bg-red-100 text-red-600 text-[10px] font-black px-3 py-1.5 rounded-xl">-{discountPercent}%</span>
              <span className="text-[10px] text-slate-400 font-bold">Affiché comme réduction</span>
            </div>
          )}
        </div>

        {/* État du produit */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 block">État du produit</label>
          <ConditionSelector value={condition} onChange={setCondition} />
        </div>

        {/* Quantité */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 block">Quantité disponible</label>
          <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4">
            <button type="button" onClick={() => setQuantity((q: string) => String(Math.max(1, parseInt(q) - 1)))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700 text-lg active:scale-90 transition-all">
              −
            </button>
            <div className="flex-1 text-center">
              <p className="font-black text-2xl text-slate-900">{quantity}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {parseInt(quantity) <= 1 ? 'Article unique' : `${quantity} en stock`}
              </p>
            </div>
            <button type="button" onClick={() => setQuantity((q: string) => String(parseInt(q) + 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-white font-black text-lg active:scale-90 transition-all">
              +
            </button>
          </div>
        </div>

        {/* Catégorie */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 block">Catégorie</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`py-3 rounded-2xl text-[10px] font-bold flex items-center gap-2 px-3 transition-all border ${
                  category === cat.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                <span>{cat.icon}</span><span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quartier */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 block">Quartier</label>
          <select value={neighborhood} onChange={(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setNeighborhood(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-bold text-slate-900 text-sm focus:outline-none focus:border-green-500 transition-colors appearance-none">
            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 block">Description</label>
          <textarea value={description} onChange={(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setDescription(e.target.value)} rows={5} maxLength={800}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-medium text-slate-700 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none"
            placeholder="Décris ton article..." />
          <p className="text-[9px] text-slate-300 font-bold text-right mt-1">{description.length}/800</p>
        </div>

        {/* Toggle masquer les compteurs */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-[13px] text-slate-900">Masquer les compteurs</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Les visiteurs ne verront pas le nombre de vues et contacts. Utile au lancement.
                </p>
              </div>
            </div>
            <button onClick={() => setHideStats(v => !v)}
              className={`w-14 h-7 rounded-full transition-all flex-shrink-0 relative ${hideStats ? 'bg-green-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${hideStats ? 'left-7' : 'left-0.5'}`}/>
            </button>
          </div>
          {hideStats && (
            <p className="text-[10px] text-green-700 font-bold mt-3 pl-13 ml-13">
              ✓ Les compteurs sont masqués sur ta fiche produit
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-[11px] font-bold text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* CTA fixe */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 p-4">
        <button onClick={handleSave} disabled={loading}
          className="w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-xl shadow-green-200 active:scale-95 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
          {loading
            ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            : <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Enregistrer les modifications
              </>
          }
        </button>
      </div>
    </div>
  );
}
