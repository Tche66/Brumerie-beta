import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/userService';

const API_BASE = 'https://brumerie-beta-production.up.railway.app';

interface FilleulInfo {
  id: string;
  name: string;
  photo: string | null;
  dateDebut: string;
  dateFin: string;
  actif: boolean;
  gainMoisCourant: number;
  gainTotal: number;
}

interface AffiliateDashboard {
  totalEarnedAllTime: number;
  totalThisMonth: number;
  plafondParFilleul: number;
  tauxCommission: number;
  filleuls: FilleulInfo[];
  moisCourant: string;
}

function generateAffiliateCode(name: string): string {
  const cleanName = (name || 'BRU').split(' ')[0].toUpperCase().slice(0, 5);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}-${rand}`;
}

interface AffiliatePageProps {
  onBack: () => void;
}

export function AffiliatePage({ onBack }: AffiliatePageProps) {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<'programme' | 'filleuls'>('programme');
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acceptedConditions, setAcceptedConditions] = useState(false);

  const hasCode = !!(userProfile as any)?.referralCode;
  const code = (userProfile as any)?.referralCode || '';
  const shareLink = `https://brumerie.com/join?ref=${code}`;

  useEffect(() => {
    if (hasCode && currentUser) loadDashboard();
  }, [hasCode, currentUser]);

  const loadDashboard = async () => {
    if (!currentUser) return;
    setLoadingDashboard(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/affiliate/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setDashboard(data.data);
    } catch {}
    finally { setLoadingDashboard(false); }
  };

  const activateAffiliate = async () => {
    if (!currentUser || !userProfile) return;
    setActivating(true);
    try {
      const newCode = generateAffiliateCode(userProfile.name);
      await updateUserProfile(currentUser.uid, { referralCode: newCode });
      await refreshUserProfile();
    } catch {}
    finally { setActivating(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAffiliate = () => {
    const text = `Rejoins Brumerie et vends en ligne ! Utilise mon code ${code} pour t'inscrire. ${shareLink}`;
    if (navigator.share) {
      navigator.share({ title: 'Brumerie — Deviens vendeur', text, url: shareLink });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 pt-14">
          <button onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-[16px] font-black text-slate-900">Programme Affiliation</h1>
        </div>

        {hasCode && (
          <div className="flex px-4 pb-2 gap-2">
            <button onClick={() => setTab('programme')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'programme' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
              Programme
            </button>
            <button onClick={() => setTab('filleuls')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'filleuls' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
              Mes Filleuls
            </button>
          </div>
        )}
      </div>

      {/* Tab Programme */}
      {tab === 'programme' && (
        <div className="px-4 py-6 space-y-5">
          {/* Hero */}
          <div className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #065F46, #16A34A)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}/>
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>
                </svg>
              </div>
              <h2 className="text-white font-black text-[18px] mb-2">Gagne de l'argent en recrutant des vendeurs</h2>
              <p className="text-white/80 text-[12px] font-medium">
                Invite des vendeurs sur Brumerie et gagne 20% de la commission sur chacune de leurs ventes pendant 12 mois.
              </p>
            </div>
          </div>

          {/* Avantages */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Comment ca marche</h3>
            {[
              { icon: '1', title: 'Partage ton code', desc: 'Envoie ton code unique a des vendeurs potentiels' },
              { icon: '2', title: 'Ils s\'inscrivent', desc: 'Le vendeur entre ton code lors de son inscription' },
              { icon: '3', title: 'Tu gagnes', desc: '20% de la commission Brumerie sur chaque vente de ton filleul' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-slate-50 rounded-2xl p-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-[12px] flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <p className="text-[12px] font-black text-slate-800">{step.title}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Conditions */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-2">Conditions</h3>
            <ul className="space-y-1.5">
              {[
                'Commission : 20% de la commission Brumerie (8%) sur les ventes du filleul',
                'Plafond : 50 000 FCFA par mois par filleul',
                'Duree : 12 mois a partir de l\'inscription du filleul',
                'Declenchement : uniquement sur ventes completees (pas a l\'inscription)',
                'Paiement : mensuel, vire sur ton compte mobile money',
              ].map((c, i) => (
                <li key={i} className="text-[10px] text-amber-700 font-medium flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>{c}
                </li>
              ))}
            </ul>
          </div>

          {/* Activation / Code */}
          {!hasCode ? (
            <div className="space-y-3">
              <label className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4 cursor-pointer active:bg-slate-100 transition-all">
                <input type="checkbox" checked={acceptedConditions} onChange={e => setAcceptedConditions(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded-lg accent-emerald-600"/>
                <span className="text-[11px] font-bold text-slate-700">
                  J'accepte les conditions du programme d'affiliation vendeur Brumerie
                </span>
              </label>
              <button onClick={activateAffiliate}
                disabled={!acceptedConditions || activating}
                className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-40 shadow-xl shadow-emerald-200"
                style={{ background: 'linear-gradient(135deg, #16A34A, #065F46)' }}>
                {activating ? 'Activation...' : 'Activer mon programme d\'affiliation'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Ton code affiliation</p>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-white text-emerald-800 px-4 py-3 rounded-xl text-[18px] font-black tracking-widest text-center border border-emerald-200">
                    {code}
                  </code>
                  <button onClick={copyCode}
                    className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {copied ? 'Copie !' : 'Copier'}
                  </button>
                </div>
                <button onClick={shareAffiliate}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                  Partager mon lien d'invitation
                </button>
              </div>

              {/* Stats rapides */}
              {dashboard && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
                    <p className="text-[20px] font-black text-emerald-600">{dashboard.totalThisMonth.toLocaleString()}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">FCFA ce mois</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
                    <p className="text-[20px] font-black text-slate-800">{dashboard.filleuls.length}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Filleuls actifs</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Filleuls */}
      {tab === 'filleuls' && (
        <div className="px-4 py-6 space-y-4">
          {loadingDashboard ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"/>
            </div>
          ) : !dashboard || dashboard.filleuls.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>
                </svg>
              </div>
              <p className="text-[13px] font-black text-slate-700">Aucun filleul pour l'instant</p>
              <p className="text-[11px] text-slate-400 mt-1">Partage ton code pour recruter tes premiers vendeurs</p>
              <button onClick={() => setTab('programme')}
                className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">
                Voir mon code
              </button>
            </div>
          ) : (
            <>
              {/* Recap gains */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[16px] font-black text-emerald-700">{dashboard.totalThisMonth.toLocaleString()}</p>
                    <p className="text-[7px] font-bold text-slate-500 uppercase">Ce mois</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-black text-slate-800">{dashboard.totalEarnedAllTime.toLocaleString()}</p>
                    <p className="text-[7px] font-bold text-slate-500 uppercase">Total gagne</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-black text-violet-700">{dashboard.filleuls.filter(f => f.actif).length}</p>
                    <p className="text-[7px] font-bold text-slate-500 uppercase">Actifs</p>
                  </div>
                </div>
              </div>

              {/* Liste filleuls */}
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tes filleuls ({dashboard.filleuls.length})</h3>
              <div className="space-y-2">
                {dashboard.filleuls.map((filleul) => (
                  <div key={filleul.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                      {filleul.photo ? (
                        <img src={filleul.photo} alt="" className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-[12px]">
                          {filleul.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-black text-slate-800 truncate">{filleul.name}</p>
                        {filleul.actif ? (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[7px] font-black rounded-md">ACTIF</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[7px] font-black rounded-md">EXPIRE</span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium">
                        Expire le {new Date(filleul.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-black text-emerald-600">{filleul.gainMoisCourant.toLocaleString()}</p>
                      <p className="text-[7px] text-slate-400 font-bold">FCFA/mois</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
