// api/og.js — Open Graph dynamique pour previews WhatsApp/Facebook/Twitter
// Sert du HTML avec meta OG quand un bot social visite un lien produit

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req, res) {
  const productId = req.query.product;
  const sellerId = req.query.seller;

  const baseUrl = 'https://brumerie.com';

  // Si pas d'ID produit ni vendeur → OG par défaut
  if (!productId && !sellerId) {
    return serveDefaultOG(res, baseUrl);
  }

  try {
    if (productId) {
      const snap = await db.collection('products').doc(productId).get();
      if (!snap.exists) return serveDefaultOG(res, baseUrl);

      const p = snap.data();
      const title = `${p.title} — ${Number(p.price).toLocaleString('fr-FR')} FCFA`;
      const description = [
        p.condition === 'new' ? 'Neuf' : p.condition === 'like_new' ? 'Comme neuf' : 'Occasion',
        p.neighborhood && `📍 ${p.neighborhood}`,
        p.sellerVerified && 'Vendeur vérifié ✅',
      ].filter(Boolean).join(' · ');
      const image = p.images?.[0] || `${baseUrl}/assets/Logos/logo-app-icon.png`;
      const url = `${baseUrl}?product=${productId}`;

      return serveOG(res, { title, description, image, url });
    }

    if (sellerId) {
      const snap = await db.collection('users').doc(sellerId).get();
      if (!snap.exists) return serveDefaultOG(res, baseUrl);

      const u = snap.data();
      const title = `${u.name || 'Vendeur'} sur Brumerie`;
      const description = [
        u.neighborhood && `📍 ${u.neighborhood}`,
        u.isVerified && 'Vendeur vérifié ✅',
        u.followerCount && `${u.followerCount} abonnés`,
      ].filter(Boolean).join(' · ') || 'Découvre sa boutique sur Brumerie';
      const image = u.photoURL || `${baseUrl}/assets/Logos/logo-app-icon.png`;
      const url = `${baseUrl}/vendeur/${sellerId}`;

      return serveOG(res, { title, description, image, url });
    }
  } catch (e) {
    console.error('[og] Error:', e);
    return serveDefaultOG(res, baseUrl);
  }
}

function serveOG(res, { title, description, image, url }) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:type" content="product"/>
<meta property="og:site_name" content="Brumerie"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(url)}"/>
</head>
<body>
<p>Redirection vers <a href="${esc(url)}">Brumerie</a>...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).send(html);
}

function serveDefaultOG(res, baseUrl) {
  return serveOG(res, {
    title: 'Brumerie — Redéfinissons le commerce local en Afrique',
    description: 'Achetez et vendez vêtements, accessoires et pépites mode seconde main en toute confiance.',
    image: `${baseUrl}/assets/Logos/logo-app-icon.png`,
    url: baseUrl,
  });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
