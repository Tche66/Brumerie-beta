// src/pages/ChatPage.tsx — v18 : images, liens cliquables, bouton appel
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToMessages, sendMessage, sendProductCard,
  markConversationAsRead, reportMessage,
  respondToOffer, sendSellerOfferCard, sendCounterOffer,
  sendImageMessage,
} from '@/services/messagingService';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Conversation, Message, Product } from '@/types';
import { formatPrice } from '@/utils/helpers';

interface ChatPageProps {
  conversation: Conversation;
  onBack: () => void;
  onProductClick?: (product: Product) => void;
  onBuyAtPrice?: (product: any, price: number) => void;
}

function timeLabel(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function dateSeparator(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// ── Rendu texte avec liens cliquables ──────────────────────
function TextWithLinks({ text, isMe }: { text: string; isMe: boolean }) {
  const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(URL_REGEX);
  return (
    <p className="text-[13px] leading-relaxed">
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          const href = part.startsWith('http') ? part : `https://${part}`;
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer"
              className={`underline underline-offset-2 ${isMe ? 'text-blue-100' : 'text-blue-600'}`}
              onClick={e => e.stopPropagation()}>
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function ChatPage({ conversation, onBack, onProductClick, onBuyAtPrice }: ChatPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [showProductShare, setShowProductShare] = useState(false);
  const [sellerProduct, setSellerProduct] = useState<any>(null);
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState('');
  const [sendingCustomOffer, setSendingCustomOffer] = useState(false);
  const [respondingOffer, setRespondingOffer] = useState<string | null>(null);
  const [counterOfferMsgId, setCounterOfferMsgId] = useState<string | null>(null);
  const [counterOfferInput, setCounterOfferInput] = useState('');
  const [sendingCounter, setSendingCounter] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isGroup   = !!(conversation as any).isGroup;
  const otherId   = isGroup ? '' : ((conversation.participants || []).find((p: string) => p !== currentUser?.uid) || '');
  const otherName = isGroup
    ? ((conversation as any).groupName || 'Groupe')
    : (conversation.participantNames?.[otherId] || 'Utilisateur');
  const otherPhoto = isGroup
    ? ((conversation as any).groupPhoto || undefined)
    : (conversation.participantPhotos?.[otherId]);
  const isSeller = !isGroup && currentUser?.uid === (conversation.participants || [])[1];
  const memberCount = isGroup ? (conversation.participants || []).length : 0;

  // Récupérer le téléphone de l'interlocuteur depuis Firestore
  const [otherPhone, setOtherPhone] = useState<string | null>(null);
  useEffect(() => {
    if (!otherId) return;
    getDoc(doc(db, 'users', otherId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setOtherPhone(data.phone || null);
      }
    });
  }, [otherId]);

  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [selectedSellerProduct, setSelectedSellerProduct] = useState<any>(null);
  useEffect(() => {
    if (!isSeller || !currentUser) return;
    if (conversation.productId) {
      getDoc(doc(db, 'products', conversation.productId)).then(snap => {
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() };
          setSellerProduct(p); setSelectedSellerProduct(p);
        }
      });
    } else {
      import('@/services/productService').then(({ getSellerProducts }) => {
        getSellerProducts(currentUser.uid).then(products => {
          const active = products.filter((p: any) => p.status === 'active');
          setSellerProducts(active);
          if (active.length > 0) { setSellerProduct(active[0]); setSelectedSellerProduct(active[0]); }
        });
      });
    }
  }, [conversation.productId, isSeller, currentUser?.uid]);

  useEffect(() => {
    const unsub = subscribeToMessages(conversation.id, msgs => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [conversation.id]);

  useEffect(() => {
    if (currentUser) markConversationAsRead(conversation.id, currentUser.uid);
  }, [conversation.id, currentUser]);

  const handleSend = async () => {
    if (!text.trim() || !currentUser || !userProfile || sending) return;
    setSending(true);
    const msg = text.trim(); setText('');
    try {
      await sendMessage(conversation.id, currentUser.uid, userProfile.name, msg, userProfile.photoURL);
    } catch (e) { console.error(e); setText(msg); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  // ── Envoi image ──────────────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !userProfile) return;
    setSendingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      await sendImageMessage(conversation.id, currentUser.uid, userProfile.name, imageUrl, userProfile.photoURL);
    } catch (err) { console.error('Image send error:', err); }
    finally { setSendingImage(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
  };

  const handleShareProduct = async () => {
    if (!currentUser || !userProfile || !sellerProduct) return;
    setShowProductShare(false);
    await sendProductCard(conversation.id, currentUser.uid, userProfile.name, {
      id: sellerProduct.id, title: sellerProduct.title, price: sellerProduct.price,
      image: sellerProduct.images?.[0] || '', neighborhood: sellerProduct.neighborhood,
    }, userProfile.photoURL);
  };

  const handleRespondOffer = async (msgId: string, decision: 'accepted' | 'refused') => {
    if (!currentUser || !userProfile) return;
    setRespondingOffer(msgId);
    try { await respondToOffer(conversation.id, msgId, currentUser.uid, userProfile.name, decision, userProfile.photoURL); }
    catch (e) { console.error(e); }
    finally { setRespondingOffer(null); }
  };

  const handleSendCounterOffer = async (originalMsgId: string, msg: Message) => {
    if (!currentUser || !userProfile || !counterOfferInput) return;
    const price = parseInt(counterOfferInput.replace(/\D/g, ''), 10);
    if (!price || price <= 0) return;
    setSendingCounter(true);
    try {
      await sendCounterOffer(conversation.id, originalMsgId, currentUser.uid, userProfile.name, price, msg.productRef as any, userProfile.photoURL);
      setCounterOfferMsgId(null); setCounterOfferInput('');
    } catch (e) { console.error(e); }
    finally { setSendingCounter(false); }
  };

  const handleSendCustomOffer = async () => {
    if (!currentUser || !userProfile || !sellerProduct || !customPriceInput) return;
    const price = parseInt(customPriceInput.replace(/\D/g, ''), 10);
    if (!price || price <= 0) return;
    setSendingCustomOffer(true);
    try {
      await sendSellerOfferCard(conversation.id, currentUser.uid, userProfile.name, {
        id: sellerProduct.id, title: sellerProduct.title, price: sellerProduct.price,
        image: sellerProduct.images?.[0] || '', sellerId: currentUser.uid,
        neighborhood: sellerProduct.neighborhood, sellerName: userProfile.name, sellerPhoto: userProfile.photoURL,
      }, price, userProfile.photoURL);
      setShowCustomPriceModal(false); setCustomPriceInput('');
    } catch (e) { console.error(e); }
    finally { setSendingCustomOffer(false); }
  };

  const handleReport = async (msgId: string) => {
    if (reportedIds.has(msgId)) return;
    if (!confirm('Signaler ce message à Brumerie ?')) return;
    await reportMessage(conversation.id, msgId);
    setReportedIds(prev => new Set([...prev, msgId]));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  let lastDate = '';

  return (
    <div className="fixed inset-0 bg-white z-[80] flex flex-col font-sans" style={{ height: '100dvh' }}>

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
            {isGroup ? (
              otherPhoto
                ? <img src={otherPhoto} alt={otherName} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center" style={{ background:'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
            ) : (
              otherPhoto
                ? <img src={otherPhoto} alt={otherName} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center bg-green-50">
                    <span className="text-green-700 font-black">{otherName.charAt(0).toUpperCase()}</span>
                  </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900 text-sm truncate">{otherName}</p>
            {isGroup
              ? <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">{memberCount} membres</p>
              : <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest truncate">{(conversation as any).productTitle}</p>
            }
          </div>
        </div>

        {/* Bouton appel direct */}
        {otherPhone && (
          <a href={`tel:${otherPhone}`}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-green-50 border border-green-100 active:scale-90 transition-all flex-shrink-0"
            onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
            </svg>
          </a>
        )}

        {/* Miniature produit */}
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0">
          {conversation.productImage
            ? <img src={conversation.productImage} alt="" className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              </div>
          }
        </div>
      </div>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser?.uid;
          const isSystem = msg.senderId === 'system';
          const msgDate = dateSeparator(msg.createdAt);
          const showSeparator = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <React.Fragment key={msg.id}>
              {showSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-slate-100 px-4 py-1.5 rounded-full">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{msgDate}</p>
                  </div>
                </div>
              )}

              {isSystem && (
                <div className="flex justify-center my-2">
                  <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-2xl max-w-[85%]">
                    <p className="text-[10px] text-green-700 font-medium text-center leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )}

              {!isSystem && (
                <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 mb-1">
                      {msg.senderPhoto
                        ? <img src={msg.senderPhoto} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center bg-green-50">
                            <span className="text-green-700 font-black text-[10px]">{msg.senderName?.charAt(0)}</span>
                          </div>
                      }
                    </div>
                  )}

                  <div className={`group max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>

                    {/* Image message */}
                    {msg.type === 'image' && (msg as any).imageUrl && (
                      <div className="mb-1 rounded-[1.5rem] overflow-hidden cursor-pointer active:scale-95 transition-all shadow-sm"
                        onClick={() => setLightboxUrl((msg as any).imageUrl)}>
                        <img src={(msg as any).imageUrl} alt="Photo"
                          className="max-w-[220px] max-h-[280px] object-cover rounded-[1.5rem]"/>
                        <div className={`px-3 py-1.5 text-[9px] font-bold ${isMe ? 'bg-blue-500 text-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                          📷 Appuie pour agrandir
                        </div>
                      </div>
                    )}

                    {/* Fiche produit */}
                    {msg.type === 'product_card' && msg.productRef && (
                      <div className={`mb-1 rounded-[1.5rem] overflow-hidden border shadow-sm w-full ${isMe ? 'border-blue-100 bg-blue-50' : 'border-slate-100 bg-white'}`}>
                        <div className="flex items-center gap-3 p-3">
                          {msg.productRef.image && (
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                              <img src={msg.productRef.image} alt="" className="w-full h-full object-cover"/>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-slate-900 truncate">{msg.productRef.title}</p>
                            <p className="text-[10px] font-bold text-green-600">{msg.productRef.price?.toLocaleString('fr-FR')} FCFA</p>
                            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8z"/></svg>
                              {msg.productRef.neighborhood}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 pb-2 text-[10px] font-bold ${isMe ? 'text-blue-500' : 'text-green-600'}`}>📦 Fiche produit partagée</div>
                      </div>
                    )}

                    {/* Offre acheteur */}
                    {msg.type === 'offer_card' && msg.productRef && (
                      <div className={`mb-1 rounded-[1.5rem] overflow-hidden border-2 shadow-sm w-64 ${
                        msg.offerStatus === 'accepted' ? 'border-green-400 bg-green-50'
                        : msg.offerStatus === 'refused' ? 'border-red-200 bg-red-50'
                        : 'border-amber-300 bg-amber-50'
                      }`}>
                        <div className="flex items-center gap-3 p-3">
                          {msg.productRef.image && (
                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                              <img src={msg.productRef.image} alt="" className="w-full h-full object-cover"/>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Offre de prix</p>
                            <p className="text-[13px] font-black text-slate-900">{(msg.offerPrice || 0).toLocaleString('fr-FR')} FCFA</p>
                            <p className="text-[9px] text-slate-400 truncate">{msg.productRef.title}</p>
                          </div>
                        </div>
                        <div className="px-3 pb-2">
                          {msg.offerStatus === 'accepted' && <p className="text-[10px] font-black text-green-700">✅ Offre acceptée</p>}
                          {msg.offerStatus === 'refused' && <p className="text-[10px] font-black text-red-600">❌ Offre refusée</p>}
                          {msg.offerStatus === 'pending' && <p className="text-[10px] font-bold text-amber-700">⏳ En attente de réponse...</p>}
                        </div>
                        {msg.offerStatus === 'accepted' && msg.senderId === currentUser?.uid && (
                          <div className="px-3 pb-3">
                            <button onClick={() => onBuyAtPrice?.(msg.productRef, msg.offerPrice!)}
                              className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                              Acheter à {(msg.offerPrice || 0).toLocaleString('fr-FR')} FCFA
                            </button>
                          </div>
                        )}
                        {msg.offerStatus === 'pending' && msg.senderId !== currentUser?.uid && (
                          <div className="px-3 pb-3 space-y-2">
                            <div className="flex gap-2">
                              <button onClick={() => handleRespondOffer(msg.id, 'refused')} disabled={respondingOffer === msg.id}
                                className="flex-1 py-2 rounded-xl font-black text-[9px] uppercase bg-red-100 text-red-700 active:scale-95 disabled:opacity-50">❌ Refuser</button>
                              <button onClick={() => handleRespondOffer(msg.id, 'accepted')} disabled={respondingOffer === msg.id}
                                className="flex-[2] py-2 rounded-xl font-black text-[9px] uppercase text-white active:scale-95 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                                {respondingOffer === msg.id ? '...' : '✅ Accepter'}
                              </button>
                            </div>
                            {counterOfferMsgId !== msg.id ? (
                              <button onClick={() => { setCounterOfferMsgId(msg.id); setCounterOfferInput(''); }}
                                className="w-full py-2 rounded-xl font-black text-[9px] uppercase bg-amber-50 text-amber-700 border border-amber-200 active:scale-95">
                                🔄 Contre-proposer
                              </button>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <input type="number" value={counterOfferInput} onChange={e => setCounterOfferInput(e.target.value)}
                                  placeholder="Ton prix FCFA" autoFocus
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold outline-none focus:border-amber-400"/>
                                <button onClick={() => handleSendCounterOffer(msg.id, msg)} disabled={sendingCounter || !counterOfferInput}
                                  className="px-3 py-2 rounded-xl font-black text-[9px] uppercase text-white bg-amber-500 active:scale-95 disabled:opacity-50">
                                  {sendingCounter ? '...' : '→'}
                                </button>
                                <button onClick={() => setCounterOfferMsgId(null)} className="px-2 py-2 rounded-xl text-slate-400 text-[12px]">✕</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Catalogue vendeur */}
                    {msg.type === 'seller_offer_card' && msg.productRef && (
                      <div className={`mb-1 rounded-[1.5rem] overflow-hidden border-2 shadow-sm w-64 ${isMe ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center gap-3 p-3">
                          {msg.productRef.image && (
                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                              <img src={msg.productRef.image} alt="" className="w-full h-full object-cover"/>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-purple-600 font-black uppercase tracking-widest">🏷️ Prix spécial</p>
                            <p className="text-[11px] font-black text-slate-900 truncate">{msg.productRef.title}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-black text-green-700">{(msg.sellerCustomPrice || 0).toLocaleString('fr-FR')} FCFA</p>
                              {msg.sellerCustomPrice && msg.sellerCustomPrice < msg.productRef.price && (
                                <p className="text-[9px] text-slate-400 line-through">{msg.productRef.price.toLocaleString('fr-FR')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {msg.senderId !== currentUser?.uid && (
                          <div className="px-3 pb-3">
                            <button onClick={() => onBuyAtPrice?.(msg.productRef, msg.sellerCustomPrice!)}
                              className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                              Acheter à ce prix
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bulle de message texte */}
                    <div className={`px-4 py-3 rounded-[1.5rem] shadow-sm ${
                      isMe ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-slate-900 border border-slate-100 rounded-bl-md'
                    }`}>
                      <TextWithLinks text={msg.text} isMe={isMe}/>
                      <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? 'text-blue-200' : 'text-slate-300'}`}>
                        <span className="text-[9px] font-bold">{timeLabel(msg.createdAt)}</span>
                        {isMe && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke={msg.readBy?.length > 1 ? (isMe ? '#93C5FD' : '#16A34A') : 'currentColor'}
                            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            {msg.readBy?.length > 1
                              ? <><path d="M1 12l4 4L15 6"/><path d="M8 12l4 4L23 6"/></>
                              : <path d="M20 6L9 17l-5-5"/>
                            }
                          </svg>
                        )}
                      </div>
                    </div>

                    {!isMe && !reportedIds.has(msg.id) && (
                      <button onClick={() => handleReport(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-[9px] text-slate-300 font-bold uppercase tracking-widest flex items-center gap-1">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Signaler
                      </button>
                    )}
                    {reportedIds.has(msg.id) && <p className="text-[9px] text-orange-400 font-bold mt-1">Signalé ✓</p>}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Barre d'envoi */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 flex-shrink-0">
        {isSeller && sellerProduct && (
          <div className="flex flex-col gap-2 mb-3">
            {sellerProducts.length > 1 && (
              <select value={selectedSellerProduct?.id || ''}
                onChange={e => {
                  const p = sellerProducts.find((x: any) => x.id === e.target.value);
                  if (p) { setSellerProduct(p); setSelectedSellerProduct(p); }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none">
                {sellerProducts.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title} — {p.price?.toLocaleString('fr-FR')} FCFA</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={handleShareProduct}
                className="flex-1 flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-3 py-2.5 active:scale-98 transition-all">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={sellerProduct.images?.[0]} alt="" className="w-full h-full object-cover"/>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[9px] font-black text-green-800 truncate">{sellerProduct.title}</p>
                  <p className="text-[8px] text-green-600 font-bold">{sellerProduct.price?.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <span className="text-green-600 text-[8px] font-black uppercase flex-shrink-0">📦 Partager</span>
              </button>
              <button onClick={() => setShowCustomPriceModal(true)}
                className="flex items-center gap-1 bg-purple-50 border border-purple-100 rounded-2xl px-3 py-2.5 active:scale-98 transition-all flex-shrink-0">
                <span className="text-[10px]">🏷️</span>
                <span className="text-purple-700 text-[8px] font-black uppercase">Prix perso</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Bouton image */}
          <button onClick={() => imageInputRef.current?.click()} disabled={sendingImage}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 active:scale-90 transition-all flex-shrink-0 disabled:opacity-40">
            {sendingImage
              ? <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"/>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
            }
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect}/>

          <input ref={inputRef} type="text" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={handleKey} placeholder="Écris un message..."
            className="flex-1 bg-slate-50 rounded-2xl px-5 py-4 text-[13px] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all"/>

          <button onClick={handleSend} disabled={!text.trim() || sending}
            className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 disabled:opacity-30 active:scale-90 transition-all flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Modal prix personnalisé vendeur */}
      {showCustomPriceModal && sellerProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-end justify-center p-4" style={{ height: '100dvh' }}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"/>
            <p className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1">🏷️ Prix personnalisé</p>
            <p className="text-slate-400 text-[11px] mb-5">Propose un prix spécial pour cet acheteur.</p>
            <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 mb-5">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <img src={sellerProduct.images?.[0]} alt="" className="w-full h-full object-cover"/>
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">{sellerProduct.title}</p>
                <p className="text-[11px] text-slate-400">Prix actuel : <span className="font-black text-green-600">{sellerProduct.price?.toLocaleString('fr-FR')} FCFA</span></p>
              </div>
            </div>
            <div className="relative mb-5">
              <input type="number" value={customPriceInput} onChange={e => setCustomPriceInput(e.target.value)}
                placeholder={sellerProduct.price?.toString()}
                className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-[18px] font-black border-2 border-transparent focus:border-purple-400 focus:bg-white outline-none transition-all"/>
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">FCFA</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCustomPriceModal(false); setCustomPriceInput(''); }}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-700 font-black text-[11px] uppercase">Annuler</button>
              <button onClick={handleSendCustomOffer}
                disabled={!customPriceInput || parseInt(customPriceInput) <= 0 || sendingCustomOffer}
                className="flex-[2] py-4 rounded-2xl text-white font-black text-[11px] uppercase disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                {sendingCustomOffer ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '🏷️ Envoyer le prix'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox image */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl z-10">
            ✕
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}/>
        </div>
      )}
    </div>
  );
}
