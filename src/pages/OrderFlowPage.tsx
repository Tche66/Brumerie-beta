// src/pages/OrderFlowPage.tsx
// Flow complet acheteur : Récapitulatif → Paiement → Upload preuve
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createOrder, submitProof, calcOrderFees } from '@/services/orderService';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Product, MOBILE_PAYMENT_METHODS, PaymentInfo } from '@/types';
import { initiateEscrowPayment } from '@/services/escrowService';
import { getAvailableDeliverers } from '@/services/deliveryService';
import { getAppConfig, subscribeAppConfig } from '@/services/appConfigService';
import { AWAddress } from '@/services/awService';
import { AWAddressPicker } from '@/components/AWAddressPicker';
import { PaymentLogo } from '@/components/PaymentLogo';
import { getTrustScore, TrustScore } from '@/services/trustService';
import { RiskAlertBanner } from '@/components/RiskBadge';
import { BruIcons } from '@/components/BruIcons';

interface OrderFlowPageProps {
  product: Product;
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
  acceptedPrice?: number; // Prix négocié si offre acceptée
}

type Step = 'recap' | 'availability_check' | 'payment_details' | 'proof' | 'cod_confirm' | 'escrow_redirect';
export function OrderFlowPage({ product, onBack, onOrderCreated, acceptedPrice }: OrderFlowPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [step, setStep] = useState<Step>('recap');
  const [orderId, setOrderId] = useState('');
  const paymentMode = 'escrow' as const;
  // Address-Web — pré-rempli depuis le profil si disponible
  const [awCode, setAwCode] = useState(userProfile?.awAddressCode || '');
  const [awAddress, setAwAddress] = useState<AWAddress | null>(null);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'in_person'>('in_person');
  const [chooseDeliverer, setChooseDeliverer] = useState(false);
  const [availableDeliverers, setAvailableDeliverers] = useState<any[]>([]);
  const [selectedDeliverer, setSelectedDeliverer] = useState<any>(null);
  const [loadingDeliverers, setLoadingDeliverers] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [sellerPayments, setSellerPayments] = useState<PaymentInfo[]>([]);
  const [sellerPhone, setSellerPhone] = useState<string>('');
  const [sellerDelivery, setSellerDelivery] = useState<{ sameZone: number; otherZone: number }>({ sameZone: 0, otherZone: 0 });
  const [loadingSellerInfo, setLoadingSellerInfo] = useState(true);
  const [transactionRef, setTransactionRef] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [orderError, setOrderError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // Anti-Arnaque : score de risque de l'acheteur courant
  const [buyerRiskScore, setBuyerRiskScore] = useState<TrustScore | null>(null);

  // Prix effectif = prix négocié ou prix normal
  const effectivePrice = acceptedPrice ?? product.price;
  const fileRef = useRef<HTMLInputElement>(null);

  // Charger le score de risque de l'acheteur (alerter le vendeur)
  React.useEffect(() => {
    if (!currentUser?.uid) return;
    getTrustScore(currentUser.uid).then(score => {
      if (score && score.riskLevel !== 'safe') setBuyerRiskScore(score);
    });
  }, [currentUser?.uid]);




  React.useEffect(() => {
    if (!chooseDeliverer || availableDeliverers.length > 0) return;
    setLoadingDeliverers(true);
    const zone = userProfile?.neighborhood || product.neighborhood || 'Abidjan';
    getAvailableDeliverers(zone)
      .then(setAvailableDeliverers)
      .catch(() => setAvailableDeliverers([]))
      .finally(() => setLoadingDeliverers(false));
  }, [chooseDeliverer]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Charger les coordonnées de paiement du vendeur depuis Firestore
  React.useEffect(() => {
    const fetchSeller = async () => {
      setLoadingSellerInfo(true);
      try {
        const snap = await getDoc(doc(db, 'users', product.sellerId));
        if (snap.exists()) {
          const data = snap.data();
          setSellerPayments(data.defaultPaymentMethods || []);
          setSellerPhone(data.phone || data.whatsapp || '');
          setSellerDelivery({
            sameZone: data.deliveryPriceSameZone || 0,
            otherZone: data.deliveryPriceOtherZone || 0,
          });
        }
      } catch (e) { console.error('[OrderFlow] fetchSeller:', e); }
      finally { setLoadingSellerInfo(false); }
    };
    fetchSeller();
  }, [product.sellerId]);

  const handleStartOrder = async () => {
    if (!currentUser || !userProfile || !paymentInfo) return;
    setLoading(true);
    try {
      const deliveryFee = 0; // Sera fixé par le livreur lors de l'assignation
      const id = await createOrder({
        buyerId: currentUser.uid,
        buyerName: userProfile.name,
        buyerPhoto: userProfile.photoURL,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        sellerPhoto: product.sellerPhoto,
        productId: product.id,
        productTitle: product.title,
        productImage: product.images?.[0] || '',
        productPrice: effectivePrice,
        deliveryFee,
        paymentInfo,
        sellerPaymentMethods: sellerPayments,
        sellerPhone: sellerPhone,
        buyerPhone: userProfile.phone || '',
        deliveryType,
        sellerNeighborhood: product.neighborhood || '',
        buyerNeighborhood: userProfile.neighborhood || '',
        // <BruIcons.CheckCircle size={14}/> Firestore refuse undefined — on omet les champs vides
        ...(awCode        ? { buyerAWCode:      awCode }               : {}),
        ...(awAddress?.repere    ? { buyerAWRepere: awAddress.repere }  : {}),
        ...(awAddress?.latitude  ? { buyerAWLatitude: awAddress.latitude } : {}),
        ...(awAddress?.longitude ? { buyerAWLongitude: awAddress.longitude } : {}),
      });
      setOrderId(id);
      setStep('proof');
    } catch (e: any) {
      console.error('[handleStartOrder]', e);
      const msg = e?.message || e?.code || JSON.stringify(e);
      setOrderError(`Erreur : ${msg}`);
    } finally { setLoading(false); }
  };

  // ── Paiement à la livraison — crée commande COD directement ──
  const handleStartCOD = async () => {
    if (!currentUser || !userProfile) {
      setOrderError('Connecte-toi pour passer commande.');
      return;
    }
    setLoading(true);
    try {
      const deliveryFee = 0; // Sera fixé par le livreur lors de l'assignation
      const codPaymentInfo: any = { method: 'cash_on_delivery', phone: '', holderName: '' };
      const id = await createOrder({
        buyerId: currentUser.uid,
        buyerName: userProfile.name,
        buyerPhoto: userProfile.photoURL,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        sellerPhoto: product.sellerPhoto,
        productId: product.id,
        productTitle: product.title,
        productImage: product.images?.[0] || '',
        productPrice: effectivePrice,
        deliveryFee,
        paymentInfo: codPaymentInfo,
        sellerPaymentMethods: sellerPayments,
        sellerPhone: sellerPhone,
        buyerPhone: userProfile.phone || '',
        deliveryType,
        sellerNeighborhood: product.neighborhood || '',
        buyerNeighborhood: userProfile.neighborhood || '',
        // Firestore refuse undefined — on omet les champs vides
        ...(awCode        ? { buyerAWCode:      awCode }               : {}),
        ...(awAddress?.repere    ? { buyerAWRepere: awAddress.repere }  : {}),
        ...(awAddress?.latitude  ? { buyerAWLatitude: awAddress.latitude } : {}),
        ...(awAddress?.longitude ? { buyerAWLongitude: awAddress.longitude } : {}),
      });
      setOrderId(id);
      setStep('cod_confirm');
    } catch (e: any) {
      console.error('[handleStartCOD]', e);
      const msg = e?.message || e?.code || JSON.stringify(e);
      setOrderError(`Erreur : ${msg}`);
    } finally { setLoading(false); }
  };

  // ── Paiement sécurisé (Escrow CinetPay) ──
  const handleStartEscrow = async () => {
    if (!currentUser || !userProfile) {
      setOrderError('Connecte-toi pour passer commande.');
      return;
    }
    setLoading(true);
    try {
      const deliveryFee = 0;
      const escrowPaymentInfo: any = { method: 'escrow_cinetpay', phone: userProfile.phone || '', holderName: userProfile.name || '' };
      const id = await createOrder({
        buyerId: currentUser.uid,
        buyerName: userProfile.name,
        buyerPhoto: userProfile.photoURL,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        sellerPhoto: product.sellerPhoto,
        productId: product.id,
        productTitle: product.title,
        productImage: product.images?.[0] || '',
        productPrice: effectivePrice,
        deliveryFee,
        paymentInfo: escrowPaymentInfo,
        sellerPaymentMethods: sellerPayments,
        sellerPhone: sellerPhone,
        buyerPhone: userProfile.phone || '',
        deliveryType,
        sellerNeighborhood: product.neighborhood || '',
        buyerNeighborhood: userProfile.neighborhood || '',
        ...(awCode ? { buyerAWCode: awCode } : {}),
        ...(awAddress?.repere ? { buyerAWRepere: awAddress.repere } : {}),
        ...(awAddress?.latitude ? { buyerAWLatitude: awAddress.latitude } : {}),
        ...(awAddress?.longitude ? { buyerAWLongitude: awAddress.longitude } : {}),
      });
      setOrderId(id);

      // Initier le paiement CinetPay et rediriger
      const escrowResult = await initiateEscrowPayment({
        orderId: id,
        amount: effectivePrice + 100,
        buyerPhone: userProfile.phone || '',
        buyerName: userProfile.name || '',
      });

      // Rediriger vers la page de paiement CinetPay
      window.location.href = escrowResult.paymentUrl;
    } catch (e: any) {
      console.error('[handleStartEscrow]', e);
      const msg = e?.message || e?.code || JSON.stringify(e);
      setOrderError(`Erreur : ${msg}`);
    } finally { setLoading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!screenshotPreview) return;
    setLoading(true);
    try {
      await submitProof(orderId, {
        screenshotUrl: screenshotPreview,
        transactionRef: 'N/A', // champ désactivé — preuve photo suffit
      });
      onOrderCreated(orderId);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const method = MOBILE_PAYMENT_METHODS.find(m => m.id === paymentInfo?.method);

  // Livreur choisi par vendeur après validation commande


  // ── ÉTAPE 1 : Récapitulatif ────────────────────────────
  if (step === 'recap') return (<>
    <div className="fixed inset-0 bg-white z-[90] flex flex-col font-sans" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Finaliser la commande</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

        {/* ── Alerte Anti-Arnaque — acheteur signalé ── */}
        {buyerRiskScore && buyerRiskScore.riskLevel !== 'safe' && (
          <RiskAlertBanner
            level={buyerRiskScore.riskLevel}
            reportCount={buyerRiskScore.reportCount}
            userName={buyerRiskScore.userName}
          />
        )}

        {/* Produit */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
            <img src={product.images?.[0]} alt={product.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm truncate">{product.title}</p>
            <p className="text-green-600 font-black text-lg">{effectivePrice.toLocaleString('fr-FR')} FCFA</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase">{product.sellerName}</p>
          </div>
        </div>

        {/* Détail du prix — frais détaillés */}
        {(() => {
          const fees = calcOrderFees(effectivePrice);
          return (
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Récapitulatif</p>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-600 font-medium">Prix de l'article</span>
                  <div className="flex items-center gap-2">
                    {acceptedPrice && acceptedPrice !== product.price && (
                      <span className="text-[11px] text-slate-400 line-through">{product.price.toLocaleString('fr-FR')}</span>
                    )}
                    <span className="font-bold text-slate-900 text-[13px]">{effectivePrice.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-500 font-medium">Protection acheteur (2%)</span>
                  <span className="text-slate-600 text-[12px] font-medium">{fees.buyerProtectionFee.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-slate-500 font-medium">Frais de livraison</span>
                    <span className="text-slate-400 text-[11px] font-medium">Fixé par le livreur</span>
                  </div>
                )}
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-black text-slate-800">Total à payer</span>
                  <span className="font-black text-green-700 text-[15px]">
                    {fees.buyerPays.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 bg-green-50 rounded-xl px-3 py-2 border border-green-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <p className="text-[10px] text-green-700 font-medium">Transaction protégée — votre argent est sécurisé jusqu'à réception</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Type de remise */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mode de remise</p>
          <div className="space-y-3">
            {/* Main propre */}
            <button
              onClick={() => setDeliveryType('in_person')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${deliveryType === 'in_person' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${deliveryType === 'in_person' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={deliveryType === 'in_person' ? 'white' : '#64748B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className={`text-[13px] font-bold ${deliveryType === 'in_person' ? 'text-slate-900' : 'text-slate-700'}`}>Remise en main propre</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Rencontrez le vendeur et recevez l'article directement</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">Gratuit</span>
                  <span className="text-[9px] text-slate-400">Confirmation immediate</span>
                </div>
              </div>
              {deliveryType === 'in_person' && (
                <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </button>

            {/* Livraison */}
            <button
              onClick={() => setDeliveryType('delivery')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${deliveryType === 'delivery' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${deliveryType === 'delivery' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={deliveryType === 'delivery' ? 'white' : '#64748B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className={`text-[13px] font-bold ${deliveryType === 'delivery' ? 'text-slate-900' : 'text-slate-700'}`}>Livraison</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Un livreur Brumerie vous apporte l'article</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">Frais selon distance</span>
                  <span className="text-[9px] text-slate-400">24-72h</span>
                </div>
              </div>
              {deliveryType === 'delivery' && (
                <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </button>
          </div>

          {/* Choix livreur */}
          {deliveryType === 'delivery' && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Livreur</p>
              <div className="space-y-2">
                <button
                  onClick={() => { setChooseDeliverer(false); setSelectedDeliverer(null); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${!chooseDeliverer ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${!chooseDeliverer ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!chooseDeliverer ? 'white' : '#64748B'} strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className={`text-[12px] font-bold ${!chooseDeliverer ? 'text-slate-900' : 'text-slate-600'}`}>Brumerie assigne un livreur</p>
                    <p className="text-[10px] text-slate-400">Nous trouvons le meilleur livreur pour vous</p>
                  </div>
                  {!chooseDeliverer && (
                    <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setChooseDeliverer(true)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${chooseDeliverer ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${chooseDeliverer ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={chooseDeliverer ? 'white' : '#64748B'} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className={`text-[12px] font-bold ${chooseDeliverer ? 'text-slate-900' : 'text-slate-600'}`}>Choisir mon livreur</p>
                    <p className="text-[10px] text-slate-400">Selectionnez un livreur disponible dans votre zone</p>
                  </div>
                  {chooseDeliverer && (
                    <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </button>
              </div>

              {/* Liste livreurs disponibles */}
              {chooseDeliverer && (
                <div className="space-y-2">
                  {loadingDeliverers ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"/>
                    </div>
                  ) : availableDeliverers.length === 0 ? (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-[11px] text-amber-700 font-medium text-center">Aucun livreur disponible dans votre zone pour le moment</p>
                    </div>
                  ) : (
                    availableDeliverers.map((d: any) => (
                      <button key={d.id}
                        onClick={() => setSelectedDeliverer(d)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${selectedDeliverer?.id === d.id ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-white'}`}>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                          {d.photoURL || d.deliveryPhotoURL
                            ? <img src={d.deliveryPhotoURL || d.photoURL} alt="" className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">{(d.deliveryPartnerName || d.name)?.charAt(0)}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[12px] font-bold text-slate-900 truncate">{d.deliveryPartnerName || d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.neighborhood || 'Abidjan'}</p>
                        </div>
                        {d.deliveryPriceSameZone && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg flex-shrink-0">
                            {d.deliveryPriceSameZone?.toLocaleString('fr-FR')} F
                          </span>
                        )}
                        {selectedDeliverer?.id === d.id && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ADRESSE — visible si livraison ── */}
        {deliveryType === 'delivery' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100">
            <AWAddressPicker
              value={awCode}
              onChange={(code, addr) => { setAwCode(code); setAwAddress(addr); }}
              label="Adresse de livraison"
              placeholder="AW-ABJ-84321"
              firebaseUid={currentUser?.uid}
            />
          </div>
        )}

        {/* ── MODE DE PAIEMENT — Escrow uniquement ── */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Paiement</p>
          <div className="bg-white rounded-2xl border border-green-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-900">Paiement securise</p>
                <p className="text-[11px] text-slate-500">Ton argent est protege jusqu'a reception</p>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span>Wave, Orange Money, MTN, Moov acceptes</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span>Argent bloque jusqu'a confirmation de reception</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span>Remboursement en cas de litige</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Protection acheteur (2%)</span>
              <span className="text-[11px] font-bold text-green-700">
                {calcOrderFees(effectivePrice).buyerProtectionFee.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bouton de commande */}
      <div className="px-5 py-4 border-t border-slate-100 space-y-3">
        {orderError && (
          <p className="text-red-500 text-[11px] font-bold text-center px-2 mb-1">{orderError}</p>
        )}
        <button
          onClick={() => { setOrderError(''); handleStartEscrow(); }}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-[13px] text-white active:scale-[0.98] transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #16A34A, #065F46)' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Redirection paiement...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Payer {calcOrderFees(effectivePrice).buyerPays.toLocaleString('fr-FR')} FCFA
            </div>
          )}
        </button>
      </div>
    </div>
  </>
  );

  // ── ÉTAPE 2 : Coordonnées paiement ─────────────────────
  if (step === 'availability_check') return (<>
    <div className="fixed inset-0 bg-white z-[90] flex flex-col font-sans" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100">
        <button onClick={() => setStep('recap')} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Disponibilité</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {/* Article */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
            <img src={product.images?.[0]} alt={product.title} className="w-full h-full object-cover"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm truncate">{product.title}</p>
            <p className="text-green-600 font-black">{effectivePrice.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>

        {/* Avertissement sécurité */}
        <div className="bg-orange-50 rounded-2xl p-4 border-2 border-orange-200">
          <p className="text-[11px] font-black text-orange-900 mb-2"><BruIcons.AlertTriangle size={14}/> Avant de payer — lisez attentivement</p>
          <ul className="space-y-1.5">
            {[
              "Confirmez que le vendeur est disponible pour livrer.",
              "Paiement mobile money — disponible prochainement.",
              "Brumerie ne rembourse pas en cas de litige au stade MVP.",
              "En cas de doute, choisissez Payer à la livraison."
            ].map((txt, i) => (
              <li key={i} className="flex gap-2 text-[10px] text-orange-800 font-bold leading-snug">
                <span className="flex-shrink-0">•</span>{txt}
              </li>
            ))}
          </ul>
        </div>

        {/* Attente confirmation vendeur — ici on passe directement, le vendeur confirmera après */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-[11px] font-black text-blue-900 mb-1">Comment ça marche</p>
          <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
            1. Tu passes ta commande<br/>
            2. Le vendeur <strong>confirme la disponibilité</strong> dans les 24h<br/>
            3. Seulement après sa confirmation, tu envoies le paiement<br/>
            4. Tu envoies la preuve de paiement sur Brumerie
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vendeur</p>
          <p className="font-black text-slate-900 text-[13px]">{product.sellerName}</p>
          <p className="text-[11px] text-slate-400 font-bold">{product.neighborhood}</p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 space-y-3">
        <button
          onClick={() => setStep('payment_details')}
          className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-orange-200 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #D97706, #92400E)' }}>
          J'ai compris — Continuer vers le paiement →
        </button>
        <button onClick={() => setStep('recap')}
          className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 bg-slate-50">
          ← Retour
        </button>
      </div>
    </div>
  </>
  );

  if (step === 'payment_details') return (<>
    <div className="fixed inset-0 bg-white z-[90] flex flex-col font-sans" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100">
        <button onClick={() => setStep('recap')} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Effectuer le paiement</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {/* Montant à envoyer */}
        <div className="text-center py-6 px-4 rounded-3xl"
          style={{ background:`linear-gradient(135deg, ${method?.color}15, ${method?.color}30)` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Montant à envoyer</p>
          <p className="text-4xl font-black text-slate-900">
            {effectivePrice.toLocaleString('fr-FR')}
          </p>
          <p className="text-lg font-black text-slate-600">FCFA</p>

        </div>

        {/* Coordonnées */}
        <div className="bg-slate-50 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            {method && <PaymentLogo logo={method.logo} name={method.name} color={method.color} size={36} />}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Envoyer via {method?.name}</p>
          </div>

          {/* Numéro avec bouton copier */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100">
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Numéro {method?.name}</p>
              <p className="font-black text-slate-900 text-xl tracking-wider">{paymentInfo?.phone}</p>
            </div>
            <button
              onClick={() => copyPhone(paymentInfo?.phone || '')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-90 ${copied ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {copied ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>Copié !</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copier</>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100">
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Nom du titulaire</p>
              <p className="font-black text-slate-900 text-[15px]">{paymentInfo?.holderName}</p>
            </div>
          </div>
        </div>

        {/* Avertissement anti-fraude */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.2" className="flex-shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p className="text-[10px] font-black text-amber-900 uppercase mb-1">Vérifiez le nom avant d'envoyer</p>
            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">Confirmez que le nom affiché correspond au titulaire Wave/OM avant tout envoi. Brumerie ne rembourse pas les virements sur un mauvais numéro.</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100">
        {orderError && (
          <p className="text-red-500 text-[12px] font-bold text-center mb-2">{orderError}</p>
        )}
        <button onClick={() => { setOrderError(''); handleStartOrder(); }} disabled={loading}
          className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Création en cours...
            </div>
          ) : "J'ai effectué le paiement →"}
        </button>
      </div>
    </div>
  </>
  );


  // ── ÉTAPE PROOF : Upload preuve de paiement ─────────────────
  if (step === 'proof') return (
    <div className="fixed inset-0 bg-white z-[90] flex flex-col font-sans" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100">
        <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center">
          <span className="text-xl">📎</span>
        </div>
        <div>
          <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Preuve de paiement</h1>
          <p className="text-[10px] text-slate-400">Envoie une capture d&apos;écran de ton virement</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

        {/* Confirmation montant */}
        <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3 border border-green-100">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div>
            <p className="font-black text-green-800 text-[13px]">Paiement enregistré</p>
            <p className="text-[11px] text-green-700">
              {effectivePrice.toLocaleString('fr-FR')} FCFA — en attente de ta preuve
            </p>
          </div>
        </div>

        {/* Upload screenshot */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Capture d&apos;écran du virement *
          </p>
          {screenshotPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={screenshotPreview} alt="preuve" className="w-full rounded-2xl object-contain max-h-72"/>
              <button
                onClick={() => { setScreenshotPreview(''); setScreenshotFile(null); }}
                className="absolute top-3 right-3 w-8 h-8 bg-slate-900/70 rounded-full flex items-center justify-center">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-12 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 active:scale-95 transition-all bg-slate-50">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div className="text-center">
                <p className="font-black text-slate-700 text-[13px]">Choisir une image</p>
                <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG — capture de ton virement Wave/OM</p>
              </div>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setScreenshotFile(f);
              const r = new FileReader();
              r.onload = ev => setScreenshotPreview(ev.target?.result as string);
              r.readAsDataURL(f);
            }}
          />
        </div>

        <p className="text-[10px] text-slate-400 text-center font-bold leading-relaxed">
          Le vendeur sera notifié dès réception de ta preuve et confirmera la commande.
        </p>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 space-y-3">
        <button onClick={handleSubmitProof} disabled={!screenshotPreview || loading}
          className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
          {loading
            ? <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Envoi...</div>
            : 'Envoyer la preuve →'}
        </button>
        <button onClick={() => setStep('payment_details')}
          className="w-full py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
          ← Retour aux détails de paiement
        </button>
      </div>
    </div>
  );

  // ── ÉTAPE COD : Confirmation réception à la livraison ───
  if (step === 'cod_confirm') return (<>
    <div className="fixed inset-0 bg-white z-[90] flex flex-col font-sans" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100">
        <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center">
          <span className="text-xl"><BruIcons.Check size={14}/></span>
        </div>
        <div>
          <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Commande confirmée</h1>
          <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest">Paiement à la livraison</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {/* Récap produit */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
            <img src={product.images?.[0]} alt={product.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm truncate">{product.title}</p>
            <p className="text-green-600 font-black text-lg">{effectivePrice.toLocaleString('fr-FR')} FCFA</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase">{product.sellerName}</p>
          </div>
        </div>

        {/* Message info */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-[12px] font-black text-blue-900 mb-2"><BruIcons.Package size={14}/> Ta commande est enregistrée !</p>
          <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
            Le vendeur a été notifié. Tu paieras <strong>{effectivePrice.toLocaleString('fr-FR')} FCFA</strong> directement
            {deliveryType === 'delivery' ? ' à la livraison.' : ' lors du retrait en main propre.'}
          </p>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
            Contacte le vendeur via la messagerie pour convenir des détails de la remise (lieu, heure).
          </p>
        </div>

        {/* Étapes du flux COD */}
        <div className="bg-slate-50 rounded-3xl p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ce qui se passe ensuite</p>
          <div className="space-y-4">
            {[
              { ico: '', t: 'Le vendeur te contacte', d: 'Via la messagerie Brumerie pour confirmer la remise' },
              { ico: deliveryType === 'delivery' ? '🚚' : '', t: deliveryType === 'delivery' ? 'Livraison chez toi' : 'Retrait en main propre', d: "Conviens du lieu et de l'heure avec le vendeur" },
              { ico: '', t: 'Tu paies à la réception', d:`${effectivePrice.toLocaleString('fr-FR')} FCFA en cash au moment de la remise` },
              { ico: '⭐', t: 'Tu notes le vendeur', d: 'Reviens confirmer la réception et laisser un avis' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">{s.ico}</div>
                <div>
                  <p className="text-[12px] font-black text-slate-900">{s.t}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 space-y-3">
        <button
          onClick={() => onOrderCreated(orderId)}
          className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
          Voir le suivi de ma commande →
        </button>
      </div>
    </div>
  </>
  );
}
