import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chatWithAssistant, getAssistantSuggestions, trackInteraction, ProductCard } from '@/services/brumeIaService';
import { getProductById } from '@/services/productService';

const FLOAT_VISIBLE_KEY = 'brume-ia-float-visible';
const CONVERSATIONS_KEY = 'brume-ia-conversations';
const ACTIVE_CONV_KEY = 'brume-ia-active-conv';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  products?: ProductCard[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

function loadConversations(): Conversation[] {
  try { return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]'); } catch { return []; }
}
function saveConversations(convs: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs.slice(0, 20)));
}

export function BrumeAssistant({ onAction }: { onAction?: (action: { type: string; payload?: any }) => void }) {
  const { currentUser, userProfile } = useAuth();
  const [visible, setVisible] = useState(() => localStorage.getItem(FLOAT_VISIBLE_KEY) !== 'false');
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(() => localStorage.getItem(ACTIVE_CONV_KEY));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorage = () => setVisible(localStorage.getItem(FLOAT_VISIBLE_KEY) !== 'false');
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  // Charger la conversation active au montage
  useEffect(() => {
    if (activeConvId) {
      const conv = conversations.find(c => c.id === activeConvId);
      if (conv) setMessages(conv.messages);
    }
  }, []);

  useEffect(() => {
    if (open && messages.length === 0 && userProfile) {
      getAssistantSuggestions(userProfile.role as any).then(setQuickSuggestions).catch(() => {});
    }
  }, [open, userProfile?.role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Persister messages dans l'historique
  useEffect(() => {
    if (messages.length === 0) return;
    const convId = activeConvId || 'conv_' + Date.now();
    if (!activeConvId) {
      setActiveConvId(convId);
      localStorage.setItem(ACTIVE_CONV_KEY, convId);
    }
    const title = messages.find(m => m.role === 'user')?.content.slice(0, 40) || 'Conversation';
    const updated = conversations.filter(c => c.id !== convId);
    const conv: Conversation = { id: convId, title, messages, createdAt: conversations.find(c => c.id === convId)?.createdAt || Date.now() };
    const all = [conv, ...updated];
    setConversations(all);
    saveConversations(all);
  }, [messages]);

  const handleProductClick = async (productId: string) => {
    try {
      const product = await getProductById(productId);
      if (product) {
        setOpen(false);
        onAction?.({ type: 'open-product', payload: { product } });
      }
    } catch {}
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentUser || !userProfile || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAssistant({
        userId: currentUser.uid,
        userRole: userProfile.role as any,
        userName: userProfile.name || '',
        userNeighborhood: (userProfile as any).neighborhood,
        message: text.trim(),
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });

      const aiMsg: Message = {
        role: 'assistant',
        content: response.message,
        suggestions: response.suggestions,
        products: response.products && response.products.length > 0 ? response.products : undefined,
      };
      setMessages(prev => [...prev, aiMsg]);

      trackInteraction({
        userId: currentUser.uid,
        type: 'assistant-chat',
        input: { message: text.trim() },
        output: { response: response.message },
      }).catch(() => {});

      if (response.action && response.action.type !== 'none' && response.action.type !== 'show_products' && onAction) {
        onAction(response.action);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je suis temporairement indisponible. Réessaie dans un moment.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !visible) return null;

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-[100] w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 shadow-2xl shadow-green-500/30 flex items-center justify-center active:scale-90 transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
            <path d="M9 22h6"/>
          </svg>
        </button>
      )}

      {/* Bulle de chat */}
      {open && (
        <div className="fixed bottom-20 right-3 left-3 z-[200] flex flex-col" style={{ maxWidth: 400, marginLeft: 'auto' }}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-black text-slate-900">Brume IA</p>
                <p className="text-[9px] text-green-600 font-bold">En ligne</p>
              </div>
              <button onClick={() => {
                  const newId = 'conv_' + Date.now();
                  setActiveConvId(newId);
                  localStorage.setItem(ACTIVE_CONV_KEY, newId);
                  setMessages([]);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition-all" title="Nouvelle conversation">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ minHeight: 150, maxHeight: '50vh' }}>
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-[12px] font-bold text-slate-600">Salut {userProfile?.name?.split(' ')[0] || ''} !</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Comment je peux t'aider ?</p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                    {quickSuggestions.slice(0, 4).map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="px-2.5 py-1.5 rounded-xl bg-green-50 border border-green-100 text-[9px] font-bold text-green-700 active:scale-95 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}>
                    <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-200/50">
                        {msg.suggestions.map((s, j) => (
                          <button key={j} onClick={() => sendMessage(s)}
                            className="px-2 py-1 rounded-lg bg-white/80 text-[8px] font-bold text-slate-600 border border-slate-200 active:scale-95 transition-all">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Produits suggérés */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full mt-1.5 overflow-x-auto">
                      <div className="flex gap-1.5 pb-1" style={{ minWidth: 'max-content' }}>
                        {msg.products.map((product) => (
                          <button key={product.id}
                            onClick={() => handleProductClick(product.id)}
                            className="flex-shrink-0 w-[120px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm active:scale-95 transition-all text-left">
                            <div className="w-full h-[80px] bg-slate-100">
                              {product.image && <img src={product.image} alt={product.title} className="w-full h-full object-cover"/>}
                            </div>
                            <div className="p-1.5">
                              <p className="text-[9px] font-bold text-slate-800 truncate">{product.title}</p>
                              <span className="text-[10px] font-black text-green-600">{product.price?.toLocaleString()} F</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Message..."
                  className="flex-1 px-3 py-2.5 bg-slate-50 rounded-xl text-[12px] text-slate-800 placeholder:text-slate-400 outline-none border border-slate-200 focus:border-green-400"
                />
                <button onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 shadow-lg shadow-green-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
