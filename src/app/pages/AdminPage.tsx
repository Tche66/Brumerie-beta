import { Logo } from '../components/Logo';
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Users, TrendingUp, ShieldCheck, Globe, RefreshCw,
  Eye, Trash2, BarChart3, Key, LogOut, Search,
  ChevronLeft, ChevronRight, Download, UserCheck,
  UserX, Edit2, Check, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { supabase, signOut } from '../utils/supabaseService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface AdminStats {
  total_addresses: number; public_addresses: number;
  private_addresses: number; verified_addresses: number;
  total_users: number; premium_users: number;
  addresses_today: number; addresses_this_week: number;
  top_cities: { ville: string; count: number }[];
  addresses_by_day: { date: string; count: number }[];
}

const PAGE_SIZE = 25;

// Prix par défaut des forfaits (modifiables depuis l'admin)
const DEFAULT_PLANS = [
  { id: 'premium_annual',   name: 'Premium Annuel',  price: '10', link: '/paiement?plan=premium_annual' },
  { id: 'premium_lifetime', name: 'Premium Lifetime', price: '25', link: '/paiement?plan=premium_lifetime' },
  { id: 'enterprise',       name: 'API Entreprise',   price: '50', link: 'mailto:api@addressweb.brumerie.com' },
  { id: 'qr_code',          name: 'QR Code physique', price: '2.5', link: 'mailto:qr@addressweb.brumerie.com' },
];

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'addresses'|'users'|'plans'|'api'>('overview');

  // Adresses
  const [addresses, setAddresses]   = useState<any[]>([]);
  const [addrTotal, setAddrTotal]   = useState(0);
  const [addrPage, setAddrPage]     = useState(1);
  const [addrFilter, setAddrFilter] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);

  // Utilisateurs
  const [users, setUsers]         = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Plans & prix — persistants via localStorage
  const [plans, setPlans] = useState(() => {
    try {
      const saved = localStorage.getItem('aw_admin_plans');
      return saved ? JSON.parse(saved) : DEFAULT_PLANS;
    } catch { return DEFAULT_PLANS; }
  });
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price: '', link: '' });

  // API keys
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  // RequireAdmin s'occupe déjà du check — on charge directement
  useEffect(() => {
    loadStats();
    // Charger les plans depuis Supabase si disponibles
    supabase.from('app_settings').select('value').eq('key', 'plans_config').single()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value);
            setPlans(parsed);
            localStorage.setItem('aw_admin_plans', data.value);
          } catch {}
        }
      });
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('get_admin_stats');
      if (data) setStats(data);
    } catch { toast.error('Erreur chargement stats'); }
    setLoading(false);
  };

  const loadAddresses = useCallback(async (page = 1, filter = '') => {
    setAddrLoading(true);
    let q = supabase.from('addresses')
      .select('id,address_code,ville,quartier,repere,is_public,is_verified,view_count,created_at', { count: 'exact' });
    if (filter.trim().length > 1)
      q = q.or(`address_code.ilike.%${filter}%,ville.ilike.%${filter}%,repere.ilike.%${filter}%`);
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setAddresses(data || []); setAddrTotal(count || 0); setAddrPage(page);
    setAddrLoading(false);
  }, []);

  const loadUsers = useCallback(async (page = 1, search = '') => {
    setUsersLoading(true);
    let q = supabase.from('profiles')
      .select('id,nom,email,plan,adresses_count,created_at,role,photo_url', { count: 'exact' });
    if (search.trim().length > 1)
      q = q.or(`nom.ilike.%${search}%,email.ilike.%${search}%`);
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setUsers(data || []); setUsersTotal(count || 0); setUsersPage(page);
    setUsersLoading(false);
  }, []);

  const loadApiKeys = async () => {
    const { data } = await supabase.from('api_keys')
      .select('*, profiles(nom,email)').eq('is_active', true)
      .order('requests_total', { ascending: false }).limit(50);
    setApiKeys(data || []);
  };

  const handleTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'addresses' && addresses.length === 0) loadAddresses();
    if (tab === 'users'     && users.length === 0)     loadUsers();
    if (tab === 'api'       && apiKeys.length === 0)   loadApiKeys();
  };

  const handleDeleteAddr = async (id: string, code: string) => {
    if (!confirm(`Supprimer ${code} ?`)) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (!error) { setAddresses(p => p.filter(a => a.id !== id)); setAddrTotal(t => t - 1); toast.success('Supprimée'); }
    else toast.error('Erreur');
  };

  const handleCertify = async (id: string, cur: boolean) => {
    const { error } = await supabase.from('addresses').update({ is_verified: !cur }).eq('id', id);
    if (!error) { setAddresses(p => p.map(a => a.id === id ? { ...a, is_verified: !cur } : a)); toast.success(cur ? 'Certification retirée' : '✓ Certifiée'); }
  };

  const handleSetPlan = async (uid: string, plan: string) => {
    const exp = plan === 'free' || plan === 'premium_lifetime' ? null
      : new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.from('profiles').update({ plan, plan_expires_at: exp }).eq('id', uid);
    if (!error) { setUsers(p => p.map(u => u.id === uid ? { ...u, plan } : u)); toast.success('Plan mis à jour'); }
  };

  const handleToggleAdmin = async (uid: string, isAdm: boolean) => {
    if (!confirm(`${isAdm ? 'Retirer' : 'Accorder'} les droits admin ?`)) return;
    const { error } = await supabase.from('profiles').update({ role: isAdm ? 'user' : 'admin' }).eq('id', uid);
    if (!error) { setUsers(p => p.map(u => u.id === uid ? { ...u, role: isAdm ? 'user' : 'admin' } : u)); toast.success('Rôle mis à jour'); }
  };

  const exportCsv = async () => {
    const { data } = await supabase.from('addresses').select('address_code,ville,quartier,repere,is_public,view_count,created_at').order('created_at', { ascending: false }).limit(5000);
    if (!data) return;
    const csv = ['Code,Ville,Quartier,Repère,Public,Vues,Date',
      ...data.map(r => `${r.address_code},"${r.ville}","${r.quartier||''}","${r.repere}",${r.is_public},${r.view_count||0},${new Date(r.created_at).toLocaleDateString('fr')}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `addressweb-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); toast.success(`${data.length} adresses exportées`);
  };

  const savePlan = async (id: string) => {
    const updated = plans.map(pl => pl.id === id ? { ...pl, price: editForm.price, link: editForm.link } : pl);
    setPlans(updated);
    // Persister dans localStorage ET Supabase
    try { localStorage.setItem('aw_admin_plans', JSON.stringify(updated)); } catch {}
    try {
      await supabase.from('app_settings').upsert({
        key: 'plans_config',
        value: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}
    setEditingPlan(null);
    toast.success('✅ Forfait sauvegardé de façon permanente');
  };

  const chartMax = Math.max(...(stats?.addresses_by_day || []).map(d => d.count), 1);

  const PLAN_COLORS: Record<string,string> = {
    free: 'bg-gray-100 text-gray-600', premium_annual: 'bg-indigo-100 text-indigo-700',
    premium_lifetime: 'bg-amber-100 text-amber-700', enterprise: 'bg-purple-100 text-purple-700',
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="font-bold text-lg">Address-Web Admin</h1>
              <p className="text-gray-400 text-xs">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadStats} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <RefreshCw className="w-4 h-4 mr-1" />Actualiser
            </Button>
            <Link to="/"><Button variant="ghost" size="sm" className="text-gray-400">← Site</Button></Link>
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={async () => { await signOut(); navigate('/'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {[
            { key: 'overview',   label: '📊 Vue d\'ensemble' },
            { key: 'addresses',  label: `📍 Adresses${addrTotal > 0 ? ` (${addrTotal})` : ''}` },
            { key: 'users',      label: `👥 Utilisateurs${usersTotal > 0 ? ` (${usersTotal})` : ''}` },
            { key: 'plans',      label: '💰 Forfaits & Prix' },
            { key: 'api',        label: '🔑 API Keys' },
          ].map(t => (
            <button key={t.key} onClick={() => handleTab(t.key as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key ? 'border-indigo-400 text-white' : 'border-transparent text-gray-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Adresses totales', value: stats.total_addresses,   bg: 'bg-indigo-50',  icon: '📍' },
                { label: 'Utilisateurs',      value: stats.total_users,        bg: 'bg-green-50',   icon: '👥' },
                { label: 'Aujourd\'hui',       value: stats.addresses_today,    bg: 'bg-orange-50',  icon: '📈' },
                { label: 'Certifiées',         value: stats.verified_addresses, bg: 'bg-purple-50',  icon: '✓' },
              ].map(k => (
                <Card key={k.label} className={`p-5 ${k.bg} border-0`}>
                  <div className="text-2xl mb-1">{k.icon}</div>
                  <p className="text-3xl font-bold text-gray-900">{k.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-1">{k.label}</p>
                </Card>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-600" />Top villes</h3>
                <div className="space-y-2">
                  {(stats.top_cities || []).slice(0,8).map((c, i) => (
                    <div key={c.ville} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{i+1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="font-medium">{c.ville}</span>
                          <span className="text-gray-500">{c.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(c.count/(stats.top_cities[0]?.count||1))*100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold mb-4">Répartition</h3>
                {[
                  { label: 'Publiques',     value: stats.public_addresses,   total: stats.total_addresses, color: 'bg-green-500' },
                  { label: 'Privées',       value: stats.private_addresses,  total: stats.total_addresses, color: 'bg-gray-400'  },
                  { label: 'Certifiées',    value: stats.verified_addresses, total: stats.total_addresses, color: 'bg-indigo-500'},
                  { label: 'Cette semaine', value: stats.addresses_this_week,total: stats.total_addresses, color: 'bg-orange-400'},
                ].map(item => (
                  <div key={item.label} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.total > 0 ? (item.value/item.total)*100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="text-sm text-gray-600">Premium</span>
                  <span className="font-bold text-indigo-600">{stats.premium_users} / {stats.total_users}</span>
                </div>
              </Card>
            </div>
            {(stats.addresses_by_day||[]).length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold mb-4">Activité — 30 derniers jours</h3>
                <div className="flex items-end gap-0.5" style={{ height: 100 }}>
                  {stats.addresses_by_day.map((d, i) => (
                    <div key={i} className="flex-1 bg-indigo-500 hover:bg-indigo-600 rounded-t cursor-default min-h-[2px] transition-colors"
                      style={{ height: `${Math.max((d.count/chartMax)*100, d.count>0?4:2)}px` }}
                      title={`${d.date}: ${d.count}`} />
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ===== ADRESSES ===== */}
        {activeTab === 'addresses' && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={addrFilter} onChange={e => setAddrFilter(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadAddresses(1, addrFilter)}
                  placeholder="Code, ville, repère..." className="pl-9 bg-white" />
              </div>
              <Button onClick={() => loadAddresses(1, addrFilter)} variant="outline">Filtrer</Button>
              <Button onClick={() => { setAddrFilter(''); loadAddresses(1, ''); }} variant="ghost">Reset</Button>
              <Button onClick={exportCsv} variant="outline" className="ml-auto"><Download className="w-4 h-4 mr-1" />CSV</Button>
            </div>
            <Card className="overflow-hidden">
              {addrLoading ? <div className="text-center py-12"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b text-left">
                      <th className="px-4 py-3 font-semibold text-gray-600">Code</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Ville</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Repère</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-center">Visib.</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-center">Certif.</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-center hidden sm:table-cell">Vues</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {addresses.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><Link to={`/${a.address_code}`} target="_blank" className="font-mono text-xs font-bold text-indigo-600 hover:underline">{a.address_code}</Link></td>
                          <td className="px-4 py-3 text-sm">{a.ville}{a.quartier && <span className="text-gray-400 text-xs"> · {a.quartier}</span>}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate hidden md:table-cell">{a.repere}</td>
                          <td className="px-4 py-3 text-center"><span className={`text-xs px-1.5 py-0.5 rounded-full ${a.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{a.is_public ? '🌍' : '🔒'}</span></td>
                          <td className="px-4 py-3 text-center"><button onClick={() => handleCertify(a.id, a.is_verified)} className={`p-1 rounded transition-colors ${a.is_verified ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300 hover:text-indigo-400'}`} title={a.is_verified ? 'Retirer' : 'Certifier'}><ShieldCheck className="w-4 h-4" /></button></td>
                          <td className="px-4 py-3 text-center text-gray-500 text-xs hidden sm:table-cell">{a.view_count||0}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{new Date(a.created_at).toLocaleDateString('fr')}</td>
                          <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteAddr(a.id, a.address_code)} className="text-red-400 hover:text-red-600 p-1 rounded"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {addresses.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">Aucune adresse trouvée</p>}
                </div>
              )}
            </Card>
            {addrTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{(addrPage-1)*PAGE_SIZE+1}–{Math.min(addrPage*PAGE_SIZE,addrTotal)} sur {addrTotal.toLocaleString()}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={addrPage<=1} onClick={() => loadAddresses(addrPage-1,addrFilter)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" disabled={addrPage*PAGE_SIZE>=addrTotal} onClick={() => loadAddresses(addrPage+1,addrFilter)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== UTILISATEURS ===== */}
        {activeTab === 'users' && (
          <>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadUsers(1, searchUser)}
                  placeholder="Nom ou email..." className="pl-9 bg-white" />
              </div>
              <Button onClick={() => loadUsers(1, searchUser)} variant="outline">Chercher</Button>
              <Button onClick={() => { setSearchUser(''); loadUsers(1, ''); }} variant="ghost">Reset</Button>
            </div>
            <Card className="overflow-hidden">
              {usersLoading ? <div className="text-center py-12"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b text-left">
                      <th className="px-4 py-3 font-semibold text-gray-600">Utilisateur</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-center">Adresses</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-center">Plan</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-center">Rôle</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Inscrit</th>
                      <th className="px-4 py-3"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {u.photo_url ? <img src={u.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-indigo-600">{(u.nom||u.email||'U')[0].toUpperCase()}</span>}
                              </div>
                              <span className="font-medium text-gray-900 text-sm truncate max-w-[100px]">{u.nom||'Sans nom'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.email}</td>
                          <td className="px-4 py-3 text-center font-medium">{u.adresses_count||0}</td>
                          <td className="px-4 py-3 text-center">
                            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" value={u.plan||'free'} onChange={e => handleSetPlan(u.id, e.target.value)}>
                              <option value="free">Gratuit</option>
                              <option value="premium_annual">Premium</option>
                              <option value="premium_lifetime">Lifetime</option>
                              <option value="enterprise">Entreprise</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role==='admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                              {u.role==='admin' ? '⚙️ Admin' : '👤 User'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{new Date(u.created_at).toLocaleDateString('fr')}</td>
                          <td className="px-4 py-3 text-right">
                            {u.id !== user?.id && (
                              <button onClick={() => handleToggleAdmin(u.id, u.role==='admin')} className="text-gray-400 hover:text-indigo-600 p-1 rounded" title={u.role==='admin' ? 'Retirer admin' : 'Rendre admin'}>
                                {u.role==='admin' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">Aucun utilisateur trouvé</p>}
                </div>
              )}
            </Card>
            {usersTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{(usersPage-1)*PAGE_SIZE+1}–{Math.min(usersPage*PAGE_SIZE,usersTotal)} sur {usersTotal.toLocaleString()}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={usersPage<=1} onClick={() => loadUsers(usersPage-1,searchUser)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" disabled={usersPage*PAGE_SIZE>=usersTotal} onClick={() => loadUsers(usersPage+1,searchUser)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== FORFAITS & PRIX ===== */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Gestion des forfaits</h2>
                <p className="text-sm text-gray-500 mt-0.5">Modifiez les prix et liens de paiement affichés sur la page /plans</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {plans.map(pl => (
                <Card key={pl.id} className="p-5">
                  {editingPlan === pl.id ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">{pl.name}</h3>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Prix ($)</label>
                        <Input value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} placeholder="Ex: 10" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Lien de paiement</label>
                        <Input value={editForm.link} onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))} placeholder="https://... ou mailto:..." className="mt-1" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => savePlan(pl.id)} className="flex-1">
                          <Check className="w-4 h-4 mr-1" />Sauvegarder
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{pl.name}</h3>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">{pl.price}$</p>
                        <p className="text-xs text-gray-400 mt-1 break-all">{pl.link}</p>
                      </div>
                      <button
                        onClick={() => { setEditingPlan(pl.id); setEditForm({ price: pl.price, link: pl.link }); }}
                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

          </div>
        )}

        {/* ===== API KEYS ===== */}
        {activeTab === 'api' && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Key className="w-4 h-4 text-indigo-600" />Clés API actives</h3>
              <Button variant="outline" size="sm" onClick={loadApiKeys}><RefreshCw className="w-3 h-3 mr-1" />Actualiser</Button>
            </div>
            {apiKeys.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">Aucune clé API active</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b text-left">
                    <th className="px-3 py-2.5 font-semibold text-gray-600">Utilisateur</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-600">Clé</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-600 text-center">Plan</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-600 text-right">Auj.</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-600 text-right">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {apiKeys.map(k => (
                      <tr key={k.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3"><p className="font-medium text-gray-900">{k.profiles?.nom||'Anonyme'}</p><p className="text-xs text-gray-400">{k.profiles?.email}</p></td>
                        <td className="px-3 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{k.key_prefix}</code></td>
                        <td className="px-3 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_COLORS[k.plan]||'bg-gray-100 text-gray-600'}`}>{k.plan}</span></td>
                        <td className="px-3 py-3 text-right font-bold text-indigo-600">{k.requests_today}<span className="text-gray-400 text-xs font-normal">/{k.daily_limit===-1?'∞':k.daily_limit}</span></td>
                        <td className="px-3 py-3 text-right text-gray-600">{k.requests_total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
