export const ADMIN_UID = (import.meta as any).env?.VITE_ADMIN_UID || '';

export const fmt = (n: number) => n.toLocaleString('fr-FR');

export const fmtDate = (ts: any) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const timeLeft = (ts: any) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  return h > 24 ? `${Math.floor(h / 24)}j ${h % 24}h` : `${h}h ${Math.floor((diff % 3600000) / 60000)}m`;
};

export const STATUS_COLORS: Record<string, string> = {
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

export function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-black text-[22px] ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{sub}</p>}
    </div>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${color}`}>{label}</span>;
}

export type Tab = 'stats' | 'boosts' | 'users' | 'livreurs' | 'products' | 'orders' | 'analytics' | 'brume-ia' | 'territories' | 'categories' | 'broadcast' | 'settings' | 'logs' | 'trust';
