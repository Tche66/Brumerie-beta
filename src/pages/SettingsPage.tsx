// src/pages/SettingsPage.tsx — Réaménagé v2
// Architecture claire : 5 sections logiques
import React, { useState } from 'react';
import { ChangeEmailModal } from '@/components/ChangeEmailModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { MOBILE_PAYMENT_METHODS, PaymentInfo } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { PaymentLogo } from '@/components/PaymentLogo';
import { GuideButton } from '@/components/OnboardingGuide';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  role?: 'buyer' | 'seller';
}

// ── Composants ────────────────────────────────────────────────
function SettingItem({ icon, label, sublabel, onClick, danger, badge, right }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  onClick: () => void; danger?: boolean; badge?: string;
  right?: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 active:bg-slate-100 transition-all text-left group">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-active:scale-90 ${danger ? 'bg-red-50' : 'bg-slate-50'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold tracking-tight ${danger ? 'text-red-500' : 'text-slate-900'}`}>{label}</p>
        {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      {badge && (
        <span className="text-[9px] font-black px-2.5 py-1 rounded-full text-white bg-green-600 uppercase tracking-widest mr-1">
          {badge}
        </span>
      )}
      {right}
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className={danger ? 'text-red-200' : 'text-slate-200'}>
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function SettingSection({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-2 mb-2">
        <span className="text-base">{emoji}</span>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</p>
      </div>
      <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm divide-y divide-slate-50">
        {children}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export function SettingsPage({ onBack, onNavigate, role = 'seller' }: SettingsPageProps) {
  const { currentUser, userProfile, signOut, refreshUserProfile } = useAuth();
  const isBuyer = role === 'buyer';
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Paiement mobile
  const [paymentMethods, setPaymentMethods] = useState<PaymentInfo[]>(userProfile?.defaultPaymentMethods || []);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPM, setNewPM] = useState({ method: 'wave', phone: '', holderName: '' });
  const [savingPM, setSavingPM] = useState(false);

  React.useEffect(() => {
    refreshUserProfile().then(() => {
      setPaymentMethods(userProfile?.defaultPaymentMethods || []);
    });
  }, []);

  const handleSavePaymentMethod = async () => {
    if (!currentUser || !newPM.phone.trim() || !newPM.holderName.trim()) return;
    setSavingPM(true);
    const updated = [...paymentMethods, { method: newPM.method, phone: newPM.phone.trim(), holderName: newPM.holderName.trim() }];
    await updateUserProfile(currentUser.uid, { defaultPaymentMethods: updated });
    await refreshUserProfile();
    setPaymentMethods(updated);
    setNewPM({ method: 'wave', phone: '', holderName: '' });
    setAddingPayment(false);
    setSavingPM(false);
  };

  const handleDeletePaymentMethod = async (idx: number) => {
    if (!currentUser) return;
    const updated = paymentMethods.filter((_, i) => i !== idx);
    await updateUserProfile(currentUser.uid, { defaultPaymentMethods: updated });
    await refreshUserProfile();
    setPaymentMethods(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans">

      {/* Header */}
      <div className="bg-white sticky top-0 z-50 px-5 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-black text-[15px] uppercase tracking-widest text-slate-900">Paramètres</h1>
      </div>

      <div className="px-4 pt-6">

        {/* ── Carte profil ─────────────────────────────────── */}
        <button onClick={() => onNavigate('profile')}
          className="w-full bg-white rounded-[2rem] p-5 mb-6 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-[0.98] transition-all text-left">
          <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-slate-100 border-2 border-slate-50 flex-shrink-0">
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center bg-green-50">
                  <span className="text-green-600 font-black text-2xl">{userProfile?.name?.charAt(0)?.toUpperCase()}</span>
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[15px] truncate">{userProfile?.name}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{userProfile?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white ${isBuyer ? 'bg-blue-500' : 'bg-green-600'}`}>
                {isBuyer ? '🛒 Acheteur' : '🏪 Vendeur'}
              </span>
              {userProfile?.isVerified && (
                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white bg-green-700">
                  ✓ Vérifié
                </span>
              )}
              {userProfile?.neighborhood && (
                <span className="text-[8px] text-slate-400 font-bold">📍 {userProfile.neighborhood}</span>
              )}
            </div>
          </div>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-slate-200 flex-shrink-0">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* ══ SECTION 1 : Mon profil ═══════════════════════ */}
        <SettingSection title="Mon profil" emoji="👤">
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            label="Modifier mon profil"
            sublabel="Nom, photo, téléphone, quartier"
            onClick={() => onNavigate('edit-profile')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            label="Changer d'adresse email"
            sublabel={userProfile?.email || 'Email actuel'}
            onClick={() => setShowChangeEmail(true)}
          />
        </SettingSection>

        {/* ══ SECTION 2 : Ma boutique ═══════════════════════ */}
        <SettingSection title="Ma boutique" emoji="🏪">
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            label="Badge Vendeur Vérifié"
            sublabel={userProfile?.isVerified ? '✓ Ton badge est actif' : 'Boost ta crédibilité — 3 000 FCFA/mois'}
            badge={userProfile?.isVerified ? 'Actif' : undefined}
            onClick={() => onNavigate('verification')}
          />
          {(userProfile?.isVerified || userProfile?.isPremium) && (
            <SettingItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
              label="Personnaliser ma boutique"
              sublabel="Bannière, couleur, slogan"
              onClick={() => onNavigate('shop-customize')}
            />
          )}
          {/* Comptabilité — visible pour tous, accès conditionnel au badge */}
          {(userProfile?.isVerified || userProfile?.isPremium) ? (
            <SettingItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
              label="💰 Ma Comptabilité"
              sublabel="Recettes · Dépenses · Bénéfice net"
              onClick={() => onNavigate('compta')}
              badge="Actif"
            />
          ) : (
            <button
              onClick={() => onNavigate('verification')}
              className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 active:bg-slate-100 transition-all text-left group">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-900">💰 Ma Comptabilité</p>
                <p className="text-[10px] text-amber-600 font-bold mt-0.5 leading-tight">
                  🔒 Réservé aux Vendeurs Vérifiés · Active ton badge →
                </p>
              </div>
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full text-white bg-amber-500 uppercase tracking-widest flex-shrink-0 mr-1">
                Vérifié requis
              </span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-slate-200">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {!isBuyer && (
            <div className="divide-y divide-slate-50">
              {/* Moyens de paiement */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">Paiements Mobile Money</p>
                      <p className="text-[10px] text-slate-400">{paymentMethods.length} moyen{paymentMethods.length > 1 ? 's' : ''} enregistré{paymentMethods.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {!addingPayment && (
                    <button onClick={() => setAddingPayment(true)}
                      className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
                      + Ajouter
                    </button>
                  )}
                </div>
                {paymentMethods.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {paymentMethods.map((pm, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                        {(() => { const m = MOBILE_PAYMENT_METHODS.find(x => x.id === pm.method); return m ? <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={28}/> : null; })()}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-800">{pm.holderName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{pm.phone}</p>
                        </div>
                        <button onClick={() => handleDeletePaymentMethod(idx)}
                          className="text-red-400 active:scale-90 transition-all p-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {addingPayment && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {MOBILE_PAYMENT_METHODS.map(m => (
                        <button key={m.id} onClick={() => setNewPM(p => ({ ...p, method: m.id }))}
                          className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border-2 text-[11px] font-bold transition-all ${newPM.method === m.id ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-100 bg-white text-slate-600'}`}>
                          <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={20}/>{m.name}
                        </button>
                      ))}
                    </div>
                    <input value={newPM.phone} onChange={e => setNewPM(p => ({ ...p, phone: e.target.value }))}
                      placeholder="Numéro Mobile Money" type="tel"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400"/>
                    <input value={newPM.holderName} onChange={e => setNewPM(p => ({ ...p, holderName: e.target.value }))}
                      placeholder="Nom du titulaire"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400"/>
                    <div className="flex gap-2">
                      <button onClick={() => setAddingPayment(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase">Annuler</button>
                      <button onClick={handleSavePaymentMethod} disabled={savingPM || !newPM.phone.trim() || !newPM.holderName.trim()}
                        className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-black text-[10px] uppercase disabled:opacity-50">
                        {savingPM ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Journal de dettes */}
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>}
            label="📒 Journal de Dettes"
            sublabel="Suivi des ventes à crédit · Rappel WhatsApp"
            onClick={() => onNavigate('dettes')}
          />
          {/* Changer de mode */}
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>}
            label={isBuyer ? 'Passer en mode Vendeur' : 'Passer en mode Acheteur'}
            sublabel={isBuyer ? 'Publie tes articles et gère ta boutique' : 'Repasser en mode exploration'}
            onClick={() => onNavigate(isBuyer ? 'switch-to-seller' : 'switch-to-buyer')}
          />
        </SettingSection>

        {/* ══ SECTION 3 : Livraison & Adresse ══════════════ */}
        <SettingSection title="Livraison & Adresse" emoji="📍">
          {/* Adresse AddressWeb */}
          <div className="px-6 py-4">
            {userProfile?.awAddressCode ? (
              <div className="flex items-center justify-between p-4 bg-sky-50 rounded-2xl border border-sky-100">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="font-black text-sky-800 text-[13px] font-mono">{userProfile.awAddressCode}</p>
                    <p className="text-sky-600 text-[10px] font-bold mt-0.5">Mon adresse numérique</p>
                  </div>
                </div>
                <a href={`https://addressweb.brumerie.com/${userProfile.awAddressCode}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-black text-sky-700 bg-white border border-sky-200 px-3 py-2 rounded-xl active:scale-90 transition-all">
                  Voir →
                </a>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="font-black text-amber-800 text-[12px] mb-1">📍 Pas encore d'adresse numérique</p>
                <p className="text-amber-700 text-[10px] font-medium leading-relaxed mb-3">
                  Sans adresse, les livreurs ne peuvent pas te localiser. Crée la gratuitement depuis ton profil.
                </p>
                <button onClick={() => onNavigate('edit-profile')}
                  className="w-full py-3 text-center rounded-xl font-black text-[11px] uppercase tracking-widest text-white bg-sky-600 active:scale-95 transition-all">
                  📍 Créer mon adresse
                </button>
              </div>
            )}
          </div>
          {/* Livreur */}
          {!userProfile?.deliveryCGUAccepted ? (
            <SettingItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 018 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 018-8z"/></svg>}
              label="Devenir Livreur Partenaire"
              sublabel="Livre dans ton quartier et gagne de l'argent"
              onClick={() => onNavigate('become-deliverer')}
            />
          ) : (
            <SettingItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="16" r="1"/><circle cx="20" cy="16" r="1"/></svg>}
              label="Mon espace livreur"
              sublabel="Voir mes missions et mes gains"
              onClick={() => onNavigate('deliverer-dashboard')}
            />
          )}
        </SettingSection>

        {/* ══ SECTION 4 : Communauté ════════════════════════ */}
        <SettingSection title="Communauté" emoji="🤝">
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
            label="Parrainage"
            sublabel={`Invite des amis · ${userProfile?.referralCount || 0} invité${(userProfile?.referralCount || 0) > 1 ? 's' : ''} rejoint${(userProfile?.referralCount || 0) > 1 ? 's' : ''}`}
            onClick={() => onNavigate('referral')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
            label="Télécharger l'app Android"
            sublabel="Installe Brumerie sur ton téléphone"
            onClick={() => window.open('/telecharger', '_blank', 'noopener,noreferrer')}
          />
        </SettingSection>

        {/* ══ SECTION 5 : Informations & Aide ══════════════ */}
        <SettingSection title="Informations & Aide" emoji="ℹ️">
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            label="Guide utilisateur"
            sublabel="Toutes les fonctionnalités expliquées"
            onClick={() => onNavigate('guide')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
            label="Support & Aide"
            sublabel="Une question ? On t'aide"
            onClick={() => onNavigate('support')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            label="Politique de confidentialité"
            sublabel="Loi n°2013-450 · ARTCI · Tes données"
            onClick={() => onNavigate('privacy')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
            label="Conditions d'utilisation"
            sublabel="CGU · CGV · Marketplace C2C"
            onClick={() => onNavigate('terms')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            label="À propos de Brumerie"
            sublabel="Version Bêta MVP · Fait à Abidjan 🇨🇮"
            onClick={() => onNavigate('about')}
          />
        </SettingSection>

        {/* ══ Admin (caché) ══════════════════════════════════ */}
        {currentUser?.uid === ((import.meta as any).env?.VITE_ADMIN_UID || '__NONE__') && (
          <div className="px-2 mb-6">
            <button onClick={() => onNavigate('admin')}
              className="w-full py-3 rounded-2xl border border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
              ⚙️ Administration Brumerie
            </button>
          </div>
        )}

        {/* ══ Zone danger ════════════════════════════════════ */}
        <div className="bg-white rounded-[2rem] overflow-hidden border border-red-100 divide-y divide-red-50 mb-6">
          <button onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center gap-4 px-6 py-5 active:bg-red-50 transition-all text-left">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-red-500">Se déconnecter</p>
              <p className="text-[10px] text-slate-400">Tu devras te reconnecter</p>
            </div>
          </button>
        </div>

        <p className="text-center text-[9px] font-black text-slate-300 mt-2 mb-6 uppercase tracking-[0.3em]">
          Brumerie ® 2026 · Abidjan 🇨🇮
        </p>
      </div>

      {/* Modals */}
      <ConfirmModal
        visible={showSignOutModal}
        title="Se déconnecter ?"
        message="Tu devras te reconnecter pour accéder à ton compte."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        danger
        onConfirm={() => { setShowSignOutModal(false); signOut(); }}
        onCancel={() => setShowSignOutModal(false)}
      />
      {showChangeEmail && currentUser && (
        <ChangeEmailModal
          currentEmail={currentUser.email || userProfile?.email || ''}
          uid={currentUser.uid}
          onClose={() => setShowChangeEmail(false)}
          onSuccess={() => { setShowChangeEmail(false); refreshUserProfile(); }}
        />
      )}
    </div>
  );
}
