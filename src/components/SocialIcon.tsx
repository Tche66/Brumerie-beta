// src/components/SocialIcon.tsx — Logos officiels réseaux sociaux
import React from 'react';

export type SocialNetwork = 'instagram' | 'tiktok' | 'facebook' | 'twitter';

const LOGOS: Record<SocialNetwork, string> = {
  instagram: '/assets/social/instagram.jpg',
  tiktok:    '/assets/social/tiktok.jpg',
  facebook:  '/assets/social/facebook.png',
  twitter:   '/assets/social/twitter.jpg',
};

const LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  facebook:  'Facebook',
  twitter:   'X (Twitter)',
};

function buildUrl(network: SocialNetwork, raw: string): string {
  if (!raw) return '#';
  if (raw.startsWith('http')) return raw;
  const handle = raw.replace('@', '');
  const bases: Record<SocialNetwork, string> = {
    instagram: 'https://instagram.com/',
    tiktok:    'https://tiktok.com/@',
    facebook:  'https://facebook.com/',
    twitter:   'https://x.com/',
  };
  return bases[network] + handle;
}

interface SocialIconProps {
  network: SocialNetwork;
  url: string;
  size?: number;
  showLabel?: boolean;
}

export function SocialIcon({ network, url, size = 36, showLabel = false }: SocialIconProps) {
  return (
    <a href={buildUrl(network, url)} target="_blank" rel="noopener noreferrer"
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className="flex items-center gap-2 active:scale-90 transition-transform">
      <div style={{ width: size, height: size, borderRadius: size / 4.5, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
        <img src={LOGOS[network]} alt={LABELS[network]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {showLabel && <span className="text-[11px] font-bold text-slate-700">{LABELS[network]}</span>}
    </a>
  );
}

// Bande de logos — utilisable partout
export function SocialBar({ links, size = 36 }: {
  links: Partial<Record<SocialNetwork, string>>;
  size?: number;
}) {
  const entries = (Object.entries(links) as [SocialNetwork, string][]).filter(([, v]) => v?.trim());
  if (!entries.length) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      {entries.map(([network, url]) => (
        <React.Fragment key={network}>
          <SocialIcon network={network} url={url} size={size} />
        </React.Fragment>
      ))}
    </div>
  );
}
