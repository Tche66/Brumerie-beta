import { useState, useEffect } from 'react';
import { CartItem, getCartItems, removeFromCart, updateCartQuantity, clearCart, getCartTotal, getCartBySeller } from '@/services/cartService';

interface CartPageProps {
  onBack: () => void;
  onBuyClick: (items: CartItem[], sellerId: string) => void;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  onNavigateToOrders?: () => void;
}

export function CartPage({ onBack, onBuyClick, onProductClick, onSellerClick, onNavigateToOrders }: CartPageProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, CartItem[]>>({});

  useEffect(() => {
    loadCart();
    const handler = () => loadCart();
    window.addEventListener('cart-updated', handler);
    return () => window.removeEventListener('cart-updated', handler);
  }, []);

  function loadCart() {
    setItems(getCartItems());
    setGroupedItems(getCartBySeller());
  }

  const total = getCartTotal();
  const sellerIds = Object.keys(groupedItems);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between px-4 pt-12 pb-3">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h1 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Mon Panier</h1>
            </div>
            {onNavigateToOrders && (
              <button onClick={onNavigateToOrders}
                className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-600 active:scale-95 transition-all flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                Mes commandes
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center pt-32 px-8">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
          </div>
          <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Panier vide</p>
          <p className="text-[11px] text-slate-400 mt-2 text-center leading-relaxed">
            Ajoute des articles au panier depuis les annonces pour les acheter ensemble
          </p>
          <button onClick={onBack}
            className="mt-8 px-8 py-4 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-green-200">
            Explorer les articles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-44">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">
              Mon Panier
              <span className="ml-2 text-[11px] font-bold text-slate-400">({items.length})</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToOrders && (
              <button onClick={onNavigateToOrders}
                className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-600 active:scale-95 transition-all flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                Commandes
              </button>
            )}
            <button onClick={() => { clearCart(); loadCart(); }}
              className="px-2.5 py-2 rounded-xl text-[10px] font-bold text-red-400 active:scale-95 transition-all">
              Vider
            </button>
          </div>
        </div>
      </div>

      {/* Cart items grouped by seller */}
      <div className="px-4 pt-4 space-y-4">
        {sellerIds.map(sellerId => {
          const sellerItems = groupedItems[sellerId];
          const sellerName = sellerItems[0]?.sellerName || 'Vendeur';
          const sellerTotal = sellerItems.reduce((s, i) => s + i.price * i.quantity, 0);

          return (
            <div key={sellerId} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              {/* Seller header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0 cursor-pointer"
                  onClick={() => onSellerClick?.(sellerId)}>
                  {sellerItems[0]?.sellerPhoto
                    ? <img src={sellerItems[0].sellerPhoto} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">{sellerName.charAt(0)}</div>
                  }
                </div>
                <p className="text-[11px] font-black text-slate-700 flex-1 truncate cursor-pointer"
                  onClick={() => onSellerClick?.(sellerId)}>
                  {sellerName}
                </p>
                <button
                  onClick={() => onBuyClick(sellerItems, sellerId)}
                  className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all">
                  Commander
                </button>
              </div>

              {/* Items */}
              {sellerItems.map(item => (
                <div key={item.productId} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer"
                    onClick={() => onProductClick?.(item.productId)}>
                    {item.image
                      ? <img src={item.image} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{item.title}</p>
                    <p className="text-[13px] font-black text-slate-900 mt-0.5">
                      {item.price.toLocaleString('fr-FR')} <span className="text-[9px] font-bold text-slate-400">FCFA</span>
                    </p>

                    {/* Quantity control */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => { updateCartQuantity(item.productId, item.quantity - 1); loadCart(); }}
                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                      <span className="text-[12px] font-black text-slate-800 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => { updateCartQuantity(item.productId, item.quantity + 1); loadCart(); }}
                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => { removeFromCart(item.productId); loadCart(); }}
                    className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center active:scale-90 transition-all flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}

              {/* Seller subtotal */}
              <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sous-total</span>
                <span className="text-[13px] font-black text-slate-900">
                  {sellerTotal.toLocaleString('fr-FR')} <span className="text-[9px] font-bold text-slate-400">FCFA</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer total + Commander */}
      <div className="fixed bottom-20 left-0 right-0 z-40" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="mx-4 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total panier</span>
            <span className="text-[18px] font-black text-slate-900">
              {total.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-400">FCFA</span>
            </span>
          </div>
          {sellerIds.length > 1 && (
            <p className="text-[9px] text-slate-400 mb-3 text-center">
              {sellerIds.length} vendeurs · Commande séparée par vendeur
            </p>
          )}
          <button
            onClick={() => {
              if (sellerIds.length === 1) {
                onBuyClick(items, sellerIds[0]);
              }
            }}
            disabled={sellerIds.length > 1}
            className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
              sellerIds.length > 1
                ? 'bg-slate-100 text-slate-400 cursor-default'
                : 'bg-green-600 text-white shadow-lg shadow-green-200'
            }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            {sellerIds.length > 1 ? 'Commander par vendeur ci-dessus' : 'Commander tout'}
          </button>
        </div>
      </div>
    </div>
  );
}
