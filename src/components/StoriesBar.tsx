// src/components/StoriesBar.tsx — Barre de stories en haut de l'accueil
import React, { useState, useEffect, useRef } from 'react';
import { Story } from '@/types';
import { subscribeActiveStories, getSellerStories, markStoryViewed, publishStory, deleteStory } from '@/services/storyService';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { useAuth } from '@/contexts/AuthContext';

interface StoriesBarProps {
  onSellerClick?: (sellerId: string) => void;
  onOpenChatWithSeller?: (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => void;
  onRequestPublish?: () => void;
}

// ── Visionneuse de story ──────────────────────────────────────
function StoryViewer({
  stories, startIndex, onClose, currentUserId, onOrder, onOffer, onContact,
}: {
  stories: Story[]; startIndex: number; onClose: () => void; currentUserId?: string;
  onOrder?: (story: Story) => void;
  onOffer?: (story: Story) => void;
  onContact?: (sellerId: string, sellerName: string) => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const story = stories[idx];

  useEffect(() => {
    if (!story || !currentUserId) return;
    markStoryViewed(story.id, currentUserId);
    setProgress(0);
    setPaused(false);
    setZoomed(false);
  }, [idx, story?.id]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (!story) return;
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (idx < stories.length - 1) { setIdx(i => i + 1); }
          else onClose();
          return 0;
        }
        return p + 1;
      });
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, paused, story?.id]);

  const handlePressStart = () => {
    holdTimerRef.current = setTimeout(() => {
      setPaused(true);
      setZoomed(true);
    }, 100);
  };

  const handlePressEnd = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setPaused(false);
    setZoomed(false);
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center"
      style={{ height: '100dvh' }}
      onClick={onClose}>
      <div className="relative w-full max-w-sm h-full"
        onClick={e => e.stopPropagation()}>

        {/* Barre de progression */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3"
          style={{ opacity: zoomed ? 0 : 1, transition: 'opacity 0.2s' }}>
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/30">
              <div className="h-full bg-white transition-none rounded-full"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}/>
            </div>
          ))}
        </div>

        {/* Header vendeur */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-4"
          style={{ opacity: zoomed ? 0 : 1, transition: 'opacity 0.2s' }}>
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
            {story.sellerPhoto
              ? <img src={story.sellerPhoto} className="w-full h-full object-cover" alt=""/>
              : <div className="w-full h-full bg-green-500 flex items-center justify-center">
                  <span className="text-white font-black text-sm">{story.sellerName[0]}</span>
                </div>
            }
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-[12px]">{story.sellerName}</p>
            <p className="text-white/60 text-[10px]">
              {story.createdAt?.toDate ? new Date(story.createdAt.toDate()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-black/30 rounded-full px-2.5 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="text-white text-[10px] font-bold">{story.views?.length || 0}</span>
          </div>
          <button onClick={onClose} className="text-white text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        {/* Image — zoom au maintien */}
        <img
          src={story.imageUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{
            transform: zoomed ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.3s ease',
          }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          draggable={false}
        />

        {/* Icône pause au centre */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/40 rounded-full p-4 backdrop-blur-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            </div>
          </div>
        )}

        {/* Caption + produit */}
        {(story.caption || story.productRef) && (
          <div className="absolute bottom-0 left-0 right-0 p-5"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', opacity: zoomed ? 0 : 1, transition: 'opacity 0.2s' }}>
            {story.caption && (
              <p className="text-white font-bold text-[14px] leading-relaxed mb-3">{story.caption}</p>
            )}
            {story.productRef && (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
                <div>
                  <p className="text-white font-black text-[11px]">{story.productRef.title}</p>
                  <p className="text-green-300 font-black text-[13px]">
                    {story.productRef.price.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="text-white/60 text-[11px] font-bold">{story.views?.length || 0} vue{(story.views?.length || 0) > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {/* Navigation tapotage — désactivée pendant le maintien */}
        {!paused && (
          <div className="absolute inset-0 flex">
            <div className="flex-1" onClick={() => setIdx(i => Math.max(0, i - 1))}/>
            <div className="flex-1" onClick={() => { if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); }}/>
          </div>
        )}

        {/* Boutons action */}
        {story.sellerId !== currentUserId && (
          <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', paddingBottom: 28, opacity: zoomed ? 0 : 1, transition: 'opacity 0.2s', pointerEvents: zoomed ? 'none' : 'auto' }}>
            {story.productRef ? (
              <>
                <button
                  onClick={() => { onClose(); onOrder?.(story); }}
                  className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
                  🛍️ Commander
                </button>
                <button
                  onClick={() => { onClose(); onOffer?.(story); }}
                  className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-white/20 backdrop-blur-sm active:scale-95 transition-all border border-white/30">
                  💬 Faire une offre
                </button>
              </>
            ) : (
              <button
                onClick={() => { onClose(); onContact?.(story.sellerId, story.sellerName); }}
                className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-white/20 backdrop-blur-sm active:scale-95 transition-all border border-white/30">
                💬 Contacter le vendeur
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal publication story ───────────────────────────────────
export function PublishStoryModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const { currentUser, userProfile } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [productLink, setProductLink] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImageFile(f);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!imageFile || !currentUser || !userProfile) return;
    setLoading(true);
    setError(null);
    try {
      const imageUrl = await uploadToCloudinary(imageFile);
      const productRef = productLink.trim() && productTitle.trim()
        ? { id: productLink.trim(), title: productTitle.trim(), price: Number(productPrice) || 0 }
        : undefined;
      await publishStory({
        sellerId: currentUser.uid,
        sellerName: userProfile.name,
        sellerPhoto: userProfile.photoURL,
        imageUrl,
        caption: caption.trim() || undefined,
        productRef,
      });
      onPublished();
    } catch (e: any) {
      console.error('[StoriesBar] publish error:', e);
      setError(e?.message || 'Erreur lors de la publication. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/60"
      onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-10"
        style={{ maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"/>
        <h3 className="font-black text-[16px] text-slate-900 mb-5">📸 Publier une story</h3>

        {/* Zone image */}
        <button onClick={() => fileRef.current?.click()}
          className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 mb-4 overflow-hidden active:scale-98 transition-all"
          style={preview ? { backgroundImage: `url(${preview})`, backgroundSize: 'cover', backgroundPosition: 'center', border: 'none' } : {}}>
          {!preview && <>
            <span className="text-3xl">📷</span>
            <p className="text-slate-400 font-bold text-[12px]">Ajouter une photo</p>
          </>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>

        {/* Caption */}
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Texte promotionnel (optionnel)..."
          maxLength={120}
          rows={3}
          className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-[13px] border-2 border-transparent focus:border-green-400 outline-none resize-none mb-4"
        />
        <p className="text-[10px] text-slate-400 text-right mb-4">{caption.length}/120</p>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-3 text-red-600 text-[12px] font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        <button onClick={handlePublish} disabled={!imageFile || loading}
          className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
          {loading ? '⏳ Publication...' : '🚀 Publier (48h)'}
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export function StoriesBar({ onSellerClick, onOpenChatWithSeller, onRequestPublish }: StoriesBarProps) {
  const { currentUser, userProfile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [viewerStories, setViewerStories] = useState<Story[] | null>(null);
  const [viewerStart, setViewerStart] = useState(0);

  const isVerifiedSeller = userProfile?.role === 'seller' && userProfile?.isVerified;

  useEffect(() => {
    return subscribeActiveStories(setStories);
  }, []);

  const openStory = async (story: Story) => {
    const allStories = await getSellerStories(story.sellerId);
    setViewerStories(allStories.length > 0 ? allStories : [story]);
    setViewerStart(0);
  };

  if (stories.length === 0 && !isVerifiedSeller) return null;

  return (
    <>
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">

          {/* Bouton "Ajouter" — vendeurs vérifiés seulement */}
          {isVerifiedSeller && (
            <button onClick={() => onRequestPublish?.()}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-green-400 flex items-center justify-center bg-green-50">
                <span className="text-green-600 text-2xl font-black">+</span>
              </div>
              <p className="text-[9px] font-bold text-slate-500 text-center w-14 truncate">Ma story</p>
            </button>
          )}

          {/* Stories des vendeurs */}
          {stories.map(story => {
            const seen = story.views?.includes(currentUser?.uid || '');
            return (
              <button key={story.id} onClick={() => openStory(story)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all">
                <div className={`w-14 h-14 rounded-full p-0.5 ${seen ? 'bg-slate-200' : 'bg-gradient-to-tr from-green-400 to-emerald-600'}`}>
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                    {story.sellerPhoto
                      ? <img src={story.sellerPhoto} className="w-full h-full object-cover" alt=""/>
                      : <div className="w-full h-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-700 font-black text-lg">{story.sellerName[0]}</span>
                        </div>
                    }
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-600 text-center w-14 truncate">
                  {story.sellerName.split(' ')[0]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visionneuse */}
      {viewerStories && (
        <StoryViewer
          stories={viewerStories}
          startIndex={viewerStart}
          onClose={() => setViewerStories(null)}
          currentUserId={currentUser?.uid}
          onOrder={(story) => {
            setViewerStories(null);
            if (story.productRef) {
              onOpenChatWithSeller?.(story.sellerId, story.sellerName,
                story.productRef.id, story.productRef.title);
            }
          }}
          onOffer={(story) => {
            setViewerStories(null);
            if (story.productRef) {
              onOpenChatWithSeller?.(story.sellerId, story.sellerName,
                story.productRef.id, story.productRef.title);
            }
          }}
          onContact={(sellerId, sellerName) => {
            setViewerStories(null);
            onOpenChatWithSeller?.(sellerId, sellerName);
          }}
        />
      )}


    </>
  );
}
