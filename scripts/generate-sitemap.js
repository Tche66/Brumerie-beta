// scripts/generate-sitemap.js
// Génère un sitemap.xml avec tous les produits actifs
// À exécuter : node scripts/generate-sitemap.js
// Ou via un cron job après chaque publication

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Init Firebase Admin (utilise les env vars ou un service account)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const BASE_URL = 'https://brumerie.com';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

async function generateSitemap() {
  console.log('Generating sitemap...');

  // Récupérer tous les produits actifs
  const productsSnap = await db.collection('products')
    .where('status', 'in', ['active', 'sold'])
    .orderBy('createdAt', 'desc')
    .limit(5000)
    .get();

  // Récupérer tous les vendeurs vérifiés
  const sellersSnap = await db.collection('users')
    .where('isVerified', '==', true)
    .get();

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Page d'accueil -->
  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Pages statiques -->
  <url>
    <loc>${BASE_URL}/explorer</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

`;

  // Ajouter chaque produit
  productsSnap.docs.forEach(doc => {
    const p = doc.data();
    const id = p.firebaseId || doc.id;
    const lastmod = p.createdAt?.toDate?.()
      ? p.createdAt.toDate().toISOString().split('T')[0]
      : now;
    const image = p.images?.[0] || '';

    xml += `  <url>
    <loc>${BASE_URL}/p/${id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p.status === 'active' ? '0.7' : '0.3'}</priority>${image ? `
    <image:image>
      <image:loc>${image}</image:loc>
      <image:title>${escapeXml(p.title || '')}</image:title>
    </image:image>` : ''}
  </url>
`;
  });

  // Ajouter chaque vendeur vérifié
  sellersSnap.docs.forEach(doc => {
    const s = doc.data();
    xml += `  <url>
    <loc>${BASE_URL}/vendeur/${doc.id}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  xml += `</urlset>`;

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
  console.log(`Sitemap generated: ${OUTPUT_PATH}`);
  console.log(`  - ${productsSnap.size} products`);
  console.log(`  - ${sellersSnap.size} sellers`);
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

generateSitemap().catch(console.error);
