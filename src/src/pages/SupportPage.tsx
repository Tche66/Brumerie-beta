import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendFeedbackViaEmail } from '@/services/productService';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from '@/types';
import { getAppConfig, subscribeAppConfig, AppConfig } from '@/services/appConfigService';

interface SupportPageProps {
  onBack: () => void;
}

const FEEDBACK_TYPES = [
  { id: 'question', label: 'Question' },
  { id: 'bug', label: 'Bug' },
  { id: 'suggestion', label: 'Idée' },
  { id: 'complaint', label: 'Plainte' },
];

export function SupportPage({ onBack }: SupportPageProps) {
  const { userProfile } = useAuth();
  const [type, setType] = useState<string>('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendEmail = () => {
    if (!type || !message.trim()) return;
    const link = sendFeedbackViaEmail({
      type,
      message: message.trim(),
      name: userProfile?.name || 'Utilisateur',
      email: userProfile?.email || '',
    });
    window.open(link, '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  const handleWhatsApp = () => {
    const msg = `Bonjour Brumerie Support 👋\n\nJe suis ${userProfile?.name || 'un utilisateur'} et j'ai besoin d'aide :\n\n${message || '...'}`;
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const [config, setConfig] = React.useState<AppConfig>(getAppConfig());
  React.useEffect(() => {
    const unsub = subscribeAppConfig(cfg => setConfig(cfg));
    return unsub;
  }, []);
  const ytLink = config.youtubeChannel || 'https://youtube.com/@brumerie';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">
      {/* Header Premium */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button 
          onClick={onBack} 
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-bold text-sm uppercase tracking-widest text-slate-900">Aide & Support</h1>
      </div>

      <div className="px-6 py-8 space-y-10 animate-fade-up">
        
        {/* Contact Cards XL */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleWhatsApp}
            className="bg-white rounded-[2.5rem] p-6 text-center border border-slate-100 shadow-xl shadow-slate-200/50 active:scale-95 transition-all group"
          >
            <div className="w-14 h-14 mx-auto rounded-[1.5rem] flex items-center justify-center mb-4 shadow-lg shadow-green-100"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.956 9.956 0 01-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.99 2C6.465 2 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977A9.97 9.97 0 0011.99 2z"/></svg>
            </div>
            <p className="text-[13px] font-black text-slate-900 uppercase tracking-tighter">WhatsApp</p>
            <p className="text-[10px] text-green-600 font-bold mt-1 uppercase">Direct</p>
          </button>

          <a
            href={`mailto:support@brumerie.com`}
            className="bg-white rounded-[2.5rem] p-6 text-center border border-slate-100 shadow-xl shadow-slate-200/50 active:scale-95 transition-all block"
          >
            <div className="w-14 h-14 mx-auto bg-slate-900 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-lg shadow-slate-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <p className="text-[13px] font-black text-slate-900 uppercase tracking-tighter">Email</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Sous 24h</p>
          </a>
        </div>

        {/* YouTube */}
        <a href={ytLink} target="_blank" rel="noopener noreferrer"
          className="bg-white rounded-[2.5rem] p-5 flex items-center gap-4 border border-slate-100 shadow-xl shadow-slate-200/50 active:scale-95 transition-all block">
          <div className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M23 7s-.3-2-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.2 3 12 3 12 3s-4.2 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.7c1.1 1.2 2.6 1.1 3.3 1.2C7.2 21.4 12 21.5 12 21.5s4.2 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.7 1.2-2.7 1.2-2.7s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.4l6.6 3.6-6.6 3.5z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[13px]">Tutoriels Vidéo</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Chaîne YouTube Brumerie</p>
          </div>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-slate-300">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

        {/* Communauté */}
        {(config.whatsappCommunity || config.telegramCommunity || config.facebookGroup) && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Rejoins la communauté</p>
            <div className="space-y-2">
              {config.whatsappCommunity && (
                <a href={config.whatsappCommunity} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-[2rem] p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-95 transition-all block">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.956 9.956 0 01-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.99 2C6.465 2 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977A9.97 9.97 0 0011.99 2z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-[13px]">Groupe WhatsApp</p>
                    <p className="text-[10px] text-green-600 font-bold mt-0.5">Communauté Brumerie</p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-slate-200"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                </a>
              )}
              {config.telegramCommunity && (
                <a href={config.telegramCommunity} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-[2rem] p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-95 transition-all block">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2AABEE,#229ED9)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.023 9.531c-.144.665-.539.826-1.093.514l-3.013-2.22-1.455 1.401c-.16.16-.295.295-.607.295l.215-3.063 5.588-5.048c.243-.215-.053-.334-.376-.119L6.54 14.605l-2.964-.924c-.645-.203-.658-.645.134-.954l11.57-4.461c.537-.194 1.006.131.282.982z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-[13px]">Groupe Telegram</p>
                    <p className="text-[10px] text-blue-500 font-bold mt-0.5">Communauté Brumerie</p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-slate-200"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                </a>
              )}
              {config.facebookGroup && (
                <a href={config.facebookGroup} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-[2rem] p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-95 transition-all block">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1877F2,#0D5DBD)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.098 10.125 24v-8.437H7.078V12.07h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796V24C19.612 23.098 24 18.1 24 12.073z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-[13px]">Groupe Facebook</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">Communauté Brumerie</p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-slate-200"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* FAQ Premium */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Questions fréquentes</p>
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 divide-y divide-slate-50">
            {[
              { q: 'Comment contacter un vendeur ?', a: "Clique sur l'article puis sur le bouton discuter. Tu discuteras en direct avec lui." },
              { q: 'Comment publier un article ?', a: "Appuie sur le bouton (+) en bas de l'écran. Ajoute tes photos, le titre, le prix et ton quartier. C'est gratuit ! ⚠️ Si tu as des difficultés à publier, assure-toi d'avoir une photo de profil — c'est obligatoire pour éviter les faux profils et renforcer la confiance. Tu peux l'ajouter dans Paramètres → Modifier mon profil." },
              { q: 'Badge Vendeur Vérifié ?', a: "C'est un badge qui indique que Brumerie a contrôlé ton identité. Il ne garantit pas la qualité des produits ni le déroulement des transactions. Demande-le dans tes paramètres pour 3 000 FCFA." },
              { q: 'Supprimer une annonce ?', a: "Va sur ton profil, clique sur ton annonce, et utilise les options de gestion." },
            ].map((faq, i) => (
              <details key={i} className="py-4 first:pt-0 last:pb-0 group">
                <summary className="text-[13px] font-bold text-slate-800 cursor-pointer list-none flex items-center justify-between group-open:text-green-600 transition-colors">
                  {faq.q}
                  <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center group-open:rotate-180 transition-transform">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                       <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </summary>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Feedback Form XL */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Envoyer un message</p>
          {!sent ? (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/60">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {FEEDBACK_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`py-4 px-2 rounded-2xl border-2 text-center transition-all ${
                      type === t.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'border-slate-50 bg-slate-50 text-slate-400 font-bold'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-tighter">{t.label}</p>
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Dis-nous tout..."
                rows={5}
                className="w-full px-6 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-medium focus:ring-2 focus:ring-green-600 transition-all outline-none resize-none mb-6"
              />

              <div className="space-y-3">
                <button
                  onClick={handleWhatsApp}
                  className="w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.956 9.956 0 01-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.99 2C6.465 2 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977A9.97 9.97 0 0011.99 2z"/></svg>WhatsApp Direct</span>
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={!type || !message.trim()}
                  className="w-full py-5 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl active:scale-[0.98] transition-all disabled:opacity-30"
                >
                  Envoyer par Email
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-[2.5rem] p-10 text-center border-2 border-green-100 animate-fade-up">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
              </div>
              <p className="text-green-900 font-black text-lg uppercase tracking-tight">C'est envoyé !</p>
              <p className="text-green-700 text-[11px] mt-2 font-bold uppercase leading-relaxed">
                On s'occupe de toi <br/> sous 24h maximum.
              </p>
              <button 
                onClick={() => setSent(false)} 
                className="mt-8 text-[10px] font-black text-green-600 uppercase tracking-widest border-b-2 border-green-200 pb-1"
              >
                Envoyer un autre message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
