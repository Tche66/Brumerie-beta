import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Nettoyer IndexedDB Firebase corrompu au premier chargement apres migration
if (!localStorage.getItem('idb_cleaned_v1')) {
  indexedDB.databases?.().then(dbs => {
    dbs.forEach(d => { if (d.name) indexedDB.deleteDatabase(d.name); });
  }).catch(() => {});
  localStorage.setItem('idb_cleaned_v1', '1');
}

// Render en priorité — tout le reste est non-bloquant
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Cacher le splash dès que React est monté
(window as any).__hideSplash?.();

// ── Chargement différé : Analytics + Sentry (après le render) ──
requestIdleCallback(() => {
  import("@vercel/analytics").then(m => m.inject()).catch(() => {});
  import("@vercel/speed-insights").then(m => m.injectSpeedInsights()).catch(() => {});

  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  if (SENTRY_DSN) {
    import("@sentry/react").then(Sentry => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        ignoreErrors: ["Failed to fetch", "NetworkError", "Load failed", "Firebase: Error", "ChunkLoadError"],
      });
    }).catch(() => {});
  }
}, { timeout: 3000 });
