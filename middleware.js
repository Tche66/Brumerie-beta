// middleware.js — Vercel Edge Middleware
// Redirige UNIQUEMENT les crawlers/bots vers l'API OG pour les previews riches
// Les vrais navigateurs (y compris WhatsApp in-app browser) passent normalement vers la SPA

// Bots qui crawlent pour générer des previews — PAS les navigateurs in-app
const BOT_UA_REGEX = /^WhatsApp\/|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot-LinkExpanding|TelegramBot|Discordbot|Googlebot|bingbot|Baiduspider|yandex/i;

export const config = {
  matcher: ['/p/:path*', '/s/:path*'],
};

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  // Seuls les vrais bots sont redirigés vers l'API OG
  // Le navigateur in-app de WhatsApp a un UA comme:
  //   "Mozilla/5.0 ... Chrome/xxx ... Mobile Safari/xxx WhatsApp/xxx"
  // Le vrai bot a un UA comme:
  //   "WhatsApp/2.23.x A" (commence par WhatsApp/)
  if (!BOT_UA_REGEX.test(ua)) {
    // Pas un bot → laisser la SPA gérer normalement
    return;
  }

  // Extraire l'ID depuis /p/ID ou /s/ID
  const productMatch = url.pathname.match(/^\/p\/([^/]+)/);
  const sellerMatch = url.pathname.match(/^\/s\/([^/]+)/);

  if (productMatch) {
    const ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('product', productMatch[1]);
    return new Response(null, { status: 302, headers: { Location: ogUrl.toString() } });
  }

  if (sellerMatch) {
    const ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('seller', sellerMatch[1]);
    return new Response(null, { status: 302, headers: { Location: ogUrl.toString() } });
  }
}
