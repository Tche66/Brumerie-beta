import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

// ── Sentry : monitoring erreurs production ─────────────────────
// Actif uniquement en production (pas en local dev)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE, // "production" ou "development"
    // Ne capture que 20% des sessions pour le suivi de performance (gratuit)
    tracesSampleRate: 0.2,
    // Ignore les erreurs réseau banales (offline, Firebase timeout)
    ignoreErrors: [
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      "Firebase: Error",
      "ChunkLoadError",
    ],
    beforeSend(event) {
      // Ne jamais envoyer en mode dev si DSN absent
      if (!SENTRY_DSN) return null;
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
