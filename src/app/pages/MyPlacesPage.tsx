import { useEffect, useState } from 'react';
import { Link } from 'react-router';

interface SavedAddress {
  id: string;
  addressCode: string;
  ville: string;
  quartier?: string;
  repere: string;
  latitude: number;
  longitude: number;
  savedAt: string;
  label?: string; // Maison, Bureau, Boutique...
}

const LABELS = ['Maison', 'Bureau', 'Boutique', 'Entrepôt', 'Famille', 'Autre'];

export function MyPlacesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  useEffect(() => {
    const details = JSON.parse(localStorage.getItem('aw_saved_details') || '{}');
    const labels = JSON.parse(localStorage.getItem('aw_saved_labels') || '{}');
    const list = Object.values(details).map((d: any) => ({
      ...d,
      label: labels[d.addressCode] || null,
    })) as SavedAddress[];
    list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    setAddresses(list);
  }, []);

  const handleRemove = (code: string) => {
    const savedList: string[] = JSON.parse(localStorage.getItem('aw_saved_addresses') || '[]');
    const newList = savedList.filter(c => c !== code);
    localStorage.setItem('aw_saved_addresses', JSON.stringify(newList));
    const details = JSON.parse(localStorage.getItem('aw_saved_details') || '{}');
    delete details[code];
    localStorage.setItem('aw_saved_details', JSON.stringify(details));
    setAddresses(prev => prev.filter(a => a.addressCode !== code));
  };

  const handleSetLabel = (code: string, label: string) => {
    const labels = JSON.parse(localStorage.getItem('aw_saved_labels') || '{}');
    labels[code] = label;
    localStorage.setItem('aw_saved_labels', JSON.stringify(labels));
    setAddresses(prev => prev.map(a => a.addressCode === code ? { ...a, label } : a));
    setEditingLabel(null);
  };

  const LABEL_ICONS: Record<string, string> = {
    'Maison': '🏠', 'Bureau': '🏢', 'Boutique': '🏪',
    'Entrepôt': '🏭', 'Famille': '👨‍👩‍👧', 'Autre': '📍',
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link to="/" style={s.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </Link>
        <h1 style={s.title}>Mes lieux</h1>
        <Link to="/create" style={s.addBtn}>+</Link>
      </header>

      <div style={s.content}>
        {addresses.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🗺️</div>
            <p style={s.emptyTitle}>Aucun lieu sauvegardé</p>
            <p style={s.emptySub}>Ouvrez un lien Address-Web et appuyez sur "Sauvegarder" pour l'ajouter ici.</p>
            <Link to="/create" style={s.emptyBtn}>Créer une adresse</Link>
          </div>
        ) : (
          <div style={s.list}>
            {addresses.map(addr => (
              <div key={addr.addressCode} style={s.card}>
                <Link to={`/${addr.addressCode}`} style={s.cardLink}>
                  <div style={s.cardIcon}>
                    {addr.label ? LABEL_ICONS[addr.label] || '📍' : '📍'}
                  </div>
                  <div style={s.cardInfo}>
                    <div style={s.cardLabel}>{addr.label || addr.ville}</div>
                    <div style={s.cardCode}>{addr.addressCode}</div>
                    <div style={s.cardRepere}>{addr.repere}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><path d="M9 18l6-6-6-6"/></svg>
                </Link>

                <div style={s.cardActions}>
                  <button style={s.labelBtn} onClick={() => setEditingLabel(editingLabel === addr.addressCode ? null : addr.addressCode)}>
                    {addr.label ? `Étiquette : ${addr.label}` : 'Ajouter étiquette'}
                  </button>
                  <button style={s.removeBtn} onClick={() => handleRemove(addr.addressCode)}>Retirer</button>
                </div>

                {editingLabel === addr.addressCode && (
                  <div style={s.labelPicker}>
                    {LABELS.map(l => (
                      <button
                        key={l}
                        style={{...s.labelPill, ...(addr.label === l ? s.labelPillActive : {})}}
                        onClick={() => handleSetLabel(addr.addressCode, l)}
                      >
                        {LABEL_ICONS[l]} {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f8f8f6', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 },
  back: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', borderRadius: 10, background: '#f7f7f5' },
  title: { fontSize: 17, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  addBtn: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 20, fontWeight: 300 },
  content: { padding: 16, maxWidth: 600, margin: '0 auto' },
  empty: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' },
  emptySub: { fontSize: 14, color: '#888', lineHeight: 1.6, margin: '0 0 24px' },
  emptyBtn: { display: 'inline-block', padding: '12px 28px', background: '#1a1a1a', color: '#fff', borderRadius: 24, textDecoration: 'none', fontSize: 15, fontWeight: 500 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' },
  cardLink: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px', textDecoration: 'none', color: 'inherit' },
  cardIcon: { width: 44, height: 44, borderRadius: 12, background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 },
  cardCode: { fontFamily: 'monospace', fontSize: 12, color: '#888', marginBottom: 2 },
  cardRepere: { fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardActions: { display: 'flex', gap: 8, padding: '0 16px 14px', borderTop: '1px solid #f7f7f5', paddingTop: 10 },
  labelBtn: { fontSize: 12, padding: '5px 12px', background: '#f0f0f0', border: 'none', borderRadius: 20, color: '#555', cursor: 'pointer' },
  removeBtn: { fontSize: 12, padding: '5px 12px', background: 'transparent', border: 'none', borderRadius: 20, color: '#e55', cursor: 'pointer' },
  labelPicker: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 16px' },
  labelPill: { fontSize: 13, padding: '6px 14px', background: '#f7f7f5', border: '1.5px solid #e8e8e8', borderRadius: 20, cursor: 'pointer', color: '#1a1a1a' },
  labelPillActive: { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' },
};
