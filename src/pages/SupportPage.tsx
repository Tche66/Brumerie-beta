import React, { useState } from 'react';
import { ChevronLeft, MessageCircle, Mail, Youtube } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-12 font-sans">
      {/* Header Premium */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 active:scale-90 transition-all"
        >
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Aide & Support</h1>
      </div>

      <div className="px-6 py-8 space-y-10 animate-fade-up">
        
        {/* Contact Cards XL */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleWhatsApp}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all group"
          >
            <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
              <MessageCircle size={22} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">WhatsApp</p>
            <p className="text-xs text-green-600 font-medium mt-1">Direct</p>
          </button>

          <a
            href={`mailto:support@brumerie.com`}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all block"
          >
            <div className="w-14 h-14 mx-auto bg-slate-900 rounded-xl flex items-center justify-center mb-4">
              <Mail size={22} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Email</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Sous 24h</p>
          </a>
        </div>

        {/* YouTube */}
        <a href={ytLink} target="_blank" rel="noopener noreferrer"
          className="bg-white dark:bg-slate-800 rounded-xl p-5 flex items-center gap-4 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all block">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
            <Youtube size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">Tutoriels Video</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Chaine YouTube Brumerie</p>
          </div>
          <ChevronLeft size={18} className="text-slate-300 rotate-180" />
        </a>

        {/* Communauté */}
        {(config.whatsappCommunity || config.telegramCommunity || config.facebookGroup) && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">Rejoins la communaute</p>
            <div className="space-y-2">
              {config.whatsappCommunity && (
                <a href={config.whatsappCommunity} target="_blank" rel="noopener noreferrer"
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all block">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                    <MessageCircle size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Groupe WhatsApp</p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">Communaute Brumerie</p>
                  </div>
                  <ChevronLeft size={16} className="text-slate-300 rotate-180" />
                </a>
              )}
              {config.telegramCommunity && (
                <a href={config.telegramCommunity} target="_blank" rel="noopener noreferrer"
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all block">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2AABEE,#229ED9)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.023 9.531c-.144.665-.539.826-1.093.514l-3.013-2.22-1.455 1.401c-.16.16-.295.295-.607.295l.215-3.063 5.588-5.048c.243-.215-.053-.334-.376-.119L6.54 14.605l-2.964-.924c-.645-.203-.658-.645.134-.954l11.57-4.461c.537-.194 1.006.131.282.982z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Groupe Telegram</p>
                    <p className="text-xs text-blue-500 font-medium mt-0.5">Communaute Brumerie</p>
                  </div>
                  <ChevronLeft size={16} className="text-slate-300 rotate-180" />
                </a>
              )}
              {config.facebookGroup && (
                <a href={config.facebookGroup} target="_blank" rel="noopener noreferrer"
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all block">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1877F2,#0D5DBD)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.098 10.125 24v-8.437H7.078V12.07h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796V24C19.612 23.098 24 18.1 24 12.073z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Groupe Facebook</p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">Communaute Brumerie</p>
                  </div>
                  <ChevronLeft size={16} className="text-slate-300 rotate-180" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* FAQ Premium */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">Questions frequentes</p>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-50 dark:divide-slate-700">
            {[
              { q: 'Comment contacter un vendeur ?', a: "Clique sur l'article puis sur le bouton discuter. Tu discuteras en direct avec lui." },
              { q: 'Comment publier un article ?', a: "Appuie sur le bouton (+) en bas de l'écran. Ajoute tes photos, le titre, le prix et ton quartier. C'est gratuit ! ⚠️ Si tu as des difficultés à publier, assure-toi d'avoir une photo de profil — c'est obligatoire pour éviter les faux profils et renforcer la confiance. Tu peux l'ajouter dans Paramètres → Modifier mon profil." },
              { q: 'Badge Vendeur Vérifié ?', a: "C'est un badge qui indique que Brumerie a contrôlé ton identité. Il ne garantit pas la qualité des produits ni le déroulement des transactions. Demande-le dans tes paramètres pour 3 000 FCFA." },
              { q: 'Supprimer une annonce ?', a: "Va sur ton profil, clique sur ton annonce, et utilise les options de gestion." },
            ].map((faq, i) => (
              <details key={i} className="py-4 first:pt-0 last:pb-0 group">
                <summary className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer list-none flex items-center justify-between group-open:text-green-600 transition-colors">
                  {faq.q}
                  <div className="w-6 h-6 rounded-md bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-open:rotate-180 transition-transform">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                       <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </summary>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-medium bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Feedback Form XL */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">Envoyer un message</p>
          {!sent ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {FEEDBACK_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`py-4 px-2 rounded-lg border-2 text-center transition-all ${
                      type === t.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <p className="text-xs font-medium">{t.label}</p>
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Dis-nous tout..."
                rows={5}
                className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-600 transition-all outline-none resize-none mb-6 dark:text-white dark:placeholder-slate-400"
              />

              <div className="space-y-3">
                <button
                  onClick={handleWhatsApp}
                  className="w-full py-4 rounded-lg font-semibold text-sm text-white shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  <MessageCircle size={16} className="text-white" />
                  WhatsApp Direct
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={!type || !message.trim()}
                  className="w-full py-4 rounded-lg bg-slate-900 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-30"
                >
                  Envoyer par Email
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-10 text-center border-2 border-green-100 dark:border-green-800 animate-fade-up">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
              </div>
              <p className="text-green-900 dark:text-green-300 font-semibold text-lg">C'est envoye !</p>
              <p className="text-green-700 dark:text-green-400 text-xs mt-2 font-medium leading-relaxed">
                On s'occupe de toi <br/> sous 24h maximum.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-8 text-xs font-semibold text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-700 pb-1"
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
