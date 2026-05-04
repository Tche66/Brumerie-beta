// src/components/ConfirmModal.tsx — Modal custom qui remplace window.confirm()
import React from 'react';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible, title, message,
  confirmLabel = 'Confirmer', cancelLabel = 'Annuler',
  danger = false, onConfirm, onCancel
}: ConfirmModalProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-scale-in">
        {/* Icône */}
        <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 ${danger ? 'bg-red-50' : 'bg-slate-50'}`}>
          {danger ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          )}
        </div>
        <h2 className="font-black text-slate-900 text-[17px] text-center mb-2 leading-tight">{title}</h2>
        <p className="text-slate-500 text-[12px] text-center font-medium leading-relaxed mb-7">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg ${
              danger ? 'bg-red-500 shadow-red-200' : 'bg-slate-900 shadow-slate-200'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
