import React, { useState } from 'react';
import { ChangeEmailModal } from '@/components/ChangeEmailModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MOBILE_PAYMENT_METHODS, PaymentInfo } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { PaymentLogo } from '@/components/PaymentLogo';
import {
  ChevronLeft, ChevronRight, User, Mail, Shield, RefreshCw,
  Moon, Sun, MapPin, Truck, Users, UserPlus, ShieldCheck,
  Download, HelpCircle, Star, MessageCircle, FileText, Info,
  LogOut, Lock, Store, DollarSign, BookOpen, Monitor, Activity,
  File, X
} from 'lucide-react';

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
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors text-left">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-slate-700'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      {badge && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-gray-800 dark:bg-gray-600 mr-1">
          {badge}
        </span>
      )}
      {right}
      {!danger && (
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
      )}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 mb-2">{title}</p>
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
        {children}
      </div>
    </div>
  );
}

function LockedItem({ label, sublabel, onNavigate }: { label: string; sublabel: string; onNavigate: (p: string) => void }) {
  return (
    <button onClick={() => onNavigate('verification')}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left opacity-60">
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Lock size={16} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
        Premium
      </span>
    </button>
  );
}

export function SettingsPage({ onBack, onNavigate, role = 'seller' }: SettingsPageProps) {
  const { currentUser, userProfile, signOut, refreshUserProfile } = useAuth();
  const { toggleTheme, isDark } = useTheme();
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-32">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 px-4 pt-12 pb-5 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Parametres</h1>
        </div>

        {/* Profile card */}
        <button onClick={() => onNavigate('profile')}
          className="mt-4 w-full flex items-center gap-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-3.5 active:scale-[0.99] transition-transform text-left">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-600 flex-shrink-0">
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-base">{userProfile?.name?.charAt(0)?.toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{userProfile?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isBuyer ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                {isBuyer ? 'Acheteur' : 'Vendeur'}
              </span>
              {isPremium && <span className="text-[10px] font-medium text-amber-600">Premium</span>}
              {isVerified && !isPremium && <span className="text-[10px] font-medium text-blue-600">Verifie</span>}
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </button>
      </div>

      <div className="px-4 pt-5">

        {/* Apparence */}
        <Section title="Apparence">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              {isDark ? <Moon size={16} className="text-amber-500" /> : <Sun size={16} className="text-gray-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Mode sombre</p>
              <p className="text-xs text-gray-500 mt-0.5">{isDark ? 'Active' : 'Desactive'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
              style={{ background: isDark ? '#059669' : '#D1D5DB' }}>
              <div className="w-5 h-5 bg-white rounded-full shadow-sm absolute top-[2px] transition-all"
                style={{ left: isDark ? '22px' : '2px' }}/>
            </button>
          </div>
        </Section>

        {/* Compte */}
        <Section title="Compte">
          <SettingItem
            icon={<User size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Modifier mon profil"
            sublabel="Photo, nom, bio, quartier"
            onClick={() => onNavigate('edit-profile')}
          />
          <SettingItem
            icon={<Mail size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Email"
            sublabel={userProfile?.email || ''}
            onClick={() => setShowChangeEmail(true)}
          />
          <SettingItem
            icon={<Shield size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Verification & Abonnement"
            sublabel={isPremium ? 'Premium actif' : isVerified ? 'Verifie — passe au Premium' : 'Fais verifier ton identite'}
            onClick={() => onNavigate('verification')}
            badge={isPremium ? 'Premium' : isVerified ? 'Verifie' : undefined}
          />
          <SettingItem
            icon={<RefreshCw size={16} className="text-gray-600 dark:text-gray-300" />}
            label={isBuyer ? 'Passer en mode Vendeur' : 'Passer en mode Acheteur'}
            sublabel={isBuyer ? 'Publie et vends tes articles' : 'Explorer et acheter'}
            onClick={() => onNavigate(isBuyer ? 'switch-to-seller' : 'switch-to-buyer')}
          />
        </Section>

        {/* Paiements */}
        {!isBuyer && (
          <Section title="Paiements Mobile Money">
            <div className="px-4 py-3.5">
              {paymentMethods.length > 0 && (
                <div className="space-y-2 mb-3">
                  {paymentMethods.map((pm, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2.5">
                      {(() => { const m = MOBILE_PAYMENT_METHODS.find(x => x.id === pm.method); return m ? <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={24}/> : null; })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{pm.holderName}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{pm.phone}</p>
                      </div>
                      <button onClick={() => handleDeletePaymentMethod(idx)} className="text-red-400 active:scale-90 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!addingPayment ? (
                <button onClick={() => setAddingPayment(true)}
                  className="w-full py-3 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 text-xs font-medium active:scale-[0.98] transition-transform">
                  + Ajouter un moyen de paiement
                </button>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-slate-600">
                  <div className="grid grid-cols-2 gap-2">
                    {MOBILE_PAYMENT_METHODS.map(m => (
                      <button key={m.id} onClick={() => setNewPM(p => ({ ...p, method: m.id }))}
                        className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${newPM.method === m.id ? 'border-emerald-500 bg-white dark:bg-slate-600' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-500'}`}>
                        <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={18}/>{m.name}
                      </button>
                    ))}
                  </div>
                  <input value={newPM.phone} onChange={e => setNewPM(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Numero" type="tel"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:border-emerald-500"/>
                  <input value={newPM.holderName} onChange={e => setNewPM(p => ({ ...p, holderName: e.target.value }))}
                    placeholder="Nom du titulaire"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:border-emerald-500"/>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingPayment(false)} className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 font-medium text-xs">Annuler</button>
                    <button onClick={handleSavePaymentMethod} disabled={savingPM || !newPM.phone.trim() || !newPM.holderName.trim()}
                      className="flex-[2] py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-xs disabled:opacity-40">
                      {savingPM ? '...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Outils vendeur */}
        {!isBuyer && (
          <Section title="Outils vendeur">
            {isPremium ? (
              <>
                <SettingItem
                  icon={<Store size={16} className="text-gray-600 dark:text-gray-300" />}
                  label="Personnaliser ma boutique"
                  sublabel="Slogan, categories, reseaux sociaux"
                  onClick={() => onNavigate('shop-customize')}
                />
                <SettingItem
                  icon={<DollarSign size={16} className="text-gray-600 dark:text-gray-300" />}
                  label="Ma Comptabilite"
                  sublabel="Recettes, depenses, benefice net"
                  onClick={() => onNavigate('compta')}
                />
                <SettingItem
                  icon={<BookOpen size={16} className="text-gray-600 dark:text-gray-300" />}
                  label="Carnet Clients"
                  sublabel="Mini-CRM, relance WhatsApp"
                  onClick={() => onNavigate('carnet-clients')}
                />
                <SettingItem
                  icon={<Monitor size={16} className="text-gray-600 dark:text-gray-300" />}
                  label="Catalogue WhatsApp"
                  sublabel="Partage tes articles en 1 clic"
                  onClick={() => onNavigate('catalogue')}
                />
                <SettingItem
                  icon={<Activity size={16} className="text-gray-600 dark:text-gray-300" />}
                  label="Calculateur de Marge"
                  sublabel="Verifie ta rentabilite"
                  onClick={() => onNavigate('marge')}
                />
                <SettingItem
                  icon={<File size={16} className="text-gray-600 dark:text-gray-300" />}
                  label="Journal de Dettes"
                  sublabel="Suivi ventes a credit"
                  onClick={() => onNavigate('dettes')}
                />
              </>
            ) : (
              <>
                <LockedItem label="Personnaliser ma boutique" sublabel="Slogan, categories, reseaux" onNavigate={onNavigate}/>
                <LockedItem label="Outils business" sublabel="Compta, CRM, Catalogue, Marge, Dettes" onNavigate={onNavigate}/>
              </>
            )}
          </Section>
        )}

        {/* Livraison */}
        <Section title="Livraison">
          {userProfile?.awAddressCode ? (
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm font-mono">{userProfile.awAddressCode}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mon adresse numerique</p>
                </div>
                <a href={`https://addressweb.brumerie.com/${userProfile.awAddressCode}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-gray-600 bg-white dark:bg-slate-600 dark:text-gray-300 border border-gray-200 dark:border-slate-500 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                  Voir
                </a>
              </div>
            </div>
          ) : (
            <SettingItem
              icon={<MapPin size={16} className="text-blue-500" />}
              label="Creer mon adresse"
              sublabel="Pour recevoir des livraisons"
              onClick={() => onNavigate('edit-profile')}
            />
          )}
          {!(userProfile as any)?.deliveryCGUAccepted ? (
            <SettingItem
              icon={<Truck size={16} className="text-orange-500" />}
              label="Devenir Livreur"
              sublabel="Livre dans ton quartier et gagne"
              onClick={() => onNavigate('become-deliverer')}
            />
          ) : (
            <SettingItem
              icon={<Truck size={16} className="text-orange-500" />}
              label="Mon espace livreur"
              sublabel="Missions et gains"
              onClick={() => onNavigate('deliverer-dashboard')}
            />
          )}
          <SettingItem
            icon={<Users size={16} className="text-emerald-600" />}
            label="Livreurs disponibles"
            sublabel="Consulter les profils des livreurs"
            onClick={() => onNavigate('deliverers-list')}
          />
        </Section>

        {/* Communaute */}
        <Section title="Communaute">
          <SettingItem
            icon={<Users size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Parrainage"
            sublabel={`${userProfile?.referralCount || 0} ami${(userProfile?.referralCount || 0) > 1 ? 's' : ''} invite${(userProfile?.referralCount || 0) > 1 ? 's' : ''}`}
            onClick={() => onNavigate('referral')}
          />
          <SettingItem
            icon={<UserPlus size={16} className="text-emerald-600" />}
            label="Affiliation vendeur"
            sublabel="Gagne 20% sur les ventes de tes filleuls"
            onClick={() => onNavigate('affiliate')}
          />
          <SettingItem
            icon={<ShieldCheck size={16} className="text-red-500" />}
            label="Anti-Arnaque"
            sublabel="Signalement et liste noire"
            onClick={() => onNavigate('trust')}
          />
          <SettingItem
            icon={<Download size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Installer l'app"
            sublabel="Ajouter Brumerie a l'ecran d'accueil"
            onClick={() => window.open('/telecharger', '_blank', 'noopener,noreferrer')}
          />
        </Section>

        {/* Aide */}
        <Section title="Aide">
          <SettingItem
            icon={<HelpCircle size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Guide"
            sublabel="Comment utiliser Brumerie"
            onClick={() => onNavigate('guide')}
          />
          <SettingItem
            icon={<Star size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Suggerer un quartier ou categorie"
            sublabel="Ajoute ce qui manque sur Brumerie"
            onClick={() => onNavigate('suggestions')}
          />
          <SettingItem
            icon={<MessageCircle size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Support"
            sublabel="Une question ? Contacte-nous"
            onClick={() => onNavigate('support')}
          />
          <SettingItem
            icon={<FileText size={16} className="text-gray-600 dark:text-gray-300" />}
            label="Legal"
            sublabel="CGU, confidentialite, ARTCI"
            onClick={() => onNavigate('terms')}
          />
          <SettingItem
            icon={<Info size={16} className="text-gray-600 dark:text-gray-300" />}
            label="A propos"
            sublabel="Brumerie — Social Commerce, Cote d'Ivoire"
            onClick={() => onNavigate('about')}
          />
        </Section>

        {/* Admin */}
        {currentUser?.uid === ((import.meta as any).env?.VITE_ADMIN_UID || '__NONE__') && (
          <div className="mb-5">
            <button onClick={() => onNavigate('admin')}
              className="w-full py-3 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 font-medium text-xs active:scale-[0.98] transition-transform">
              Administration
            </button>
          </div>
        )}

        {/* Deconnexion */}
        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-red-100 dark:border-red-900/30 mb-6">
          <SettingItem
            icon={<LogOut size={16} className="text-red-500" />}
            label="Se deconnecter"
            onClick={() => setShowSignOutModal(true)}
            danger
          />
        </div>

        <p className="text-center text-[10px] font-medium text-gray-300 dark:text-gray-600 mb-4">
          Brumerie v1.0 — Cote d'Ivoire
        </p>
      </div>

      {/* Footer pro */}
      <Footer onNavigate={onNavigate} />

      {/* Modals */}
      <ConfirmModal
        visible={showSignOutModal}
        title="Se deconnecter ?"
        message="Tu devras te reconnecter pour acceder a ton compte."
        confirmLabel="Se deconnecter"
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
