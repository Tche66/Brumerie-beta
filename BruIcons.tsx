// src/components/BruIcons.tsx — Bibliothèque SVG Brumerie
// Remplace tous les emojis fonctionnels du code (hors catégories)
import React from 'react';

type P = { size?: number; color?: string; strokeWidth?: number; className?: string };
const d = (size = 18, color = 'currentColor', sw = 2) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: color, strokeWidth: sw,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const BruIcons = {
  // ── Navigation / Actions ──────────────────────────────────────
  Home:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  Back:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>,
  Forward:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>,
  Chevron:  ({ size = 14, color = 'currentColor' }: P) => <svg {...d(size, color, 2.5)}><path d="M9 18l6-6-6-6"/></svg>,
  ChevronD: ({ size = 14, color = 'currentColor' }: P) => <svg {...d(size, color, 2.5)}><path d="M6 9l6 6 6-6"/></svg>,
  Close:    ({ size = 16, color = 'currentColor' }: P) => <svg {...d(size, color, 2.5)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Settings: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Menu:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Share:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Copy:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Download: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Refresh:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  QRCode:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M21 21v-4h-4v4M17 17h.01M21 17h.01M17 21h.01"/></svg>,

  // ── Utilisateur & Profil ──────────────────────────────────────
  User:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Users:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  UserPlus: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  UserMinus:({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  Shield:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ShieldCheck: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Lock:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Unlock:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
  Eye:      ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>,
  Award:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Star:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  StarFilled: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)} fill={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,

  // ── Commerce ──────────────────────────────────────────────────
  Store:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  ShoppingBag: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Cart:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-8.42H6"/></svg>,
  Package:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Tag:      ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Gift:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
  Percent:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  Bookmark: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  Heart:    ({ size = 18, color = 'currentColor', strokeWidth = 2 }: P) => <svg {...d(size, color, strokeWidth)}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  HeartFilled: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)} fill={color}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Wishlist: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,

  // ── Livraison & Logistique ────────────────────────────────────
  Truck:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  MapPin:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Navigation: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  Route:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/></svg>,

  // ── Communication ─────────────────────────────────────────────
  MessageCircle: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  MessageSquare: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Bell:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  BellOff:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5M1 1l22 22"/></svg>,
  Phone:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.19 2 2 0 012 .01h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91A16 16 0 0016 17.91l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 18.92v-2z"/></svg>,
  PhoneCall: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94m-1 7.98v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.19 2 2 0 012 .01h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91A16 16 0 0016 17.91l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 18.92v-2z"/></svg>,
  Mail:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Send:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Broadcast: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M2 20h.01M7 20v-4M12 20V10M17 20v-8M22 4v16"/></svg>,

  // ── Finance ───────────────────────────────────────────────────
  Wallet:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Money:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  TrendUp:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  TrendDown:({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  BarChart: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  PieChart: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z"/></svg>,
  Receipt:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M14 2H6a2 2 0 00-2 2v16l2-1 2 1 2-1 2 1 2-1 2 1V4a2 2 0 00-2-2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  Credit:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,

  // ── Media & Contenu ───────────────────────────────────────────
  Camera:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Image:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Video:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  File:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  FileText: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Catalog:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,

  // ── Temps & Statuts ───────────────────────────────────────────
  Clock:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Calendar: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Check:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color, 2.5)}><polyline points="20 6 9 17 4 12"/></svg>,
  CheckCircle: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  AlertTriangle: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  AlertCircle: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Info:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Zap:      ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Flame:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.045.135-2.06.5-3z"/></svg>,

  // ── Livraison spécifique ──────────────────────────────────────
  Moto:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-5l-3 6h11l-3-6z"/><path d="M10 6l2-4M19 6l2 4"/></svg>,
  Radar:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>,
  Medal:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Trophy:   ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polyline points="8 15 8 21 16 21 16 15"/><line x1="12" y1="21" x2="12" y2="17"/><path d="M20.79 9.21C21.57 8.18 22 6.88 22 5H2c0 1.88.43 3.18 1.21 4.21"/><path d="M7 5s0 6 5 6 5-6 5-6"/></svg>,

  // ── Outils vendeur ────────────────────────────────────────────
  Calculator: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="8" y2="14"/><line x1="11" y1="11" x2="8" y2="11"/><line x1="16" y1="17" x2="13" y2="17"/><line x1="11" y1="17" x2="8" y2="17"/></svg>,
  Notebook:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  Margin:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Report:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Debt:      ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="8" y1="15" x2="16" y2="15"/></svg>,

  // ── Divers ────────────────────────────────────────────────────
  Palette:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="13.5" cy="6.5" r=".5" fill={color}/><circle cx="17.5" cy="10.5" r=".5" fill={color}/><circle cx="8.5" cy="7.5" r=".5" fill={color}/><circle cx="6.5" cy="12.5" r=".5" fill={color}/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>,
  Flash:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Globe:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Link:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  Trash:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Edit:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Plus:     ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color, 2.5)}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus:    ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color, 2.5)}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ExternalLink: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Thumbsup: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>,
  Thumbsdown: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)}><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>,
  Verified: ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)} fill={color}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Premium:  ({ size = 18, color = 'currentColor' }: P) => <svg {...d(size, color)} fill={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

export type IconName = keyof typeof BruIcons;
