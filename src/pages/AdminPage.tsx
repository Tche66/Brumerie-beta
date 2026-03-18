// src/pages/AdminPage.tsx — Tableau de bord admin complet — Brumerie
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribePendingBoosts, subscribeAllBoosts, activateBoost, rejectBoost,
} from '@/services/boostService';
import {
  getAdminStats, subscribeAllUsers, banUser, unbanUser, setUserRole,
  forceVerifyUser, revokeVerification, subscribeAllProducts,
  adminDeleteProduct, adminHideProduct, subscribeAllOrders, forceResolveOrder,
  publishSystemBanner, subscribeAdminLogs, logAdminAction, getGlobalSettings,
  saveGlobalSettings, subscribeActiveBanners,
  sendAdminDirectMessage, broadcastNotificationToAll, toggleUserVerification,
} from '@/services/adminService';
import { adminChangeEmail } from '@/services/emailChangeService';
import { ProductBoost, BOOST_PLANS } from '@/types';
import { CountdownBadge } from '@/components/CountdownBadge';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getAuth } from 'firebase/auth';

const ADMIN_UID = (import.meta as any).env?.VITE_ADMIN_UID || '';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const fmtDate = (ts: any) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const timeLeft = (ts: any) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  return h > 24 ? `${Math.floor(h / 24)}j ${h % 24}h` : `${h}h ${Math.floor((diff % 3600000) / 60000)}m`;
};

