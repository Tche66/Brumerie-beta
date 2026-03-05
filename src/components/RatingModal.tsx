// src/components/RatingModal.tsx — Sprint 7
import React, { useState } from 'react';
import { submitReview } from '@/services/reviewService';
import { RatingRole } from '@/types';

interface RatingModalProps {
  orderId: string; productId: string; productTitle: string; productImage: string;
  fromUserId: string; fromUserName: string; fromUserPhoto?: string;
  toUserId: string; toUserName: string;
  role: RatingRole;
  onDone: () => void; onSkip: () => void;
}

export function RatingModal({ orderId, productId, productTitle, productImage,
  fromUserId, fromUserName, fromUserPhoto, toUserId, toUserName, role, onDone, onSkip }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isBuyerRating = role === 'buyer_to_seller';
  const quickLabels = isBuyerRating
    ? ['Super vendeur !', 'Produit conforme', 'Livraison rapide', 'Très sérieux', 'Je recommande']
    : ['Acheteur sérieux', 'Paiement rapide', 'Très sympa', 'Communication claire', 'Parfait'];

  const stars = [1,2,3,4,5];
  const active = hover || rating;
  const labels = ['', '😕 Mauvais', '😐 Passable', '🙂 Bien', '😊 Très bien', '🤩 Excellent !'];

  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { setError('Choisis au moins 1 étoile'); return; }
    setLoading(true); setError('');
    try {
      await submitReview({ orderId, productId, productTitle, fromUserId, fromUserName,
        fromUserPhoto, toUserId, role, rating, comment: comment.trim() });
      setSuccess(true);
      setTimeout(() => onDone(), 1800);
    } catch (e: any) {
      // Si déjà noté → fermer proprement
      if ((e.message || '').includes('déjà noté')) {
        onDone();
      } else {
        setError(e.message || 'Erreur, réessaie.');
      }
    }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-2xl">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#FBBF24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p className="font-black text-slate-900 text-lg uppercase">Avis publié ! ⭐</p>
        <p className="text-slate-400 text-[11px] mt-2 font-bold">Merci pour ton retour.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="px-7 pt-6 pb-7 space-y-5">
          <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto"/>

          {/* Produit + destinataire */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
              <img src={productImage} alt="" className="w-full h-full object-cover"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {isBuyerRating ? '⭐ Notez le vendeur' : "⭐ Notez l'acheteur"}
              </p>
              <p className="font-black text-slate-900 text-[15px] truncate">{toUserName}</p>
              <p className="text-[10px] text-slate-400 truncate">{productTitle}</p>
            </div>
          </div>

          {/* Étoiles */}
          <div className="flex justify-center gap-2">
            {stars.map(s => (
              <button key={s} onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                className="transition-transform active:scale-90 hover:scale-110">
                <svg width="44" height="44" viewBox="0 0 24 24"
                  fill={s <= active ? '#FBBF24' : 'none'}
                  stroke={s <= active ? '#FBBF24' : '#E2E8F0'}
                  strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
            ))}
          </div>
          {active > 0 && (
            <p className="text-center font-black text-slate-800 text-sm -mt-2">{labels[active]}</p>
          )}

          {/* Raccourcis commentaires */}
          <div className="flex flex-wrap gap-2">
            {quickLabels.map(q => (
              <button key={q} onClick={() => setComment(c => c === q ? '' : q)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 ${
                  comment === q ? 'bg-green-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-100'
                }`}>
                {q}
              </button>
            ))}
          </div>

          {/* Commentaire libre */}
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Ajouter un commentaire (optionnel)..." rows={2}
            className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-[12px] border-2 border-transparent focus:border-green-400 outline-none resize-none"/>

          {error && <p className="text-red-500 text-[10px] font-bold text-center">{error}</p>}

          <div className="flex flex-col gap-2">
            <button onClick={handleSubmit} disabled={rating === 0 || loading}
              className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)', boxShadow: '0 10px 30px rgba(22,163,74,0.3)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Publier mon avis ⭐'}
            </button>
            <button onClick={onSkip} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              Passer cette étape
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
