// src/components/SystemBanner.tsx — Bannière système publiée par l'admin
import React, { useState, useEffect } from 'react';
import { subscribeActiveBanners } from '@/services/adminService';

const TYPE_STYLE = {
  info:    { bg: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', icon: 'ℹ️' },
  warning: { bg: 'linear-gradient(135deg,#F59E0B,#D97706)', icon: '⚠️' },
  promo:   { bg: 'linear-gradient(135deg,#16A34A,#115E2E)', icon: '🎉' },
};

export function SystemBanner() {
  const [banners, setBanners] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => subscribeActiveBanners(setBanners), []);

  const visible = banners.filter(b => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  const banner = visible[0];
  const style = TYPE_STYLE[banner.type as keyof typeof TYPE_STYLE] || TYPE_STYLE.info;

  return (
    <div className="mx-4 mt-2 mb-1 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg"
      style={{ background: style.bg }}>
      <span className="text-xl flex-shrink-0">{style.icon}</span>
      <p className="flex-1 text-white font-bold text-[12px] leading-snug">{banner.message}</p>
      {banner.ctaLabel && banner.ctaUrl && (
        <a href={banner.ctaUrl} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 bg-white/25 text-white font-black text-[10px] px-3 py-1.5 rounded-xl active:scale-95 transition-all">
          {banner.ctaLabel}
        </a>
      )}
      <button onClick={() => setDismissed(s => new Set([...s, banner.id]))}
        className="w-6 h-6 flex items-center justify-center text-white/70 flex-shrink-0 active:scale-90">
        ✕
      </button>
    </div>
  );
}
