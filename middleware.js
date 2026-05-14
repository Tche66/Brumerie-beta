// middleware.js — Vercel Edge Middleware
// Redirige les bots sociaux (WhatsApp, Facebook, Twitter, Google) vers l'API OG
// pour qu'ils reçoivent des meta tags dynamiques par produit/vendeur

const BOT_PATTERNS = [
  'WhatsApp',
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
];

export const config = {
  matcher: ['/', '/index.html', '/vendeur/:path*'],
};

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  const isBot = BOT_PATTERNS.some(bot => ua.includes(bot));
  if (!isBot) return;

  const productId = url.searchParams.get('product');
  const sellerMatch = url.pathname.match(/^\/vendeur\/([^/]+)$/);

  if (productId) {
    const ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('product', productId);
    return Response.redirect(ogUrl.toString(), 302);
  }

  if (sellerMatch) {
    const ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('seller', sellerMatch[1]);
    return Response.redirect(ogUrl.toString(), 302);
  }
}
