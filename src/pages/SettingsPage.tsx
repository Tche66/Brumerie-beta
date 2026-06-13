// src/pages/SettingsPage.tsx — Paramètres Brumerie
import React, { useState } from 'react';
import { ChangeEmailModal } from '@/components/ChangeEmailModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { MOBILE_PAYMENT_METHODS, PaymentInfo } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { PaymentLogo } from '@/components/PaymentLogo';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  role?: 'buyer' | 'seller';
}

function SettingItem({ icon, label, sublabel, onClick, danger, badge, right }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  onClick: () => void; danger?: boolean; badge?: string;
  right?: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 px-5 py-4 active:bg-slate-50 transition-all text-left">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold ${danger ? 'text-red-500' : 'text-slate-900'}`}>{label}</p>
        {sublabel && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      {badge && (
        <span className="text-[8px] font-black px-2 py-0.5 rounded-full text-white bg-slate-900 uppercase tracking-wider mr-1">
          {badge}
        </span>
      )}
      {right}
      {!danger && (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="text-slate-300 flex-shrink-0">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-5 mb-2">{title}</p>
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 divide-y divide-slate-50">
        {children}
      </div>
    </div>
  );
}

function LockedItem({ label, sublabel, onNavigate }: { label: string; sublabel: string; onNavigate: (p: string) => void }) {
  return (
    <button onClick={() => onNavigate('verification')}
      className="w-full flex items-center gap-3.5 px-5 py-4 active:bg-slate-50 transition-all text-left opacity-60">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-500">{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>
      </div>
      <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
        Premium
      </span>
    </button>
  );
}

export function SettingsPage({ onBack, onNavigate, role = 'seller' }: SettingsPageProps) {
  const { currentUser, userProfile, signOut, refreshUserProfile } = useAuth();
  const isBuyer = role === 'buyer';
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const isVerified = !!(userProfile?.isVerified);
  const isPremium  = !!(userProfile?.isPremium);

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

      {/* ── Header dark ── */}
      <div className="bg-slate-900 px-5 pt-12 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-all">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="font-black text-[15px] uppercase tracking-widest text-white">Paramètres</h1>
        </div>

        {/* Carte profil compacte */}
        <button onClick={() => onNavigate('profile')}
          className="mt-5 w-full flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 active:scale-[0.98] transition-all text-left">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">{userProfile?.name?.charAt(0)?.toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-[14px] truncate">{userProfile?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isBuyer ? 'bg-sky-500/20 text-sky-300' : 'bg-white/20 text-white/70'}`}>
                {isBuyer ? 'Acheteur' : 'Vendeur'}
              </span>
              {isPremium && <span className="text-[8px] font-black text-amber-400">Premium</span>}
              {isVerified && !isPremium && <span className="text-[8px] font-black text-sky-400">Vérifié</span>}
            </div>
          </div>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="text-white/30 flex-shrink-0">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="px-4 pt-5">

        {/* ══ COMPTE ═══════════════════════════════════════════ */}
        <Section title="Compte">
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            label="Modifier mon profil"
            sublabel="Photo, nom, bio, quartier"
            onClick={() => onNavigate('edit-profile')}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            label="Email"
            sublabel={userProfile?.email || ''}
            onClick={() => setShowChangeEmail(true)}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            label="Vérification & Abonnement"
            sublabel={isPremium ? 'Premium actif' : isVerified ? 'Vérifié — passe au Premium' : 'Fais vérifier ton identité'}
            onClick={() => onNavigate('verification')}
            badge={isPremium ? 'Premium' : isVerified ? 'Vérifié' : undefined}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>}
            label={isBuyer ? 'Passer en mode Vendeur' : 'Passer en mode Acheteur'}
            sublabel={isBuyer ? 'Publie et vends tes articles' : 'Explorer et acheter'}
            onClick={() => onNavigate(isBuyer ? 'switch-to-seller' : 'switch-to-buyer')}
          />
        </Section>

        {/* ══ PAIEMENTS ════════════════════════════════════════ */}
        {!isBuyer && (
          <Section title="Paiements Mobile Money">
            <div className="px-5 py-4">
              {paymentMethods.length > 0 && (
                <div className="space-y-2 mb-3">
                  {paymentMethods.map((pm, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                      {(() => { const m = MOBILE_PAYMENT_METHODS.find(x => x.id === pm.method); return m ? <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={24}/> : null; })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800">{pm.holderName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{pm.phone}</p>
                      </div>
                      <button onClick={() => handleDeletePaymentMethod(idx)} className="text-red-400 active:scale-90 p-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!addingPayment ? (
                <button onClick={() => setAddingPayment(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-[11px] font-bold active:scale-95 transition-all">
                  + Ajouter un moyen de paiement
                </button>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    {MOBILE_PAYMENT_METHODS.map(m => (
                      <button key={m.id} onClick={() => setNewPM(p => ({ ...p, method: m.id }))}
                        className={`flex items-center gap-2 py-2 px-3 rounded-lg border-2 text-[10px] font-bold transition-all ${newPM.method === m.id ? 'border-slate-900 bg-white' : 'border-slate-100 bg-white text-slate-500'}`}>
                        <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={18}/>{m.name}
                      </button>
                    ))}
                  </div>
                  <input value={newPM.phone} onChange={e => setNewPM(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Numéro" type="tel"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[12px] outline-none focus:border-slate-900"/>
                  <input value={newPM.holderName} onChange={e => setNewPM(p => ({ ...p, holderName: e.target.value }))}
                    placeholder="Nom du titulaire"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[12px] outline-none focus:border-slate-900"/>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingPayment(false)} className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-500 font-bold text-[10px]">Annuler</button>
                    <button onClick={handleSavePaymentMethod} disabled={savingPM || !newPM.phone.trim() || !newPM.holderName.trim()}
                      className="flex-[2] py-2.5 rounded-lg bg-slate-900 text-white font-bold text-[10px] disabled:opacity-40">
                      {savingPM ? '...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ══ OUTILS VENDEUR ══════════════════════════════════ */}
        {!isBuyer && (
          <Section title="Outils vendeur">
            {isPremium ? (
              <>
                <SettingItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
                  label="Personnaliser ma boutique"
                  sublabel="Slogan, catégories, réseaux sociaux"
                  onClick={() => onNavigate('shop-customize')}
                />
                <SettingItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
                  label="Ma Comptabilité"
                  sublabel="Recettes, dépenses, bénéfice net"
                  onClick={() => onNavigate('compta')}
                />
                <SettingItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
                  label="Carnet Clients"
                  sublabel="Mini-CRM, relance WhatsApp"
                  onClick={() => onNavigate('carnet-clients')}
                />
                <SettingItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
                  label="Catalogue WhatsApp"
                  sublabel="Partage tes articles en 1 clic"
                  onClick={() => onNavigate('catalogue')}
                />
                <SettingItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  label="Calculateur de Marge"
                  sublabel="Vérifie ta rentabilité"
                  onClick={() => onNavigate('marge')}
                />
                <SettingItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
                  label="Journal de Dettes"
                  sublabel="Suivi ventes à crédit"
                  onClick={() => onNavigate('dettes')}
                />
              </>
            ) : (
              <>
                <LockedItem label="Personnaliser ma boutique" sublabel="Slogan, catégories, réseaux" onNavigate={onNavigate}/>
                <LockedItem label="Outils business" sublabel="Compta, CRM, Catalogue, Marge, Dettes" onNavigate={onNavigate}/>
              </>
            )}
          </Section>
        )}

        {/* ══ LIVRAISON ═══════════════════════════════════════ */}
        <Section title="Livraison">
          {userProfile?.awAddressCode ? (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-black text-slate-800 text-[12px] font-mono">{userProfile.awAddressCode}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Mon adresse numérique</p>
                </div>
                <a href={`https://addressweb.brumerie.com/${userProfile.awAddressCode}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[9px] font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg active:scale-90">
                  Voir
                </a>
              </div>
            </div>
          ) : (
            <SettingItem
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
              label="Créer mon adresse"
              sublabel="Pour recevoir des livraisons"
              onClick={() => onNavigate('edit-profile')}
            />
          )}
          {!userProfile?.deliveryCGUAccepted ? (
            <SettingItem
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
              label="Devenir Livreur"
              sublabel="Livre dans ton quartier et gagne"
              onClick={() => onNavigate('become-deliverer')}
            />
          ) : (
            <SettingItem
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
              label="Mon espace livreur"
              sublabel="Missions et gains"
              onClick={() => onNavigate('deliverer-dashboard')}
            />
          )}
        </Section>

        {/* ══ COMMUNAUTÉ ══════════════════════════════════════ */}
        <Section title="Communauté">
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
            label="Parrainage"
            sublabel={`${userProfile?.referralCount || 0} ami${(userProfile?.referralCount || 0) > 1 ? 's' : ''} invité${(userProfile?.referralCount || 0) > 1 ? 's' : ''}`}
            onClick={() => onNavigate('referral')}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>}
            label="Anti-Arnaque"
            sublabel="Signalement et liste noire"
            onClick={() => onNavigate('trust')}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
            label="Installer l'app"
            sublabel="Ajouter Brumerie à l'écran d'accueil"
            onClick={() => window.open('/telecharger', '_blank', 'noopener,noreferrer')}
          />
        </Section>

        {/* ══ AIDE & INFOS ════════════════════════════════════ */}
        <Section title="Aide">
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            label="Guide"
            sublabel="Comment utiliser Brumerie"
            onClick={() => onNavigate('guide')}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
            label="Support"
            sublabel="Une question ? Contacte-nous"
            onClick={() => onNavigate('support')}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
            label="Légal"
            sublabel="CGU, confidentialité, ARTCI"
            onClick={() => onNavigate('terms')}
          />
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            label="À propos"
            sublabel="Brumerie — Social Commerce · Abidjan"
            onClick={() => onNavigate('about')}
          />
        </Section>

        {/* ══ Admin (caché) ══════════════════════════════════ */}
        {currentUser?.uid === ((import.meta as any).env?.VITE_ADMIN_UID || '__NONE__') && (
          <div className="mb-5">
            <button onClick={() => onNavigate('admin')}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-widest active:scale-95">
              Administration
            </button>
          </div>
        )}

        {/* ══ DÉCONNEXION ═════════════════════════════════════ */}
        <div className="bg-white rounded-2xl overflow-hidden border border-red-100 mb-6">
          <SettingItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            label="Se déconnecter"
            onClick={() => setShowSignOutModal(true)}
            danger
          />
        </div>

        <p className="text-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-4">
          Brumerie v1.0 · Abidjan, Côte d'Ivoire
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
