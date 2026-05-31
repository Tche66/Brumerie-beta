// src/services/boostService.ts — migré vers backend NestJS
import { boostsApi } from './apiClient';
import { ProductBoost, BoostDuration } from '@/types';

// ── Créer une demande de boost ────────────────────────────────────
export async function createBoost(params: {
  productId: string;
  productTitle?: string;
  sellerId: string;
  sellerName?: string;
  duration: BoostDuration;
  waveRef?: string;
}): Promise<string> {
  const boost = await boostsApi.create(params.productId, params.duration, params.waveRef) as any;
  return boost.id;
}

// ── ADMIN — Activer un boost ──────────────────────────────────────
export async function activateBoost(boostId: string, adminUid: string): Promise<void> {
  await boostsApi.activate(boostId);
}

// ── ADMIN — Rejeter un boost ──────────────────────────────────────
export async function rejectBoost(boostId: string, adminUid: string, reason?: string): Promise<void> {
  await boostsApi.reject(boostId, reason);
}

// ── IDs des produits boostés actifs ──────────────────────────────
export async function getBoostedProductIds(): Promise<Set<string>> {
  try {
    const ids = await boostsApi.getActive() as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

// ── Écouter les boosts en attente (admin) — polling ──────────────
export function subscribePendingBoosts(
  callback: (boosts: ProductBoost[]) => void,
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const boosts = await boostsApi.getPending() as ProductBoost[];
      callback(boosts);
    } catch { callback([]); }
    if (active) setTimeout(poll, 10000); // poll toutes les 10s
  };

  poll();
  return () => { active = false; };
}

// ── Écouter tous les boosts (admin) ──────────────────────────────
export function subscribeAllBoosts(
  callback: (boosts: ProductBoost[]) => void,
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const boosts = await boostsApi.getActive() as any;
      callback(boosts);
    } catch { callback([]); }
    if (active) setTimeout(poll, 10000);
  };

  poll();
  return () => { active = false; };
}

// ── Écouter les produits boostés actifs ──────────────────────────
export function subscribeBoostedProductIds(
  callback: (ids: Set<string>) => void,
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const ids = await boostsApi.getActive() as string[];
      callback(new Set(ids));
    } catch { callback(new Set()); }
    if (active) setTimeout(poll, 30000); // poll toutes les 30s
  };

  poll();
  return () => { active = false; };
}