type Tab = 'stats' | 'boosts' | 'users' | 'products' | 'orders' | 'broadcast' | 'settings' | 'logs';

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-amber-100 text-amber-800',
  active:           'bg-green-100 text-green-800',
  rejected:         'bg-red-100 text-red-700',
  completed:        'bg-blue-100 text-blue-800',
  refunded:         'bg-purple-100 text-purple-800',
  cancelled:        'bg-slate-100 text-slate-500',
  proof_submitted:  'bg-cyan-100 text-cyan-800',
  dispute:          'bg-red-200 text-red-900',
  pending_payment:  'bg-amber-100 text-amber-800',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-black text-[22px] ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${color}`}>{label}</span>;
}

interface AdminPageProps { onBack: () => void }

export function AdminPage({ onBack }: AdminPageProps) {
  const { currentUser } = useAuth();
  const isAdmin = !!(currentUser?.uid && ADMIN_UID && currentUser.uid === ADMIN_UID);

  const [tab, setTab] = useState<Tab>('stats');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [allBoosts, setAllBoosts] = useState<ProductBoost[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [activeBanners, setActiveBanners] = useState<any[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [boostFilter, setBoostFilter] = useState('pending');

  const [banReason, setBanReason] = useState('');
  const [banUserId, setBanUserId] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [orderTarget, setOrderTarget] = useState('');
  // Hero config
  const [heroTextInput, setHeroTextInput] = useState('Trouve ton bonheur à Babi 🤩');
  const [heroBannerFile, setHeroBannerFile] = useState<File | null>(null);
  const [heroBannerPreview, setHeroBannerPreview] = useState('');
  const [heroBannerHours, setHeroBannerHours] = useState('48');
  const [heroSaving, setHeroSaving] = useState(false);

  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerType, setBannerType] = useState<'info' | 'warning' | 'promo'>('promo');
  const [bannerHours, setBannerHours] = useState('24');
  const [bannerCta, setBannerCta] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<any>({});
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBoostId, setRejectBoostId] = useState('');

  // Message direct & badge
  const [msgTarget, setMsgTarget] = useState<{id:string;name:string}|null>(null);
  const [emailTarget, setEmailTarget] = useState<string|null>(null); // userId ouvert pour changer email
  const [newEmailInput, setNewEmailInput] = useState('');
  const [msgText, setMsgText] = useState('');
  const [badgeDays, setBadgeDays] = useState('30');
  // Broadcast notification
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastResult, setBroadcastResult] = useState<{sent:number;errors:number}|null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
  const logAction = useCallback(async (action: string, targetId: string, details?: string) => {
    if (currentUser?.uid) await logAdminAction(currentUser.uid, action, targetId, details);
  }, [currentUser]);

  // Charger hero config actuel
  useEffect(() => {
    getDoc(doc(db, 'system', 'homeConfig')).then((snap) => {
      if (snap.exists() && (snap.data() as any).heroText) setHeroTextInput((snap.data() as any).heroText);
    });
  }, []);

  // Auto-setup system/config si absent (nécessaire pour les règles Firestore isAdmin())
  useEffect(() => {
    if (!isAdmin || !currentUser?.uid) return;
    const ref = doc(db, 'system', 'config');
    getDoc(ref).then(snap => {
      if (!snap.exists()) {
        setDoc(ref, { adminUid: currentUser.uid }, { merge: true })
          .then(() => console.log('system/config créé automatiquement'))
          .catch(() => {});
      }
    }).catch(() => {});
  }, [isAdmin, currentUser?.uid]);

  useEffect(() => { if (!isAdmin) return; return subscribeAllBoosts(setAllBoosts); }, [isAdmin]);
  useEffect(() => { if (!isAdmin) return; return subscribeAllUsers(setUsers); }, [isAdmin]);
  useEffect(() => { if (!isAdmin) return; return subscribeAllProducts(setProducts); }, [isAdmin]);
  useEffect(() => { if (!isAdmin) return; return subscribeAllOrders(setOrders); }, [isAdmin]);
  useEffect(() => { if (!isAdmin) return; return subscribeAdminLogs(setLogs); }, [isAdmin]);
  useEffect(() => { if (!isAdmin) return; return subscribeActiveBanners(setActiveBanners); }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    getAdminStats()
      .then(setStats)
      .catch(err => {
        console.error('AdminStats error:', err);
        setStats({ totalUsers:0, totalSellers:0, verifiedSellers:0, totalProducts:0,
          activeProducts:0, totalOrders:0, totalBoostRevenue:0, totalVerifRevenue:0,
          newUsersToday:0, newUsersThisWeek:0, newProductsToday:0 });
      });
    getGlobalSettings()
      .then(s => { setGlobalSettings(s || {}); setSettingsDraft(s || {}); })
      .catch(() => { setGlobalSettings({}); setSettingsDraft({}); });
  }, [isAdmin]);

  const handleActivateBoost = async (id: string) => {
    setBusy(id);
    try { await activateBoost(id, currentUser!.uid); await logAction('BOOST_ACTIVATED', id); showToast('✅ Boost activé !'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleRejectBoost = async (id: string) => {
    setBusy(id);
    try { await rejectBoost(id, currentUser!.uid, rejectReason || 'Paiement non confirmé'); await logAction('BOOST_REJECTED', id, rejectReason); setRejectBoostId(''); setRejectReason(''); showToast('Boost refusé.'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleBan = async (userId: string) => {
    if (!banReason.trim()) { showToast('⚠️ Motif requis'); return; }
    setBusy(userId);
    try { await banUser(userId, banReason); await logAction('USER_BANNED', userId, banReason); setBanUserId(''); setBanReason(''); showToast('🚫 Banni'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleUnban = async (userId: string) => {
    setBusy(userId);
    try { await unbanUser(userId); await logAction('USER_UNBANNED', userId); showToast('✅ Débanni'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleForceVerify = async (userId: string) => {
    setBusy(userId);
    try { await forceVerifyUser(userId, currentUser!.uid); await logAction('USER_VERIFIED', userId); showToast('🏅 Badge accordé'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleRevokeVerif = async (userId: string) => {
    setBusy(userId);
    try { await revokeVerification(userId); await logAction('USER_UNVERIFIED', userId); showToast('Badge retiré'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleSetRole = async (userId: string, role: 'buyer' | 'seller') => {
    setBusy(userId);
    try { await setUserRole(userId, role); await logAction('USER_ROLE', userId, role); showToast(`Rôle → ${role}`); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    setBusy(productId);
    try { await adminDeleteProduct(productId); await logAction('PRODUCT_DELETED', productId); showToast('🗑 Supprimé'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleToggleHide = async (productId: string, hidden: boolean) => {
    setBusy(productId);
    try { await adminHideProduct(productId, !hidden); await logAction(hidden ? 'PRODUCT_SHOWN' : 'PRODUCT_HIDDEN', productId); showToast(hidden ? 'Produit visible' : 'Masqué'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleResolveOrder = async (orderId: string, resolution: 'completed' | 'refunded' | 'cancelled') => {
    if (!orderNote.trim()) { showToast('⚠️ Note requise'); return; }
    setBusy(orderId);
    try { await forceResolveOrder(orderId, resolution, orderNote, currentUser!.uid); await logAction('ORDER_RESOLVED', orderId, `${resolution}—${orderNote}`); setOrderNote(''); setOrderTarget(''); showToast(`✅ Commande → ${resolution}`); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };

  // ── Message direct admin ──
  const handleSendDirectMsg = async () => {
    if (!msgTarget || !msgText.trim()) { showToast('⚠️ Message vide'); return; }
    setBusy('msg_' + msgTarget.id);
    try {
      await sendAdminDirectMessage(msgTarget.id, msgTarget.name, msgText, currentUser!.uid);
      await logAction('ADMIN_MSG_SENT', msgTarget.id, msgText);
      setMsgTarget(null); setMsgText('');
      showToast('✅ Message envoyé + notification');
    } catch { showToast('❌ Erreur envoi'); } finally { setBusy(null); }
  };

  // ── Toggle badge ──
  const handleToggleBadge = async (userId: string, currentState: boolean) => {
    setBusy('badge_' + userId);
    try {
      await toggleUserVerification(userId, !currentState, currentUser!.uid, parseInt(badgeDays) || 30);
      showToast(!currentState ? `🏅 Badge activé (${badgeDays} jours)` : 'Badge désactivé');
    } catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };

  // ── Admin change email user ──
  const handleAdminChangeEmail = async (userId: string) => {
    if (!newEmailInput.includes('@')) { showToast('⚠️ Email invalide'); return; }
    setBusy('email_' + userId);
    try {
      const idToken = await getAuth().currentUser?.getIdToken() || '';
      const res = await adminChangeEmail(userId, newEmailInput.trim().toLowerCase(), idToken);
      if (res.success) {
        await logAction('EMAIL_CHANGED', userId, newEmailInput);
        setEmailTarget(null); setNewEmailInput('');
        showToast('✅ Email mis à jour');
      } else {
        showToast('❌ ' + (res.error || 'Erreur'));
      }
    } catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };

  // ── Broadcast notification ──
  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) { showToast('⚠️ Titre et message requis'); return; }
    if (!confirm(`Envoyer cette notification à TOUS les utilisateurs (${users.length}) ?`)) return;
    setBusy('broadcast');
    try {
      const result = await broadcastNotificationToAll(broadcastTitle, broadcastBody, currentUser!.uid);
      setBroadcastResult(result);
      setBroadcastTitle(''); setBroadcastBody('');
      showToast(`🔔 Envoyé à ${result.sent} users (${result.errors} erreurs)`);
    } catch { showToast('❌ Erreur broadcast'); } finally { setBusy(null); }
  };
  const saveHeroConfig = async () => {
    setHeroSaving(true);
    try {
      const updateData: any = { heroText: heroTextInput.trim() };
      if (heroBannerFile) {
        const { uploadToCloudinary } = await import('@/utils/uploadImage');
        const { Timestamp } = await import('firebase/firestore');
        const url = await uploadToCloudinary(heroBannerFile, 'brumerie_hero');
        updateData.heroBannerUrl = url;
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + parseInt(heroBannerHours || '48'));
        updateData.heroBannerExpiry = Timestamp.fromDate(expiry);
      }
      await setDoc(doc(db, 'system', 'homeConfig'), updateData, { merge: true });
      showToast('✅ Hero mis à jour !');
      setHeroBannerFile(null);
      setHeroBannerPreview('');
    } catch (e) { showToast('❌ Erreur sauvegarde'); }
    finally { setHeroSaving(false); }
  };

  const handlePublishBanner = async () => {
    if (!bannerMsg.trim()) { showToast('⚠️ Message requis'); return; }
    setBusy('banner');
    try { await publishSystemBanner({ message: bannerMsg, type: bannerType, expiresInHours: parseInt(bannerHours) || 24, ctaLabel: bannerCta || undefined }); await logAction('BANNER_PUBLISHED', 'system', bannerMsg); setBannerMsg(''); setBannerCta(''); showToast('📢 Annonce publiée !'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };
  const handleSaveSettings = async () => {
    setBusy('settings');
    try { await saveGlobalSettings(settingsDraft); await logAction('SETTINGS_UPDATED', 'system'); setGlobalSettings(settingsDraft); showToast('✅ Paramètres sauvegardés'); }
    catch { showToast('❌ Erreur'); } finally { setBusy(null); }
  };

  const pendingBoosts = allBoosts.filter(b => b.status === 'pending');
  const disputeCount = orders.filter(o => o.status === 'dispute').length;

  const filteredUsers = users.filter(u => !userSearch || [u.name, u.email, u.phone].some(v => v?.toLowerCase().includes(userSearch.toLowerCase())));
  const filteredProducts = products.filter(p => (!productSearch || p.title?.toLowerCase().includes(productSearch.toLowerCase())) && p.status !== 'deleted');
  const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);
  const filteredBoosts = allBoosts.filter(b => boostFilter === 'all' || b.status === boostFilter);

  const TABS: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: 'stats',     icon: '📊', label: 'Stats' },
    { id: 'boosts',    icon: '⚡', label: 'Boosts',    badge: pendingBoosts.length },
    { id: 'users',     icon: '👥', label: 'Users' },
    { id: 'products',  icon: '📦', label: 'Articles' },
    { id: 'orders',    icon: '💰', label: 'Commandes', badge: disputeCount },
    { id: 'broadcast', icon: '📢', label: 'Broadcast' },
    { id: 'settings',  icon: '⚙️', label: 'Config' },
    { id: 'logs',      icon: '🗂', label: 'Logs' },
  ];

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: '#0F172A', height: '100dvh' }}>
        <div className="text-center px-8">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="font-black text-white text-[20px] mb-3">Accès refusé</h2>
          <p className="text-slate-400 text-[13px] mb-8">Zone réservée à l'admin Brumerie.</p>
          <button onClick={onBack} className="px-8 py-4 rounded-2xl font-black text-[12px] uppercase text-white" style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden" style={{ background: '#0F172A', height: '100dvh' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-12 pb-2">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10 active:scale-90">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-white text-[17px]">⚙️ Admin Brumerie</h1>
          <p className="text-slate-500 text-[10px]">{currentUser?.email}</p>
        </div>
        {(pendingBoosts.length + disputeCount) > 0 && (
          <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white font-black text-[11px]">{pendingBoosts.length + disputeCount}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-shrink-0 flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-hide py-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wide relative transition-all ${tab === t.id ? 'text-white shadow-lg' : 'text-slate-400 bg-white/5'}`}
            style={tab === t.id ? { background: 'linear-gradient(135deg,#16A34A,#115E2E)' } : {}}>
            <span>{t.icon}</span><span>{t.label}</span>
            {!!t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-black">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3">

        {/* ── STATS ── */}
        {tab === 'stats' && (!stats ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Utilisateurs" value={fmt(stats.totalUsers)} sub={stats.newUsersToday > 0 ? `+${stats.newUsersToday} aujourd'hui` : `+${stats.newUsersThisWeek ?? 0} cette semaine`} color="text-blue-600"/>
              <StatCard label="Vendeurs" value={fmt(stats.totalSellers)} sub={`${stats.verifiedSellers} vérifiés`} color="text-green-600"/>
              <StatCard label="Articles" value={fmt(stats.totalProducts)} sub={`${stats.activeProducts} actifs`} color="text-slate-800"/>
              <StatCard label="Commandes" value={fmt(stats.totalOrders)} sub={`${disputeCount} litiges`} color="text-purple-600"/>
            </div>
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenus estimés</p>
              <div className="flex justify-between">
                <div><p className="text-[11px] text-slate-400">⚡ Boosts</p><p className="font-black text-green-700 text-[17px]">{fmt(stats.totalBoostRevenue)} FCFA</p></div>
                <div className="text-right"><p className="text-[11px] text-slate-400">🏅 Badges</p><p className="font-black text-blue-600 text-[17px]">{fmt(stats.totalVerifRevenue)} FCFA</p></div>
              </div>
              <div className="h-px bg-slate-100"/>
              <div className="flex justify-between items-center">
                <p className="font-black text-slate-600 text-[12px]">Total</p>
                <p className="font-black text-slate-900 text-[20px]">{fmt(stats.totalBoostRevenue + stats.totalVerifRevenue)} FCFA</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Boosts actifs', v: allBoosts.filter(b => b.status === 'active').length, c: 'text-green-400', bg: 'bg-green-900/30' },
                { l: 'En attente', v: pendingBoosts.length, c: 'text-amber-400', bg: 'bg-amber-900/30' },
                { l: 'Bannis', v: users.filter(u => u.isBanned).length, c: 'text-red-400', bg: 'bg-red-900/30' },
              ].map(s => (
                <div key={s.l} className={`${s.bg} rounded-2xl p-3 text-center`}>
                  <p className={`font-black text-[22px] ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] text-slate-500 font-bold">{s.l}</p>
                </div>
              ))}
            </div>
          </>
        ))}

        {/* ── BOOSTS ── */}
        {tab === 'boosts' && (
          <>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {([['pending', `⏳ Attente (${pendingBoosts.length})`], ['active', '✅ Actifs'], ['rejected', '❌ Refusés'], ['all', '📋 Tous']] as [string, string][]).map(([f, l]) => (
                <button key={f} onClick={() => setBoostFilter(f)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase ${boostFilter === f ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-400'}`}>{l}</button>
              ))}
            </div>
            {filteredBoosts.length === 0 && <div className="text-center py-16 text-slate-500 font-bold text-[13px]">Aucun boost</div>}
            {filteredBoosts.map(b => (
              <div key={b.id} className="bg-white rounded-2xl overflow-hidden">
                <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-[13px] truncate">{b.productTitle || b.productId}</p>
                    <p className="text-slate-400 text-[11px]">{b.sellerName || b.sellerId}</p>
                  </div>
                  <Badge label={b.status === 'pending' ? '⏳ Attente' : b.status === 'active' ? '✅ Actif' : '❌ Refusé'} color={STATUS_COLORS[b.status] || ''}/>
                </div>
                <div className="grid grid-cols-3 gap-1.5 px-4 pb-2">
                  {/* Durée */}
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-[9px] text-slate-400">Durée</p>
                    <p className="font-black text-[11px] text-slate-800">{BOOST_PLANS.find(p => p.duration === b.duration)?.label || b.duration}</p>
                  </div>
                  {/* Prix */}
                  <div className="bg-amber-50 rounded-xl p-2 text-center">
                    <p className="text-[9px] text-amber-600">Prix</p>
                    <p className="font-black text-[11px] text-amber-800">{fmt(b.price||0)} F</p>
                  </div>
                  {/* Compte à rebours */}
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-[9px] text-slate-400 mb-1">Temps</p>
                    {b.status === 'active' && b.expiresAt
                      ? <CountdownBadge expiresAt={b.expiresAt} size="sm"/>
                      : <span className="text-[10px] text-slate-400">—</span>
                    }
                  </div>
                  {/* fin grille */}
                  {false && [].map(() => (
                    <div key={lbl} className={`${bg || 'bg-slate-50'} rounded-xl p-2 text-center`}>
                      <p className="text-[9px] text-slate-400">{lbl}</p>
                      <p className="font-black text-[11px] text-slate-800">{val}</p>
                    </div>
                  ))}
                </div>
                {b.waveRef && <div className="mx-4 mb-2 bg-blue-50 rounded-xl px-3 py-2"><span className="text-[10px] text-blue-600 font-black">REF WAVE : </span><span className="font-mono text-blue-800 text-[11px]">{b.waveRef}</span></div>}
                <p className="px-4 pb-2 text-[10px] text-slate-400">Demandé {fmtDate((b as any).createdAt)}</p>
                {b.status === 'pending' && (
                  <div className="px-4 pb-4 space-y-2">
                    {rejectBoostId === b.id ? (
                      <div className="space-y-2">
                        <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motif refus..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-red-400"/>
                        <div className="flex gap-2">
                          <button onClick={() => setRejectBoostId('')} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-[11px]">Annuler</button>
                          <button onClick={() => handleRejectBoost(b.id!)} disabled={busy === b.id} className="flex-[2] py-2.5 rounded-xl bg-red-500 text-white font-black text-[11px] disabled:opacity-50">{busy === b.id ? '...' : 'Confirmer refus'}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setRejectBoostId(b.id!)} className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-black text-[11px] uppercase">❌ Refuser</button>
                        <button onClick={() => handleActivateBoost(b.id!)} disabled={busy === b.id} className="flex-[2] py-3 rounded-xl text-white font-black text-[11px] uppercase disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                          {busy === b.id ? <span className="flex items-center justify-center gap-1"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>...</span> : '✅ Activer'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="🔍 Nom, email, téléphone..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white text-[12px] outline-none focus:border-green-500 placeholder-slate-500"/>
            <p className="text-slate-500 text-[10px] font-bold">{filteredUsers.length} résultat(s)</p>
            {filteredUsers.map(u => (
              <div key={u.id} className={`bg-white rounded-2xl overflow-hidden ${u.isBanned ? 'border-2 border-red-200' : ''}`}>
                <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                  {u.photoURL ? <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt=""/> : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 font-black text-slate-500">{u.name?.[0]||'?'}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-black text-slate-900 text-[13px]">{u.name||'—'}</p>
                      {u.isVerified && <Badge label="✓" color="bg-green-100 text-green-700"/>}
                      {u.isBanned && <Badge label="🚫" color="bg-red-100 text-red-700"/>}
                      <Badge label={u.role||'buyer'} color={u.role==='seller'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}/>
                    </div>
                    <p className="text-slate-400 text-[10px] truncate">{u.email}</p>
                    {u.phone && <p className="text-slate-400 text-[10px]">{u.phone}</p>}
                  </div>
                </div>
                {u.isBanned && u.banReason && <div className="mx-4 mb-2 bg-red-50 rounded-xl px-3 py-1.5"><p className="text-[10px] text-red-600 font-bold">🚫 {u.banReason}</p></div>}

                {/* Infos badge */}
                {u.isVerified && u.verifiedUntil && (
                  <div className="mx-4 mb-2 bg-green-50 rounded-xl px-3 py-1.5 flex items-center justify-between">
                    <p className="text-[10px] text-green-700 font-bold">🏅 Badge expire {fmtDate(u.verifiedUntil)}</p>
                    <button onClick={() => handleToggleBadge(u.id, true)} disabled={busy==='badge_'+u.id}
                      className="text-[9px] font-black text-red-500 px-2 py-0.5 bg-red-50 rounded-lg active:scale-95 disabled:opacity-50">
                      Désactiver
                    </button>
                  </div>
                )}

                {/* Message direct — formulaire inline */}
                {msgTarget?.id === u.id ? (
                  <div className="mx-4 mb-3 space-y-2">
                    <div className="bg-blue-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-blue-600 font-black mb-1">📩 Message à {u.name}</p>
                      <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                        placeholder="Ton message apparaîtra dans ses notifications et conversations..."
                        rows={3}
                        className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-blue-400 resize-none"/>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { setMsgTarget(null); setMsgText(''); }}
                          className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-[10px]">Annuler</button>
                        <button onClick={handleSendDirectMsg} disabled={!msgText.trim() || busy==='msg_'+u.id}
                          className="flex-[2] py-2 rounded-xl text-white font-black text-[10px] disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
                          {busy==='msg_'+u.id ? '⏳ Envoi...' : '📩 Envoyer + notifier'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {banUserId === u.id ? (
                  <div className="px-4 pb-3 space-y-2">
                    <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Motif du bannissement..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-red-400"/>
                    <div className="flex gap-2">
                      <button onClick={() => setBanUserId('')} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-[11px]">Annuler</button>
                      <button onClick={() => handleBan(u.id)} disabled={busy===u.id} className="flex-[2] py-2.5 rounded-xl bg-red-500 text-white font-black text-[11px] disabled:opacity-50">{busy===u.id?'...':'🚫 Bannir'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-3 space-y-2">
                    {/* Ligne 1 — ban/déban + badge */}
                    <div className="flex gap-2">
                      {u.isBanned
                        ? <button onClick={() => handleUnban(u.id)} disabled={busy===u.id} className="flex-1 py-2 rounded-xl bg-green-50 text-green-700 font-black text-[10px] uppercase disabled:opacity-50">✅ Débannir</button>
                        : <button onClick={() => { setBanUserId(u.id); setBanReason(''); }} className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-black text-[10px] uppercase">🚫 Bannir</button>
                      }
                      {/* Toggle badge avec durée */}
                      <div className="flex gap-1 flex-1">
                        {u.isVerified
                          ? <button onClick={() => handleToggleBadge(u.id, true)} disabled={busy==='badge_'+u.id}
                              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase disabled:opacity-50">
                              🏅 OFF
                            </button>
                          : <button onClick={() => handleToggleBadge(u.id, false)} disabled={busy==='badge_'+u.id}
                              className="flex-1 py-2 rounded-xl bg-amber-50 text-amber-700 font-black text-[10px] uppercase disabled:opacity-50">
                              🏅 ON
                            </button>
                        }
                        <select value={badgeDays} onChange={e => setBadgeDays(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-1.5 text-[10px] font-bold text-slate-600 outline-none">
                          <option value="7">7j</option>
                          <option value="30">30j</option>
                          <option value="90">90j</option>
                          <option value="365">1an</option>
                        </select>
                      </div>
                      {/* Toggle paiement à l'avance par vendeur */}
                      {u.role === 'seller' && (
                        <button
                          onClick={async () => {
                            setBusy('adv_'+u.id);
                            try {
                              await updateDoc(doc(db,'users',u.id), {
                                advancePaymentAllowed: !(u as any).advancePaymentAllowed
                              });
                              showToast((u as any).advancePaymentAllowed ? '🔒 Paiement avance retiré' : '💳 Paiement avance accordé');
                            } catch { showToast('Erreur'); }
                            finally { setBusy(''); }
                          }}
                          disabled={busy==='adv_'+u.id}
                          className={`px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
                            (u as any).advancePaymentAllowed
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                          title={(u as any).advancePaymentAllowed ? 'Retirer paiement avance' : 'Autoriser paiement avance'}>
                          {(u as any).advancePaymentAllowed ? '💳✓' : '💳'}
                        </button>
                      )}
                    </div>
                    {/* Ligne 2 — message direct + changer rôle */}
                    <div className="flex gap-2">
                      <button onClick={() => { setMsgTarget({id:u.id,name:u.name||'Utilisateur'}); setMsgText(''); }}
                        className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 font-black text-[10px] uppercase active:scale-95">
                        📩 Message
                      </button>
                      <button onClick={() => { setEmailTarget(emailTarget===u.id?null:u.id); setNewEmailInput(''); }}
                        className="flex-1 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase active:scale-95">
                        ✉️ Email
                      </button>
                      {u.role==='buyer' && (
                        <button onClick={() => handleSetRole(u.id,'seller')} disabled={busy===u.id}
                          className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 font-black text-[10px] uppercase disabled:opacity-50">
                          → Vendeur
                        </button>
                      )}
                      {u.role==='seller' && (
                        <button onClick={() => handleSetRole(u.id,'buyer')} disabled={busy===u.id}
                          className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase disabled:opacity-50">
                          → Acheteur
                        </button>
                      )}
                    </div>
                    {/* Changer l'email — panneau inline */}
                    {emailTarget === u.id && (
                      <div className="mt-2 bg-indigo-50 rounded-2xl p-3 space-y-2">
                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Changer l'email</p>
                        <p className="text-[10px] text-slate-400">Actuel : <span className="font-bold text-slate-600">{u.email}</span></p>
                        <div className="flex gap-2">
                          <input
                            value={newEmailInput}
                            onChange={e => setNewEmailInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdminChangeEmail(u.id)}
                            placeholder="nouvel@email.com"
                            type="email"
                            autoCapitalize="none"
                            className="flex-1 bg-white border-2 border-transparent focus:border-indigo-400 rounded-xl px-3 py-2 text-[12px] font-black outline-none"
                          />
                          <button
                            onClick={() => handleAdminChangeEmail(u.id)}
                            disabled={!newEmailInput.includes('@') || busy==='email_'+u.id}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-[11px] disabled:opacity-40 active:scale-95">
                            {busy==='email_'+u.id ? '...' : '✓'}
                          </button>
                        </div>
                        <p className="text-[9px] text-indigo-400">⚡ Changement immédiat sans OTP (accès admin)</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── PRODUCTS ── */}
        {tab === 'products' && (
          <>
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="🔍 Rechercher..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white text-[12px] outline-none focus:border-green-500 placeholder-slate-500"/>
            <p className="text-slate-500 text-[10px] font-bold">{filteredProducts.length} article(s)</p>
            {filteredProducts.map(p => (
              <div key={p.id} className={`bg-white rounded-2xl overflow-hidden ${p.hidden?'border-2 border-amber-200 opacity-70':''}`}>
                <div className="flex gap-3 p-3">
                  {(p.images?.[0] || (p as any).imageUrl) && <img src={p.images?.[0] || (p as any).imageUrl} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt=""/>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-black text-slate-900 text-[12px] line-clamp-2 flex-1">{p.title}</p>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge label={p.status||'active'} color={STATUS_COLORS[p.status]||STATUS_COLORS.active}/>
                        {p.hidden && <Badge label="Masqué" color="bg-amber-100 text-amber-700"/>}
                      </div>
                    </div>
                    <p className="font-black text-green-700 text-[13px] mt-0.5">{fmt(p.price||0)} FCFA</p>
                    <p className="text-slate-400 text-[10px]">{p.sellerName||p.sellerId} · {fmtDate(p.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2 px-3 pb-3">
                  <button onClick={() => handleToggleHide(p.id,p.hidden)} disabled={busy===p.id} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase disabled:opacity-50 ${p.hidden?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{p.hidden?'👁 Afficher':'🙈 Masquer'}</button>
                  <button onClick={() => handleDeleteProduct(p.id)} disabled={busy===p.id} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-black text-[10px] uppercase disabled:opacity-50">🗑 Supprimer</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(['all','pending_payment','proof_submitted','dispute','completed','refunded'] as const).map(f => (
                <button key={f} onClick={() => setOrderFilter(f)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase ${orderFilter===f?'bg-green-500 text-white':'bg-white/10 text-slate-400'}`}>
                  {f==='all'?'Tout':f==='dispute'?`⚠️ Litiges (${disputeCount})`:f.replace('_',' ')}
                </button>
              ))}
            </div>
            {filteredOrders.length === 0 && <div className="text-center py-16 text-slate-500 font-bold">Aucune commande</div>}
            {filteredOrders.map(o => (
              <div key={o.id} className={`bg-white rounded-2xl overflow-hidden ${o.status==='dispute'?'border-2 border-red-300':''}`}>
                <div className="px-4 pt-3 pb-2 flex justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-[12px] truncate">{o.productTitle||o.productId}</p>
                    <p className="text-slate-400 text-[10px]">🛒 {o.buyerName||o.buyerId?.slice(0,8)}</p>
                    <p className="text-slate-400 text-[10px]">🏪 {o.sellerName||o.sellerId?.slice(0,8)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge label={o.status} color={STATUS_COLORS[o.status]||''}/>
                    <p className="font-black text-green-700 text-[13px] mt-1">{fmt(o.price||0)} F</p>
                  </div>
                </div>
                <p className="px-4 pb-2 text-[10px] text-slate-400">{fmtDate(o.createdAt)}</p>
                {o.adminNote && <div className="mx-4 mb-2 bg-blue-50 rounded-xl px-3 py-1.5"><p className="text-[10px] text-blue-600 font-bold">📝 {o.adminNote}</p></div>}
                {!['completed','refunded','cancelled'].includes(o.status) && (
                  <div className="px-4 pb-3 space-y-2">
                    {orderTarget === o.id ? (
                      <>
                        <input value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Note admin (obligatoire)..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-green-400"/>
                        <div className="flex gap-2">
                          <button onClick={() => setOrderTarget('')} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-[10px]">✕</button>
                          <button onClick={() => handleResolveOrder(o.id,'completed')} disabled={busy===o.id} className="flex-1 py-2 rounded-xl bg-green-50 text-green-700 font-black text-[10px] uppercase disabled:opacity-50">✅ Valider</button>
                          <button onClick={() => handleResolveOrder(o.id,'refunded')} disabled={busy===o.id} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 font-black text-[10px] uppercase disabled:opacity-50">↩ Remb.</button>
                          <button onClick={() => handleResolveOrder(o.id,'cancelled')} disabled={busy===o.id} className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-black text-[10px] uppercase disabled:opacity-50">✕ Ann.</button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => setOrderTarget(o.id)} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase active:scale-95">⚡ Intervenir</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── BROADCAST ── */}
        {tab === 'broadcast' && (
          <>
            {activeBanners.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase">Bannières actives ({activeBanners.length})</p>
                {activeBanners.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-[12px] line-clamp-2">{b.message}</p>
                      <p className="text-slate-400 text-[10px]">Expire {fmtDate(b.expiresAt)} · {b.type}</p>
                    </div>
                    <button onClick={() => updateDoc(doc(db,'system_banners',b.id),{active:false}).then(()=>showToast('Supprimé'))} className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center text-red-500 font-black active:scale-90">✕</button>
                  </div>
                ))}
              </div>
            )}
            {/* ── HERO ACCUEIL ── */}
            <div className="bg-white/5 rounded-2xl p-5 space-y-3 mb-2">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">🏠 Texte Hero Accueil</p>
              <textarea
                value={heroTextInput}
                onChange={e => setHeroTextInput(e.target.value.slice(0, 80))}
                rows={2}
                placeholder="Trouve ton bonheur à Babi 🤩"
                className="w-full px-4 py-3 bg-white/10 rounded-xl text-[12px] text-white border-2 border-transparent focus:border-green-500 outline-none resize-none"
              />
              <p className="text-slate-500 text-[10px]">{heroTextInput.length}/80 caractères</p>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bannière image (optionnel)</p>
                <p className="text-[9px] text-slate-400 mb-2">Remplace le fond vert pendant la durée définie, puis revient automatiquement au texte.</p>
                <label className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 cursor-pointer active:scale-95 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-[11px] text-white font-bold">{heroBannerFile ? heroBannerFile.name : 'Choisir une image...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setHeroBannerFile(f); setHeroBannerPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
                {heroBannerPreview && (
                  <div className="relative mt-2">
                    <img src={heroBannerPreview} className="w-full rounded-xl max-h-24 object-cover" alt="preview"/>
                    <button
                      onClick={() => { setHeroBannerFile(null); setHeroBannerPreview(''); }}
                      className="absolute top-1 right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                      title="Supprimer l'image">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
                {heroBannerFile && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <p className="text-[9px] text-slate-400">Durée :</p>
                    {[['24','24h'],['48','48h'],['72','72h'],['168','7j']].map(([h, label]) => (
                      <button key={h} onClick={() => setHeroBannerHours(h)}
                        className={`text-[9px] font-black px-3 py-1 rounded-lg ${heroBannerHours === h ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={saveHeroConfig} disabled={heroSaving}
                  className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                  {heroSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder Hero'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Supprimer la bannière image active ?')) return;
                    try {
                      const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
                      const { db } = await import('@/config/firebase');
                      await setDoc(firestoreDoc(db, 'system', 'homeConfig'),
                        { heroBannerUrl: '', heroBannerExpiry: null }, { merge: true });
                      setHeroBannerFile(null);
                      setHeroBannerPreview('');
                      showToast('🗑️ Bannière supprimée');
                    } catch { showToast('Erreur suppression'); }
                  }}
                  className="px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest bg-red-900/40 text-red-400 active:scale-95 transition-all"
                  title="Supprimer la bannière active">
                  🗑️
                </button>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 space-y-4">
              <p className="text-white font-black text-[13px]">Nouvelle annonce</p>
              <div className="flex gap-2">
                {(['promo','info','warning'] as const).map(t => (
                  <button key={t} onClick={() => setBannerType(t)} className={`flex-1 py-2 rounded-xl font-bold text-[11px] ${bannerType===t?'bg-green-500 text-white':'bg-white/10 text-slate-400'}`}>
                    {t==='promo'?'🎉 Promo':t==='info'?'ℹ️ Info':'⚠️ Alerte'}
                  </button>
                ))}
              </div>
              <textarea value={bannerMsg} onChange={e => setBannerMsg(e.target.value.slice(0,150))} placeholder="Message affiché à tous les utilisateurs..." rows={3}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-[12px] outline-none focus:border-green-500 resize-none placeholder-slate-600"/>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 text-[10px] font-bold flex-1">{bannerMsg.length}/150</p>
              </div>
              <input value={bannerCta} onChange={e => setBannerCta(e.target.value)} placeholder="Texte bouton CTA (optionnel)" className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-[12px] outline-none focus:border-green-500 placeholder-slate-600"/>
              <div className="flex gap-2">
                {[['1','1h'],['6','6h'],['24','24h'],['72','3j'],['168','7j']].map(([v,l]) => (
                  <button key={v} onClick={() => setBannerHours(v)} className={`flex-1 py-2 rounded-xl font-bold text-[10px] ${bannerHours===v?'bg-green-500 text-white':'bg-white/10 text-slate-400'}`}>{l}</button>
                ))}
              </div>
              <button onClick={handlePublishBanner} disabled={!bannerMsg.trim()||busy==='banner'} className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95" style={{ background:'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                {busy==='banner'?'⏳ Publication...':'📢 Publier bannière'}
              </button>
            </div>

            {/* ── Notification push à tous ── */}
            <div className="bg-white/5 rounded-2xl p-4 space-y-4 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <div>
                  <p className="text-white font-black text-[13px]">Notification push — tous les users</p>
                  <p className="text-slate-500 text-[10px]">{users.length} utilisateur(s) ciblés</p>
                </div>
              </div>
              <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="Titre (ex: 🎉 Nouveauté Brumerie !)"
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-[12px] outline-none focus:border-amber-400 placeholder-slate-600"/>
              <textarea value={broadcastBody} onChange={e => setBroadcastBody(e.target.value.slice(0,200))} placeholder="Contenu de la notification..." rows={3}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-[12px] outline-none focus:border-amber-400 resize-none placeholder-slate-600"/>
              <p className="text-slate-600 text-[10px] text-right">{broadcastBody.length}/200</p>

              {broadcastResult && (
                <div className="bg-green-900/30 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="text-green-400 font-black text-[12px]">{broadcastResult.sent} notifications envoyées</p>
                    {broadcastResult.errors > 0 && <p className="text-red-400 text-[10px]">{broadcastResult.errors} erreurs</p>}
                  </div>
                </div>
              )}

              <button onClick={handleBroadcast} disabled={!broadcastTitle.trim()||!broadcastBody.trim()||busy==='broadcast'}
                className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
                style={{ background:'linear-gradient(135deg,#D97706,#92400E)' }}>
                {busy==='broadcast'
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Envoi en cours...</span>
                  : `🔔 Envoyer à ${users.length} utilisateurs`}
              </button>
              <p className="text-slate-600 text-[10px] text-center">Chaque user recevra une notification dans son centre de notifications.</p>
            </div>
          </>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <>
            <div className="bg-white rounded-2xl p-4 space-y-4">
              {/* ── Paiement à l'avance ── */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">💳 Paiement à l'avance (Mobile Money)</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Active/désactive le paiement mobile money pour tous les acheteurs</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !(settingsDraft['advancePaymentEnabled'] ?? globalSettings['advancePaymentEnabled'] ?? false);
                      setSettingsDraft((s: any) => ({ ...s, advancePaymentEnabled: newVal }));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                      (settingsDraft['advancePaymentEnabled'] ?? globalSettings['advancePaymentEnabled'] ?? false)
                        ? 'bg-green-500' : 'bg-slate-600'
                    }`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      (settingsDraft['advancePaymentEnabled'] ?? globalSettings['advancePaymentEnabled'] ?? false)
                        ? 'left-7' : 'left-1'
                    }`}/>
                  </button>
                </div>
                <p className="text-[9px] mt-1 font-bold">
                  {(settingsDraft['advancePaymentEnabled'] ?? globalSettings['advancePaymentEnabled'] ?? false)
                    ? <span className="text-green-400">✅ Activé — les acheteurs peuvent payer à l'avance</span>
                    : <span className="text-slate-500">🔒 Désactivé — seul le COD est disponible</span>}
                </p>
              </div>

              {/* ── Prix badge Vérifié ── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prix badge vérifié — officiel (FCFA)</p>
                <p className="text-[9px] text-slate-400 mb-2">Prix de référence affiché barré + utilisé pour la comptabilité admin.</p>
                <input type="number"
                  value={settingsDraft['verificationPrice'] ?? globalSettings['verificationPrice'] ?? 3000}
                  onChange={e => setSettingsDraft((s: any) => ({ ...s, verificationPrice: parseInt(e.target.value) || 3000 }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-xl px-4 py-3 text-[13px] font-black outline-none"/>
              </div>
              {/* ── Prix promo badge Vérifié ── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">🔥 Prix promo badge vérifié (FCFA)</p>
                <p className="text-[9px] text-slate-400 mb-2">Prix affiché au vendeur. Mettre <strong>0</strong> pour désactiver la promo (affichage prix officiel seul).</p>
                <input type="number"
                  value={settingsDraft['verificationPromoPrice'] ?? globalSettings['verificationPromoPrice'] ?? 0}
                  onChange={e => setSettingsDraft((s: any) => ({ ...s, verificationPromoPrice: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-400 rounded-xl px-4 py-3 text-[13px] font-black outline-none"/>
                {((settingsDraft['verificationPromoPrice'] ?? globalSettings['verificationPromoPrice'] ?? 0) > 0) && (
                  <p className="text-[9px] text-blue-600 font-bold mt-1">
                    ✅ Promo active — vendeurs voient {(settingsDraft['verificationPromoPrice'] ?? globalSettings['verificationPromoPrice'])} FCFA · comptabilité reste à {settingsDraft['verificationPrice'] ?? globalSettings['verificationPrice'] ?? 3000} FCFA
                  </p>
                )}
              </div>
              {/* ── Liens Wave par plan ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[18px]">📱</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Deeplinks Wave par plan</p>
                    <p className="text-[9px] text-slate-400">Colle le lien Wave complet pour chaque durée. Le lien s'ouvre directement dans l'app Wave.</p>
                  </div>
                </div>

                {([
                  { key: '24h', label: '⚡ 24h', emoji: '⚡', placeholder: 'wave://send?phone=+2250586867693&amount=500&note=Boost24h' },
                  { key: '48h', label: '⚡ 48h', emoji: '⚡⚡', placeholder: 'wave://send?phone=+2250586867693&amount=900&note=Boost48h' },
                  { key: '7j',  label: '🚀 7j',  emoji: '🚀', placeholder: 'wave://send?phone=+2250586867693&amount=2500&note=Boost7j' },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key} className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-lg">{label}</span>
                      <span className="text-[9px] text-slate-400">
                        Prix actuel : {settingsDraft.boostPrices?.[key] ?? globalSettings.boostPrices?.[key] ?? BOOST_PLANS.find(p=>p.duration===key)?.price ?? '—'} FCFA
                      </span>
                    </div>
                    <input
                      value={settingsDraft.waveLinks?.[key] ?? globalSettings.waveLinks?.[key] ?? ''}
                      onChange={e => setSettingsDraft((s: any) => ({ ...s, waveLinks: { ...s.waveLinks, [key]: e.target.value } }))}
                      placeholder={placeholder}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-xl px-3 py-2.5 text-[11px] font-mono outline-none transition-all"
                    />
                  </div>
                ))}
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-1">
                  <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                    💡 <strong>Comment obtenir ton lien Wave ?</strong><br/>
                    Ouvre Wave → Recevoir → Copie le lien. Ou crée un QR code Wave et extrait l'URL.<br/>
                    Format : <code className="bg-amber-100 px-1 rounded">wave://send?phone=+225XXXXXXXXXX&amount=500&note=Boost</code>
                  </p>
                </div>
              </div>

              {/* ── Prix boosts ── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prix boosts (FCFA)</p>
                {(['24h','48h','7j'] as const).map(d => (
                  <div key={d} className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] font-bold text-slate-600 w-8">{d}</span>
                    <input type="number" value={settingsDraft.boostPrices?.[d] ?? globalSettings.boostPrices?.[d] ?? BOOST_PLANS.find(p=>p.duration===d)?.price ?? 0}
                      onChange={e => setSettingsDraft((s: any) => ({ ...s, boostPrices:{ ...s.boostPrices, [d]: parseInt(e.target.value) } }))}
                      className="flex-1 bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-xl px-3 py-2 text-[12px] font-black outline-none"/>
                    <span className="text-[10px] text-slate-400">FCFA</span>
                  </div>
                ))}
              </div>
              {/* ── Lien paiement badge vérifié ── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[16px]">✅</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Lien de paiement Badge Vérifié</p>
                    <p className="text-[9px] text-slate-400">Lien Wave/CinetPay qui s'ouvre quand un vendeur demande le badge.</p>
                  </div>
                </div>
                <input
                  value={settingsDraft.badgePaymentLink ?? globalSettings.badgePaymentLink ?? ''}
                  onChange={e => setSettingsDraft((s: any) => ({ ...s, badgePaymentLink: e.target.value }))}
                  placeholder="wave://send?phone=+225...&amount=2000&note=BadgeVerifie (adapter le montant au prix promo)"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-xl px-3 py-2.5 text-[11px] font-mono outline-none transition-all"
                />
              </div>

              {/* ── WhatsApp après paiement badge ── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">📱 WhatsApp pour preuve de paiement badge</p>
                <input
                  value={settingsDraft.badgeWhatsappAfter ?? globalSettings.badgeWhatsappAfter ?? '2250586867693'}
                  onChange={e => setSettingsDraft((s: any) => ({ ...s, badgeWhatsappAfter: e.target.value }))}
                  placeholder="2250586867693"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-xl px-3 py-2.5 text-[11px] font-mono outline-none transition-all"
                />
                <p className="text-[9px] text-slate-400 mt-1">Format : indicatif + numéro sans + ni espaces (ex: 2250586867693)</p>
              </div>

              {/* ── Lien YouTube ── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[16px]">🎥</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Chaîne YouTube Brumerie</p>
                    <p className="text-[9px] text-slate-400">Lien visible dans le Guide utilisateur et dans le Support.</p>
                  </div>
                </div>
                <input
                  value={settingsDraft.youtubeChannel ?? globalSettings.youtubeChannel ?? ''}
                  onChange={e => setSettingsDraft((s: any) => ({ ...s, youtubeChannel: e.target.value }))}
                  placeholder="https://youtube.com/@brumerie"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-xl px-3 py-2.5 text-[11px] font-mono outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="font-black text-slate-800 text-[13px]">🔧 Maintenance</p>
                  <p className="text-slate-400 text-[11px]">Bloque tous les utilisateurs</p>
                </div>
                <button onClick={() => {
                    // Lire la valeur actuelle réelle (draft si défini, sinon globalSettings)
                    const current = 'maintenanceMode' in settingsDraft
                      ? settingsDraft.maintenanceMode
                      : (globalSettings.maintenanceMode ?? false);
                    setSettingsDraft((s: any) => ({ ...s, maintenanceMode: !current }));
                  }}
                  className={`w-12 h-6 rounded-full relative transition-all ${ 
                    ('maintenanceMode' in settingsDraft ? settingsDraft.maintenanceMode : globalSettings.maintenanceMode)
                      ? 'bg-red-500' : 'bg-slate-200'
                  }`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    ('maintenanceMode' in settingsDraft ? settingsDraft.maintenanceMode : globalSettings.maintenanceMode)
                      ? 'left-6' : 'left-0.5'
                  }`}/>
                </button>
              </div>
              {('maintenanceMode' in settingsDraft ? settingsDraft.maintenanceMode : globalSettings.maintenanceMode) && (
                <input value={settingsDraft.maintenanceMessage??globalSettings.maintenanceMessage??''} onChange={e => setSettingsDraft((s: any) => ({ ...s, maintenanceMessage: e.target.value }))} placeholder="Message maintenance..." className="w-full bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 text-[12px] outline-none"/>
              )}
            </div>
            <button onClick={handleSaveSettings} disabled={busy==='settings'} className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95" style={{ background:'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              {busy==='settings'?'⏳ Sauvegarde...':'💾 Sauvegarder'}
            </button>
          </>
        )}

        {/* ── LOGS ── */}
        {tab === 'logs' && (
          <>
            <p className="text-slate-400 font-bold text-[11px]">{logs.length} action(s) enregistrée(s)</p>
            {logs.length===0 && <div className="text-center py-16 text-slate-500 font-bold">Aucun log</div>}
            {logs.map(l => (
              <div key={l.id} className="bg-white/5 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${l.action?.includes('BAN')?'bg-red-900/40 text-red-400':l.action?.includes('ACTIVATED')||l.action?.includes('VERIFIED')?'bg-green-900/40 text-green-400':'bg-white/10 text-slate-400'}`}>{l.action}</span>
                    <span className="text-slate-600 text-[10px] font-mono truncate">{l.targetId?.slice(0,10)}…</span>
                  </div>
                  {l.details && <p className="text-slate-500 text-[11px] line-clamp-1">{l.details}</p>}
                </div>
                <p className="text-slate-600 text-[9px] flex-shrink-0 pt-0.5">{fmtDate(l.createdAt)}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-white px-5 py-3 rounded-2xl font-bold text-[12px] shadow-2xl z-[999] whitespace-nowrap" style={{ animation:'fadeUp .2s ease-out' }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}
