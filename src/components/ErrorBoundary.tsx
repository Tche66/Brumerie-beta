import React from 'react';
import * as Sentry from '@sentry/react';

interface EBProps { children: React.ReactNode; isGuest?: boolean; onLogin?: () => void; }
interface EBState { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<EBProps, EBState> {
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
      const { isGuest, onLogin } = this.props;

      if (isGuest) {
        return (
          <div style={{ padding: 32, fontFamily: 'sans-serif', minHeight: '60vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: 360 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
              <h2 style={{ color: '#0F172A', fontSize: 18, fontWeight: 900, margin: '12px 0 8px' }}>Connecte-toi pour accéder</h2>
              <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Cette fonctionnalité est réservée aux membres. Crée ton compte gratuitement pour en profiter.
              </p>
              <button
                onClick={() => onLogin?.()}
                style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #115E2E, #16A34A)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                Se connecter / S'inscrire
              </button>
              <br/>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ padding: '10px 20px', background: 'transparent', color: '#94A3B8', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Retour
              </button>
            </div>
          </div>
        );
      }

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
    const { children } = this.props;
    return children as React.ReactElement;
  }
}

export function GuestErrorBoundary({ children, onLogin }: { children: React.ReactNode; onLogin: () => void }) {
  return <ErrorBoundary isGuest onLogin={onLogin}>{children}</ErrorBoundary>;
}
