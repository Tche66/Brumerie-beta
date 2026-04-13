// src/components/RiskBadge.tsx
// Badge de niveau de risque — affiché sur profils et dans les alertes vendeur
import React from 'react';
import { RiskLevel, RISK_LABELS } from '@/services/trustService';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskBadge({ level, size = 'md', showLabel = true }: RiskBadgeProps) {
  if (level === 'safe') return null; // ne rien afficher pour les fiables

  const cfg = RISK_LABELS[level];
  const sizeClass = size === 'sm'
    ? 'text-[8px] px-2 py-0.5 gap-1'
    : size === 'lg'
    ? 'text-[13px] px-4 py-2 gap-2'
    : 'text-[10px] px-3 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-black rounded-full border ${sizeClass}`}
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.color + '33',
      }}>
      <span>{cfg.icon}</span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}

// Alerte vendeur — bandeau discret avant commande
interface RiskAlertBannerProps {
  level: RiskLevel;
  reportCount: number;
  userName: string;
}

export function RiskAlertBanner({ level, reportCount, userName }: RiskAlertBannerProps) {
  if (level === 'safe') return null;

  const isBanned = level === 'banned';
  const isRisk   = level === 'risk';

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3 border-2"
      style={{
        background: isBanned ? '#450A0A' : isRisk ? '#FEF2F2' : '#FEF3C7',
        borderColor: isBanned ? '#991B1B' : isRisk ? '#DC2626' : '#D97706',
      }}>
      <span className="text-2xl flex-shrink-0 mt-0.5">
        {isBanned ? '🚫' : isRisk ? '⚠️' : '👁️'}
      </span>
      <div className="flex-1">
        <p className={`font-black text-[12px] mb-1 ${isBanned ? 'text-red-200' : isRisk ? 'text-red-900' : 'text-amber-900'}`}>
          {isBanned
            ? `${userName} est banni de Brumerie`
            : isRisk
            ? `⚠️ ${userName} est signalé comme À RISQUE`
            : `👁️ ${userName} est sous surveillance`}
        </p>
        <p className={`text-[10px] leading-snug ${isBanned ? 'text-red-300' : isRisk ? 'text-red-700' : 'text-amber-700'}`}>
          {isBanned
            ? 'Ce compte a été banni suite à de multiples arnaques confirmées. Refuse cette commande.'
            : `Signalé par ${reportCount} membre${reportCount > 1 ? 's' : ''} de la communauté Brumerie. Sois prudent(e) — demande le paiement à l'avance.`}
        </p>
      </div>
    </div>
  );
}
