// src/components/OfferModal.tsx — Modal "Faire une offre"
import React, { useState } from 'react';
import { Product } from '@/types';

interface OfferModalProps {
  product: Product;
  visible: boolean;
  onClose: () => void;
  onSend: (offerPrice: number, message: string) => Promise<void>;
}

export function OfferModal({ product, visible, onClose, onSend }: OfferModalProps) {
  const [price, setPrice]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  if (!visible) return null;

  const priceNum   = parseInt(price.replace(/\s/g, ''), 10);
  const discount   = priceNum && product.price ? Math.round(((product.price - priceNum) / product.price) * 100) : 0;
  const isValid    = priceNum > 0 && priceNum < product.price;

  const handleSend = async () => {
    if (!isValid) { setError('Propose un prix inférieur au prix demandé.'); return; }
    setSending(true); setError('');
    try {
      await onSend(priceNum, message.trim());
      setSent(true);
      setTimeout(() => { setSent(false); setPrice(''); setMessage(''); onClose(); }, 2000);
    } catch { setError('Erreur lors de l\'envoi. Réessaie.'); }
    finally { setSending(false); }
  };

  const formatPrice = (n: number) => n.toLocaleString('fr-FR');

  // Suggestions rapides : -10%, -20%, -30%
  const suggestions = [10, 20, 30].map(pct => ({
    pct,
    val: Math.round(product.price * (1 - pct/100)),
  }));

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center"
      onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"/>
      <div className="relative w-full max-w-md bg-white rounded-t-[3rem] px-6 pt-5 pb-10 shadow-2xl"
        style={{ animation: 'slideUp 0.3s ease-out' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"/>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="font-black text-[18px] text-slate-900 mb-1">Offre envoyée !</h3>
            <p className="text-slate-400 text-[13px]">Le vendeur va recevoir ta proposition.</p>
          </div>
        ) : (
          <>
            <h2 className="font-black text-[18px] text-slate-900 mb-1">💰 Faire une offre</h2>
            <p className="text-slate-400 text-[12px] mb-5">
              Prix demandé : <strong className="text-slate-700">{formatPrice(product.price)} FCFA</strong>
            </p>

            {/* Suggestions rapides */}
            <div className="flex gap-2 mb-4">
              {suggestions.map(({ pct, val }) => (
                <button key={pct} onClick={() => setPrice(String(val))}
                  className={`flex-1 py-3 rounded-2xl text-center transition-all active:scale-95 border-2 ${
                    price === String(val)
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-100 bg-slate-50'
                  }`}>
                  <p className="text-[10px] font-black text-red-500 uppercase">-{pct}%</p>
                  <p className="text-[13px] font-black text-slate-900">{formatPrice(val)}</p>
                  <p className="text-[9px] text-slate-400">FCFA</p>
                </button>
              ))}
            </div>

            {/* Saisie libre */}
            <div className="relative mb-4">
              <input
                type="number"
                placeholder="Ou saisis ton prix..."
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPrice(e.target.value); setError(''); }}
                className="w-full px-5 py-5 bg-slate-50 border-2 border-transparent rounded-2xl text-[16px] font-black focus:border-green-500 focus:bg-white outline-none transition-all pr-20"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">FCFA</span>
            </div>

            {/* Aperçu de la réduction */}
            {priceNum > 0 && priceNum < product.price && (
              <div className="bg-green-50 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-[11px] font-black text-green-700">
                    Tu proposes {discount}% de réduction
                  </p>
                  <p className="text-[10px] text-green-500">
                    Économie de {formatPrice(product.price - priceNum)} FCFA
                  </p>
                </div>
              </div>
            )}
            {priceNum >= product.price && priceNum > 0 && (
              <p className="text-red-400 text-[11px] font-bold mb-4">
                ⚠️ Le prix doit être inférieur au prix demandé.
              </p>
            )}

            {/* Message optionnel */}
            <textarea
              placeholder="Ajoute un message au vendeur (optionnel)..."
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-[13px] font-medium focus:border-green-500 focus:bg-white outline-none transition-all resize-none mb-5"
            />

            {error && <p className="text-red-400 text-[11px] font-bold mb-3">{error}</p>}

            <button
              onClick={handleSend}
              disabled={!isValid || sending}
              className={`w-full py-5 rounded-[2rem] font-black text-[13px] uppercase tracking-widest text-white transition-all active:scale-[0.98] ${
                isValid && !sending
                  ? 'opacity-100 shadow-xl'
                  : 'opacity-40'
              }`}
              style={isValid ? { background: 'linear-gradient(135deg,#115E2E,#16A34A)', boxShadow: '0 16px 32px rgba(22,163,74,0.25)' } : { background: '#94A3B8' }}>
              {sending ? 'Envoi en cours…' : `Proposer ${priceNum > 0 ? formatPrice(priceNum) + ' FCFA' : ''}`}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }`}</style>
    </div>
  );
}
