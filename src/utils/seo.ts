// src/utils/seo.ts — Gestion dynamique des meta tags SEO
// Brumerie · Abidjan, Côte d'Ivoire

const BASE_URL = 'https://brumerie.com';
const DEFAULT_IMAGE = `${BASE_URL}/assets/og-image.png`;
const SITE_NAME = 'Brumerie';

interface MetaConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  price?: number;
}

/**
 * Met à jour toutes les meta tags SEO + Open Graph + Twitter Card
 * À appeler à chaque changement de page ou d'article
 */
export function updateMeta(config: MetaConfig) {
  const {
    title,
    description,
    image = DEFAULT_IMAGE,
    url = BASE_URL,
    type = 'website',
  } = config;

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  // ── Title ──────────────────────────────────────────────
  document.title = fullTitle;

  // ── Meta description ───────────────────────────────────
  setMeta('name', 'description', description);

  // ── Open Graph ─────────────────────────────────────────
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:type', type === 'product' ? 'product' : 'website');
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', 'fr_CI');

  // ── Twitter Card ───────────────────────────────────────
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);

  // ── Canonical URL ──────────────────────────────────────
  setCanonical(url);

  // ── Structured Data (JSON-LD) ──────────────────────────
  if (type === 'product' && config.price !== undefined) {
    setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: config.title,
      description,
      image,
      offers: {
        '@type': 'Offer',
        price: config.price,
        priceCurrency: 'XOF',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: BASE_URL,
        },
      },
    });
  } else {
    setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: BASE_URL,
      description: "Marketplace C2C hyperlocale à Abidjan, Côte d'Ivoire",
      potentialAction: {
        '@type': 'SearchAction',
        target: `${BASE_URL}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }
}

// ── Presets par page ───────────────────────────────────────────

export function setHomeMeta() {
  updateMeta({
    title: "Brumerie — Le marché de ton quartier à Abidjan",
    description: "Découvre, vends et achètes des articles près de chez toi à Abidjan. Mode, high-tech, beauté, maison — des milliers d'annonces dans ton quartier. Gratuit et local. 🇨🇮",
    url: BASE_URL,
    type: 'website',
  });
}

export function setProductMeta(product: {
  title: string;
  description: string;
  price: number;
  images: string[];
  neighborhood: string;
  category: string;
  sellerName: string;
  id: string;
}) {
  const desc = product.description
    ? `${product.description.slice(0, 120)}... | ${product.price.toLocaleString('fr-FR')} FCFA à ${product.neighborhood}`
    : `${product.title} à ${product.price.toLocaleString('fr-FR')} FCFA — disponible à ${product.neighborhood}, Abidjan. Vendeur : ${product.sellerName}`;

  updateMeta({
    title: `${product.title} — ${product.price.toLocaleString('fr-FR')} FCFA`,
    description: desc,
    image: product.images[0] || DEFAULT_IMAGE,
    url: `${BASE_URL}/p/${product.id}`,
    type: 'product',
    price: product.price,
  });
}

export function setSellerMeta(seller: {
  name: string;
  bio?: string;
  neighborhood?: string;
  photoURL?: string;
  id: string;
}) {
  updateMeta({
    title: `${seller.name} — Boutique sur Brumerie`,
    description: seller.bio
      ? seller.bio.slice(0, 140)
      : `Découvrez la boutique de ${seller.name} sur Brumerie — articles à vendre à ${seller.neighborhood || 'Abidjan'}.`,
    image: seller.photoURL || DEFAULT_IMAGE,
    url: `${BASE_URL}/vendeur/${seller.id}`,
    type: 'website',
  });
}

// ── Helpers internes ───────────────────────────────────────────

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setStructuredData(data: object) {
  let script = document.querySelector('script[data-brumerie-ld]') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-brumerie-ld', '');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
