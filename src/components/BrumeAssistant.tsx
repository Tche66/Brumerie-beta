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

const STORAGE_KEY = 'brume-ia-history';
const HIDDEN_KEY = 'brume-ia-hidden';

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {}
}

export function BrumeAssistant({ onAction, forceOpen }: { onAction?: (action: { type: string; payload?: any }) => void; forceOpen?: boolean }) {
  const { currentUser, userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN_KEY) === 'true');
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (open && messages.length === 0 && userProfile) {
      getAssistantSuggestions(userProfile.role as any).then(setQuickSuggestions).catch(() => {});
    }
  }, [open, userProfile?.role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

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

    const userMsg: Message = { role: 'user', content: messageText, imageUrl: userImageUrl ? imagePreview! : undefined };
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
        context: userImageUrl ? { currentPage: 'image-analysis' } : undefined,
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
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je suis temporairement indisponible. Réessaie dans un moment.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    if (userProfile) {
      getAssistantSuggestions(userProfile.role as any).then(setQuickSuggestions).catch(() => {});
    }
  };

  const toggleHidden = () => {
    const newHidden = !hidden;
    setHidden(newHidden);
    localStorage.setItem(HIDDEN_KEY, String(newHidden));
    if (newHidden) setOpen(false);
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Bouton flottant */}
      {!open && !hidden && (
        <div className="fixed bottom-24 right-4 z-[100] flex flex-col items-end gap-2">
          <button
            onClick={toggleHidden}
            className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center active:scale-90 transition-all opacity-60"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 shadow-2xl shadow-green-500/30 flex items-center justify-center active:scale-90 transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
              <path d="M9 22h6"/>
            </svg>
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">
                {messages.filter(m => m.role === 'assistant').length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Modal chat */}
      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative mt-auto bg-white rounded-t-[2rem] shadow-2xl flex flex-col" style={{ maxHeight: '88vh' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-green-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-black text-slate-900">Brume IA</h3>
                <p className="text-[10px] text-green-600 font-bold">En ligne · Prêt à t'aider</p>
              </div>
              <button onClick={startNewConversation} title="Nouvelle conversation"
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all mr-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
              <button onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 200, maxHeight: '62vh' }}>
              {/* Welcome */}
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
                      <path d="M9 22h6"/>
                    </svg>
                  </div>
                  <p className="text-[13px] font-bold text-slate-700">Salut {userProfile?.name?.split(' ')[0] || ''} !</p>
                  <p className="text-[11px] text-slate-400 mt-1">Envoie-moi du texte ou une image, je t'aide !</p>

                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {quickSuggestions.slice(0, 4).map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-[10px] font-bold text-green-700 active:scale-95 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}>
                    {/* Image dans le message user */}
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden">
                        <img src={msg.imageUrl} alt="" className="w-full max-h-[150px] object-cover rounded-xl" />
                      </div>
                    )}
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Suggestions */}
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

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full mt-2 overflow-x-auto">
                      <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                        {msg.products.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => { onAction?.({ type: 'navigate', payload: { page: 'product-detail', productId: product.id } }); setOpen(false); }}
                            className="flex-shrink-0 w-[140px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm active:scale-95 transition-all text-left"
                          >
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
                              {product.flashSale && (
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-[7px] font-black rounded-md">FLASH</span>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-[10px] font-bold text-slate-800 truncate">{product.title}</p>
                              <span className="text-[11px] font-black text-green-600">{product.price.toLocaleString()} F</span>
                              <span className="text-[7px] text-slate-400 block">{product.neighborhood}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
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

            {/* Image preview */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-green-300" />
                  <button onClick={removeImage}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white rounded-b-[2rem]">
              <div className="flex items-end gap-2">
                {/* Image button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                    placeholder="Message ou image..."
                    rows={1}
                    className="w-full px-4 py-3 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none resize-none"
                    style={{ maxHeight: 100 }}
                  />
                </div>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={(!input.trim() && !imageFile) || loading}
                  className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 disabled:scale-100 shadow-lg shadow-green-200 flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
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
