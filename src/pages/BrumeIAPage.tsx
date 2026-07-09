import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chatWithAssistant, getAssistantSuggestions, trackInteraction, ProductCard } from '@/services/brumeIaService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  suggestions?: string[];
  products?: ProductCard[];
  action?: { type: string; payload?: any };
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const CONVERSATIONS_KEY = 'brume-ia-conversations';
const ACTIVE_CONV_KEY = 'brume-ia-active-conv';
const FLOAT_VISIBLE_KEY = 'brume-ia-float-visible';

function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
  } catch { return []; }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs.slice(0, 20)));
}

function getConvTitle(messages: Message[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'Nouvelle conversation';
  return first.content.slice(0, 40) + (first.content.length > 40 ? '...' : '');
}

interface BrumeIAPageProps {
  onBack: () => void;
  onAction?: (action: { type: string; payload?: any }) => void;
}

export function BrumeIAPage({ onBack, onAction }: BrumeIAPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(() => localStorage.getItem(ACTIVE_CONV_KEY));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [floatVisible, setFloatVisible] = useState(() => localStorage.getItem(FLOAT_VISIBLE_KEY) !== 'false');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeConvId) {
      const conv = conversations.find(c => c.id === activeConvId);
      if (conv) setMessages(conv.messages);
      else startNewConversation();
    } else {
      startNewConversation();
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0 && userProfile) {
      getAssistantSuggestions(userProfile.role as any).then(setQuickSuggestions).catch(() => {});
    }
  }, [messages.length, userProfile?.role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!activeConvId || messages.length === 0) return;
    const updated = conversations.map(c =>
      c.id === activeConvId ? { ...c, messages, title: getConvTitle(messages) } : c
    );
    setConversations(updated);
    saveConversations(updated);
  }, [messages]);

  const startNewConversation = () => {
    const id = 'conv_' + Date.now();
    const newConv: Conversation = { id, title: 'Nouvelle conversation', messages: [], createdAt: Date.now() };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    saveConversations(updated);
    setActiveConvId(id);
    localStorage.setItem(ACTIVE_CONV_KEY, id);
    setMessages([]);
    setDrawerOpen(false);
  };

  const switchConversation = (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
      setActiveConvId(convId);
      localStorage.setItem(ACTIVE_CONV_KEY, convId);
      setMessages(conv.messages);
    }
    setDrawerOpen(false);
  };

  const deleteConversation = (convId: string) => {
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    saveConversations(updated);
    if (activeConvId === convId) {
      if (updated.length > 0) switchConversation(updated[0].id);
      else startNewConversation();
    }
  };

  const toggleFloat = () => {
    const next = !floatVisible;
    setFloatVisible(next);
    localStorage.setItem(FLOAT_VISIBLE_KEY, String(next));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeImage = () => { setImagePreview(null); setImageFile(null); };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !imageFile) || !currentUser || !userProfile || loading) return;

    let userImageUrl: string | undefined;
    let messageText = text.trim();

    if (imageFile) {
      const reader = new FileReader();
      userImageUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
      if (!messageText) messageText = "Analyse cette image";
    }

    const userMsg: Message = { role: 'user', content: messageText, imageUrl: imagePreview || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    removeImage();
    setLoading(true);

    try {
      const response = await chatWithAssistant({
        userId: currentUser.uid,
        userRole: userProfile.role as any,
        userName: userProfile.name || '',
        userNeighborhood: (userProfile as any).neighborhood,
        message: messageText + (userImageUrl ? ' [image jointe]' : ''),
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });

      const aiMsg: Message = {
        role: 'assistant',
        content: response.message,
        suggestions: response.suggestions,
        products: response.products,
        action: response.action,
      };
      setMessages(prev => [...prev, aiMsg]);

      trackInteraction({
        userId: currentUser.uid,
        type: 'assistant-chat',
        input: { message: messageText, hasImage: !!userImageUrl },
        output: { response: response.message, action: response.action?.type },
      }).catch(() => {});

      if (response.action && response.action.type !== 'none' && onAction) {
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

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 pt-14">
          <button onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-green-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-black text-slate-900">Brume IA</h3>
            <p className="text-[10px] text-green-600 font-bold">En ligne</p>
          </div>
          <button onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
                <path d="M9 22h6"/>
              </svg>
            </div>
            <p className="text-[15px] font-bold text-slate-700">Salut {userProfile?.name?.split(' ')[0] || ''} !</p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-[260px] mx-auto">
              Je suis Brume IA, ton assistant intelligent. Pose-moi une question ou envoie une image !
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {quickSuggestions.slice(0, 6).map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="px-4 py-2.5 rounded-2xl bg-green-50 border border-green-100 text-[11px] font-bold text-green-700 active:scale-95 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-green-600 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
            }`}>
              {msg.imageUrl && (
                <div className="mb-2 rounded-xl overflow-hidden">
                  <img src={msg.imageUrl} alt="" className="w-full max-h-[180px] object-cover rounded-xl" />
                </div>
              )}
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
                  {msg.suggestions.map((s, j) => (
                    <button key={j} onClick={() => sendMessage(s)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/80 text-[9px] font-bold text-slate-700 border border-slate-200 active:scale-95 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.products && msg.products.length > 0 && (
              <div className="w-full mt-2 overflow-x-auto">
                <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                  {msg.products.map((product) => (
                    <button key={product.id}
                      onClick={() => onAction?.({ type: 'navigate', payload: { page: 'product-detail', productId: product.id } })}
                      className="flex-shrink-0 w-[140px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm active:scale-95 transition-all text-left">
                      <div className="relative w-full h-[100px] bg-slate-100">
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{product.title}</p>
                        <span className="text-[11px] font-black text-green-600">{product.price.toLocaleString()} F</span>
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
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">Brume IA réfléchit...</span>
            </div>
          </div>
        )}
      </div>

      {/* Image preview — masqué pour l'instant */}
      {false && imagePreview && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
          <div className="relative inline-block">
            <img src={imagePreview} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-green-300" />
            <button onClick={removeImage}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Input fixé en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white border-t border-slate-100" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Message..."
              rows={1}
              className="w-full px-4 py-3 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none resize-none"
              style={{ maxHeight: 100 }}
            />
          </div>
          <button onClick={() => sendMessage(input)}
            disabled={(!input.trim() && !imageFile) || loading}
            className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 shadow-lg shadow-green-200 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ═══ Drawer latéral ═══ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[300] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[280px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-left">
            {/* Drawer header */}
            <div className="px-5 pt-14 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-black text-slate-900">Conversations</h3>
                <button onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <button onClick={startNewConversation}
                className="w-full mt-3 py-3 rounded-xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Nouvelle conversation
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button key={conv.id}
                  onClick={() => switchConversation(conv.id)}
                  className={`w-full text-left px-5 py-3.5 border-b border-slate-50 flex items-center gap-3 active:bg-slate-50 transition-all ${
                    conv.id === activeConvId ? 'bg-green-50' : ''
                  }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    conv.id === activeConvId ? 'bg-green-600' : 'bg-slate-200'
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={conv.id === activeConvId ? 'white' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold truncate ${conv.id === activeConvId ? 'text-green-800' : 'text-slate-700'}`}>
                      {conv.title}
                    </p>
                    <p className="text-[9px] text-slate-400">{conv.messages.length} messages</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center opacity-40 hover:opacity-100 active:scale-90">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                    </svg>
                  </button>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-center text-[11px] text-slate-400 py-8">Aucune conversation</p>
              )}
            </div>

            {/* Drawer footer — toggle float */}
            <div className="px-5 py-4 border-t border-slate-100">
              <button onClick={toggleFloat}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 active:bg-slate-100 transition-all">
                <span className="text-[11px] font-bold text-slate-600">Bouton flottant</span>
                <div className={`w-10 h-6 rounded-full p-0.5 transition-all ${floatVisible ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${floatVisible ? 'translate-x-4' : 'translate-x-0'}`}/>
                </div>
              </button>
              <p className="text-[9px] text-slate-400 mt-1.5 px-1">
                {floatVisible ? 'Le bouton Brume IA est visible sur toutes les pages' : 'Masqué — accède à Brume IA depuis Messages'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
