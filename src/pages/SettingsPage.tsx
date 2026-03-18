// src/pages/SettingsPage.tsx — Sprint 5 fix
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

function SettingItem({ icon, label, sublabel, onClick, danger, badge, badgeBlue }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  onClick: () => void; danger?: boolean; badge?: string; badgeBlue?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 active:bg-slate-100 transition-all text-left group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 transition-transform group-active:scale-90 ${danger ? 'bg-red-50' : 'bg-slate-50'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold tracking-tight ${danger ? 'text-red-500' : 'text-slate-900'}`}>{label}</p>
        {sublabel && <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      {badge && (
        <span className="text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg mr-1 uppercase tracking-widest text-white bg-[#1D9BF0] shadow-blue-100">
          {badge}
        </span>
      )}
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className={danger ? 'text-red-200' : 'text-slate-200'}>
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="px-6 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 divide-y divide-slate-50">
        {children}
      </div>
    </div>
  );
}

export function SettingsPage({ onBack, onNavigate, role = 'seller' }: SettingsPageProps) {
  const { currentUser, userProfile, signOut, refreshUserProfile } = useAuth();
  const isBuyer = role === 'buyer';
    const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // ── État paiement mobile ──────────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<PaymentInfo[]>(
    userProfile?.defaultPaymentMethods || []
  );
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPM, setNewPM] = useState({ method: 'wave', phone: '', holderName: '' });
  const [savingPM, setSavingPM] = useState(false);

  // Sync depuis Firestore au chargement pour avoir les données fraîches
  React.useEffect(() => {
    refreshUserProfile().then(() => {
      setPaymentMethods(userProfile?.defaultPaymentMethods || []);
    });
  }, []);

  const handleSavePaymentMethod = async () => {
    if (!currentUser || !newPM.phone.trim() || !newPM.holderName.trim()) return;
    setSavingPM(true);
    const updated = [...paymentMethods, {
      method: newPM.method,
      phone: newPM.phone.trim(),
      holderName: newPM.holderName.trim(),
    }];
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
    <div className="min-h-screen bg-slate-50/50 pb-32 font-sans">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-bold text-sm uppercase tracking-widest text-slate-900">Paramètres</h1>
      </div>

      <div className="px-5 pt-8">

        {/* Carte profil cliquable */}
        <button onClick={() => onNavigate('profile')}
          className="w-full bg-white rounded-[2.5rem] p-6 mb-10 flex items-center gap-5 border border-slate-100 shadow-2xl shadow-slate-200/40 active:scale-[0.98] transition-all text-left">
          <div className="w-16 h-16 rounded-[1.8rem] overflow-hidden bg-slate-100 border-4 border-white shadow-inner flex-shrink-0">
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center">
                  <span className="text-slate-500 font-black text-2xl">{userProfile?.name?.charAt(0)?.toUpperCase()}</span>
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-base truncate tracking-tight">{userProfile?.name}</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter truncate">{userProfile?.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white ${isBuyer ? 'bg-blue-500' : 'bg-green-600'}`}>
                {isBuyer ? 'Acheteur' : 'Vendeur'}
              </span>
              {userProfile?.neighborhood && (
                <span className="text-[8px] text-slate-400 font-bold">{userProfile.neighborhood}</span>
              )}
            </div>
          </div>
          {userProfile?.isVerified && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: '#16A34A', boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-slate-200 ml-1 flex-shrink-0">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Mon Compte */}
        <SettingSection title="Mon compte">
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            label="Modifier mon profil"
            sublabel="Nom, photo, téléphone, quartier"
            onClick={() => onNavigate('edit-profile')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            label="Changer d'adresse email"
            sublabel={userProfile?.email || 'Email actuel'}
            onClick={() => setShowChangeEmail(true)}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9BF0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
            label="Badge Vendeur Vérifié"
            sublabel={userProfile?.isVerified ? 'Ton badge est actif' : 'Boost ta crédibilité pour 3 000 FCFA'}
            onClick={() => onNavigate('verification')}
            badge={userProfile?.isVerified ? '✓ ACTIF' : undefined}
            badgeBlue
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
            label="Parrainage"
            sublabel={`Invite des amis · ${userProfile?.referralCount || 0} invités rejoints`}
            onClick={() => onNavigate('referral')}
            badge={(userProfile?.referralCount || 0) >= 10 ? 'ACTIF' : undefined}
            badgeBlue={(userProfile?.referralCount || 0) >= 10}
          />
          {/* Livreur partenaire */}
          {userProfile?.role !== 'livreur' ? (
            <SettingItem
              icon={<span style={{ fontSize: 20 }}>🛵</span>}
              label="Devenir Livreur Partenaire"
              sublabel="Livre dans ton quartier et gagne de l'argent"
              onClick={() => onNavigate('become-deliverer')}
            />
          ) : (
            <SettingItem
              icon={<span style={{ fontSize: 20 }}>🛵</span>}
              label="Mon espace livreur"
              sublabel="Voir mes missions et mes gains"
              onClick={() => onNavigate('deliverer-dashboard')}
              badge="ACTIF"
              badgeBlue
            />
          )}
          {/* Boutique personnalisable — vérifié/premium uniquement */}
          {(userProfile?.isVerified || userProfile?.isPremium) && (
            <SettingItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="3"/></svg>}
              label="Personnaliser ma boutique"
              sublabel="Bannière, couleur, slogan"
              onClick={() => onNavigate('shop-customize')}
            />
          )}
        </SettingSection>

        {/* Paiement mobile — vendeurs seulement */}
        {!isBuyer && (
          <SettingSection title="Moyens de paiement mobile">
            <div className="px-4 py-4 space-y-3">
              {paymentMethods.map((pm, idx) => {
                const m = MOBILE_PAYMENT_METHODS.find(x => x.id === pm.method);
                return (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                    {m && <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={36} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[11px]">{m?.name}</p>
                      <p className="text-slate-500 text-[10px] font-bold">{pm.phone} · {pm.holderName}</p>
                    </div>
                    <button onClick={() => handleDeletePaymentMethod(idx)}
                      className="w-7 h-7 bg-red-50 rounded-xl flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                );
              })}
              {!addingPayment ? (
                <button onClick={() => setAddingPayment(true)}
                  className="w-full flex items-center justify-center gap-2 bg-green-50 border-2 border-dashed border-green-200 rounded-2xl py-4 text-green-700 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Ajouter un numéro
                </button>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveau moyen de paiement</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MOBILE_PAYMENT_METHODS.map(m => (
                      <button key={m.id} onClick={() => setNewPM(p => ({ ...p, method: m.id }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${newPM.method === m.id ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50'}`}>
                        <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={28} />
                        <span className="text-[10px] font-black text-slate-700">{m.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                  <input value={newPM.phone} onChange={e => setNewPM(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Numéro (ex: 0700000000)" type="tel"
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[12px] border-2 border-transparent focus:border-green-400 outline-none font-mono"/>
                  <input value={newPM.holderName} onChange={e => setNewPM(p => ({ ...p, holderName: e.target.value }))}
                    placeholder="Nom du titulaire"
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[12px] border-2 border-transparent focus:border-green-400 outline-none"/>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingPayment(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase">Annuler</button>
                    <button onClick={handleSavePaymentMethod} disabled={savingPM || !newPM.phone.trim() || !newPM.holderName.trim()}
                      className="flex-1 py-3 rounded-xl bg-green-600 text-white font-black text-[10px] uppercase disabled:opacity-40 active:scale-95 transition-all">
                      {savingPM ? '...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SettingSection>
        )}

        {/* Changer de mode */}
        <SettingSection title="Mon mode">
          <SettingItem
            icon={isBuyer
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            }
            label={isBuyer ? 'Passer en mode Vendeur' : 'Passer en mode Acheteur'}
            sublabel={isBuyer ? 'Publie tes articles et gère ta boutique' : 'Repasser en mode exploration'}
            onClick={() => onNavigate(isBuyer ? 'switch-to-seller' : 'switch-to-buyer')}
          />
          {/* Mode livreur — UNIQUEMENT si déjà inscrit comme livreur partenaire */}
          {(userProfile?.role === 'livreur' || userProfile?.deliveryAvailable !== undefined) && (
            <SettingItem
              icon={<span style={{ fontSize: 20 }}>🛵</span>}
              label="Passer en mode Livreur"
              sublabel="Accéder à ton espace missions et gains"
              onClick={async () => {
                if (currentUser && userProfile?.role !== 'livreur') {
                  const { doc, updateDoc } = await import('firebase/firestore');
                  const { db } = await import('@/config/firebase');
                  await updateDoc(doc(db, 'users', currentUser.uid), { role: 'livreur' });
                }
                onNavigate('deliverer-dashboard');
              }}
              badge="LIVREUR"
              badgeBlue
            />
          )}
        </SettingSection>

        {/* Informations */}
        {/* ══ SECTION ADDRESS-WEB ══ */}
        <SettingSection title="📍 Mon adresse Address-Web">
          <div className="space-y-3">
            {userProfile?.awAddressCode ? (
              <div className="flex items-center justify-between p-4 bg-sky-50 rounded-2xl border border-sky-100">
                <div>
                  <p className="font-black text-sky-800 text-[13px] font-mono">{userProfile.awAddressCode}</p>
                  <p className="text-sky-600 text-[10px] font-bold mt-0.5">Ton adresse numérique Brumerie</p>
                </div>
                <a href={`https://addressweb.brumerie.com/${userProfile.awAddressCode}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-black text-sky-700 bg-white border border-sky-200 px-3 py-2 rounded-xl active:scale-90 transition-all">
                  Voir →
                </a>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="font-black text-amber-800 text-[12px] mb-1">⚠️ Tu n'as pas encore d'adresse</p>
                <p className="text-amber-700 text-[10px] font-medium leading-relaxed mb-3">
                  Sans adresse numérique, les livreurs ne peuvent pas te localiser précisément.
                  Crée ta gratuitement en 1 minute sur Address-Web.
                </p>
                <a href="https://addressweb.brumerie.com/creer" target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3 text-center rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#0EA5E9,#0369A1)' }}>
                  📍 Créer mon adresse gratuite
                </a>
              </div>
            )}

            {/* Explication complète */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
              <p className="font-black text-slate-800 text-[11px]">Pourquoi une adresse numérique ?</p>
              <div className="space-y-1.5">
                {[
                  { icon: '🏠', text: 'En Afrique, 60% des rues n\'ont pas de nom officiel' },
                  { icon: '📦', text: 'Les livreurs ne peuvent pas trouver ton domicile sans repère GPS' },
                  { icon: '📍', text: 'Ton code AW-ABJ-XXXXX = tes coordonnées GPS exactes + un repère' },
                  { icon: '🆓', text: 'Gratuit, universel, utilisable en dehors de Brumerie' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <span className="text-[13px] flex-shrink-0">{icon}</span>
                    <p className="text-slate-600 text-[10px] font-medium leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lien vers Address-Web */}
            <a href="https://addressweb.brumerie.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 active:scale-95 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-xl">🌍</span>
                <div>
                  <p className="font-black text-slate-800 text-[12px]">Address-Web Africa</p>
                  <p className="text-slate-400 text-[9px]">addressweb.brumerie.com</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </SettingSection>

        <SettingSection title="Informations">
          <SettingItem icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            label="Confidentialité" sublabel="Protection de tes données" onClick={() => onNavigate('privacy')}/>
          <SettingItem icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
            label="Conditions d'utilisation" sublabel="Les règles de Brumerie" onClick={() => onNavigate('terms')}/>
          <SettingItem icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
            label="À propos" sublabel="MVP 1.0 · Fait à Abidjan " onClick={() => onNavigate('about')}/>
        </SettingSection>

        {/* Assistance */}
        <SettingSection title="Assistance">
          <SettingItem icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            label="Support & Aide" sublabel="Comment publier · Ajouter une photo de profil"
            onClick={() => onNavigate('support')}/>
          <GuideButton page="home" userId={currentUser?.uid} asSettingItem />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>}
            label="Guide utilisateur"
            sublabel="Toutes les fonctionnalités expliquées"
            onClick={() => onNavigate('guide')}
          />
          <SettingItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
            label="Télécharger l'app Android"
            sublabel="Installe Brumerie sur ton téléphone"
            onClick={() => window.open('/telecharger', '_blank', 'noopener,noreferrer')}
          />
        </SettingSection>

        {/* Bouton admin — visible uniquement si l'UID correspond */}
        {currentUser?.uid === ((import.meta as any).env?.VITE_ADMIN_UID || '__NONE__') && (
          <div className="px-2 mb-8">
            <button onClick={() => onNavigate('admin')}
              className="w-full py-3 rounded-2xl border border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
              ⚙️ Administration Brumerie
            </button>
          </div>
        )}
        {/* Déconnexion */}
        <div className="mt-6 px-2">
          <button onClick={() => setShowSignOutModal(true)}
            className="w-full py-5 rounded-[2rem] bg-red-50 border-2 border-red-100 text-red-500 font-black uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all">
            Se déconnecter
          </button>
        </div>

        <p className="text-center text-[9px] font-black text-slate-300 mt-10 mb-4 uppercase tracking-[0.3em]">
          Brumerie ® 2026 · Abidjan 
        </p>
      </div>

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
