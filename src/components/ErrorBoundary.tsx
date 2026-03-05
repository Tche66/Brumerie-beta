import React from 'react';
import * as Sentry from '@sentry/react';

interface EBState { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
    console.error('=== CRASH BRUMERIE ===', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'sans-serif', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ fontSize: 56 }}>⚠️</div>
            <h2 style={{ color: '#e11d48', fontSize: 18, fontWeight: 900, margin: '16px 0 8px' }}>Erreur inattendue</h2>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              {this.state.error?.message || 'Une erreur inattendue est survenue.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '14px 28px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    const { children } = this.props as { children: React.ReactNode };
    return children as React.ReactElement;
  }
}
