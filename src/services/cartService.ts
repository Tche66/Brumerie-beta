import { Product } from '@/types';

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  neighborhood?: string;
  quantity: number;
  addedAt: number;
}

const CART_KEY = 'brumerie_cart';

function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export function getCartItems(): CartItem[] {
  return getCart();
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

export function addToCart(product: Product, quantity = 1): void {
  const items = getCart();
  const existing = items.find(i => i.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      productId: product.id,
      title: product.title || '',
      price: product.price || 0,
      image: product.images?.[0] || '',
      sellerId: product.sellerId || '',
      sellerName: product.sellerName || '',
      sellerPhoto: (product as any).sellerPhoto || '',
      neighborhood: product.neighborhood || '',
      quantity,
      addedAt: Date.now(),
    });
  }
  saveCart(items);
}

export function removeFromCart(productId: string): void {
  const items = getCart().filter(i => i.productId !== productId);
  saveCart(items);
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const items = getCart();
  const item = items.find(i => i.productId === productId);
  if (item) {
    if (quantity <= 0) {
      saveCart(items.filter(i => i.productId !== productId));
    } else {
      item.quantity = quantity;
      saveCart(items);
    }
  }
}

export function clearCart(): void {
  saveCart([]);
}

export function clearSellerItems(sellerId: string): void {
  const items = getCart().filter(i => i.sellerId !== sellerId);
  saveCart(items);
}

export function getCartTotal(): number {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function getCartBySeller(): Record<string, CartItem[]> {
  const items = getCart();
  const grouped: Record<string, CartItem[]> = {};
  for (const item of items) {
    const key = item.sellerId || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}
