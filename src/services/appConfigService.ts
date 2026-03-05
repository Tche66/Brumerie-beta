// src/services/appConfigService.ts
// Écoute en temps réel la collection Firestore "appConfig"
// écrite par le tableau de bord admin
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface AppConfig {
  // ── Mode maintenance ─────────────────────────────────
  maintenanceMode:     boolean;  // Bloque toute l'app
  maintenanceMessage:  string;   // Message affiché aux users

  // ── Features on/off ──────────────────────────────────
  sellEnabled:         boolean;  // Publier une annonce
  chatEnabled:         boolean;  // Messagerie
  ordersEnabled:       boolean;  // Commandes
  referralEnabled:     boolean;  // Parrainage
  searchAlertsEnabled: boolean;  // Alertes de recherche
  pushNotifsEnabled:   boolean;  // Notifications push

  // ── Limites globales ─────────────────────────────────
  maxImagesPerProduct: number;   // Nb photos max par annonce (défaut 5)
  maxProductsFreeTier: number;   // Nb annonces max plan simple (défaut 5)

  // ── Bannière d'info ───────────────────────────────────
  bannerEnabled:       boolean;
  bannerMessage:       string;
  bannerColor:         string;   // 'green' | 'red' | 'orange'

  // ── Meta ─────────────────────────────────────────────
  updatedAt?:          any;
  updatedBy?:          string;
}

export const DEFAULT_CONFIG: AppConfig = {
  maintenanceMode:     false,
  maintenanceMessage:  'Brumerie est en maintenance. Reviens dans quelques minutes !',
  sellEnabled:         true,
  chatEnabled:         true,
  ordersEnabled:       true,
  referralEnabled:     true,
  searchAlertsEnabled: true,
  pushNotifsEnabled:   true,
  maxImagesPerProduct: 5,
  maxProductsFreeTier: 5,
  bannerEnabled:       false,
  bannerMessage:       '',
  bannerColor:         'green',
};

// Callback appelé à chaque changement de config
let _listener: ((config: AppConfig) => void) | null = null;
let _config: AppConfig = { ...DEFAULT_CONFIG };

export function getAppConfig(): AppConfig {
  return _config;
}

export function subscribeAppConfig(callback: (config: AppConfig) => void): () => void {
  _listener = callback;
  const unsub = onSnapshot(
    doc(db, 'appConfig', 'main'),
    (snap) => {
      if (snap.exists()) {
        _config = { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
      } else {
        _config = { ...DEFAULT_CONFIG };
      }
      _listener?.(_config);
    },
    () => {
      // En cas d'erreur (règles Firestore), utiliser les défauts
      _config = { ...DEFAULT_CONFIG };
      _listener?.(_config);
    }
  );
  return unsub;
}
