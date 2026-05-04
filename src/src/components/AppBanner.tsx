// src/components/AppBanner.tsx
// Bannière d'info + écran de maintenance — contrôlés par l'admin en temps réel
import React from 'react';
import { AppConfig } from '@/services/appConfigService';

// ── Bannière d'info ───────────────────────────────────────────
export function AppBanner({ config }: { config: AppConfig }) {
  if (!config.bannerEnabled || !config.bannerMessage) return null;

  const colors = {
    green:  { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', icon: '📢' },
    red:    { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', icon: '🚨' },
    orange: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', icon: '⚠️' },
  };
  const c = colors[config.bannerColor as keyof typeof colors] || colors.green;

  return (
    <div style={{
      background: c.bg, borderBottom: `2px solid ${c.border}`,
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <span style={{ fontSize: '14px' }}>{c.icon}</span>
      <p style={{ fontSize: '12px', fontWeight: 700, color: c.text, flex: 1, lineHeight: 1.4 }}>
        {config.bannerMessage}
      </p>
    </div>
  );
}

// ── Écran de maintenance ───────────────────────────────────────
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0F172A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔧</div>
      <h1 style={{
        fontFamily: 'system-ui, sans-serif', fontWeight: 900,
        fontSize: '22px', color: '#fff', marginBottom: '12px', letterSpacing: '-0.5px',
      }}>
        Maintenance en cours
      </h1>
      <p style={{
        fontSize: '14px', color: 'rgba(255,255,255,0.5)',
        maxWidth: '300px', lineHeight: 1.6, marginBottom: '32px',
      }}>
        {message || 'Brumerie est temporairement indisponible. Reviens dans quelques minutes !'}
      </p>
      <div style={{
        background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)',
        borderRadius: '16px', padding: '12px 24px',
        fontSize: '11px', fontWeight: 700, color: '#4ADE80',
        textTransform: 'uppercase', letterSpacing: '2px',
      }}>
        🛍 Brumerie
      </div>
    </div>
  );
}

// ── Écran feature désactivée ──────────────────────────────────
export function FeatureDisabled({ feature }: { feature: string }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
        Fonctionnalité indisponible
      </h2>
      <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '260px', lineHeight: 1.6 }}>
        {feature} est temporairement désactivé par l'équipe Brumerie.
      </p>
    </div>
  );
}
