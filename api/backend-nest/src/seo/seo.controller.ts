// src/seo/seo.controller.ts
// Pre-rendering pour les crawlers Google/Facebook/Twitter
// Sert du HTML avec les meta tags corrects pour chaque produit/vendeur
import { Controller, Get, Param, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class SeoController {
  constructor(private prisma: PrismaService) {}

  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const products = await this.prisma.product.findMany({
      where: { status: { in: ['active', 'sold'] } },
      select: { id: true, firebaseId: true, title: true, images: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const now = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>https://brumerie.com</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>https://brumerie.com/explorer</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
`;
    for (const p of products) {
      const pid = p.firebaseId || p.id;
      const lastmod = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : now;
      const img = (p.images as string[])?.[0] || '';
      xml += `  <url><loc>https://brumerie.com/p/${pid}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${p.status === 'active' ? '0.7' : '0.3'}</priority>${img ? `<image:image><image:loc>${this.esc(img)}</image:loc><image:title>${this.esc(p.title || '')}</image:title></image:image>` : ''}</url>\n`;
    }
    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }

  @Get('p/:id')
  async productPage(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /googlebot|bingbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slackbot|discordbot|pinterest/i.test(ua);

    if (!isBot) {
      return res.redirect(302, `https://brumerie.com/?product=${id}`);
    }

    let product: any = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      product = await this.prisma.product.findUnique({ where: { firebaseId: id } });
    }

    if (!product) {
      return res.status(404).send(this.notFoundHtml());
    }

    const title = `${product.title} — ${product.price?.toLocaleString('fr-FR')} FCFA | Brumerie`;
    const desc = product.description
      ? `${product.description.slice(0, 150)}... | ${product.price?.toLocaleString('fr-FR')} FCFA à ${product.neighborhood || 'Côte d\'Ivoire'}`
      : `${product.title} à ${product.price?.toLocaleString('fr-FR')} FCFA — disponible à ${product.neighborhood || 'Côte d\'Ivoire'}. Social commerce Brumerie.`;
    const image = product.images?.[0] || 'https://brumerie.com/assets/og-image.png';
    const url = `https://brumerie.com/p/${id}`;

    const html = this.renderProductHtml({ title, desc, image, url, product });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('vendeur/:id')
  async sellerPage(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /googlebot|bingbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slackbot|discordbot|pinterest/i.test(ua);

    if (!isBot) {
      return res.redirect(302, `https://brumerie.com/?seller=${id}`);
    }

    const seller = await this.prisma.user.findUnique({ where: { firebaseUid: id } });
    if (!seller) {
      return res.status(404).send(this.notFoundHtml());
    }

    const title = `${seller.name} — Boutique sur Brumerie`;
    const desc = (seller as any).bio
      ? (seller as any).bio.slice(0, 150)
      : `Découvre la boutique de ${seller.name} sur Brumerie — social commerce local en Côte d'Ivoire.`;
    const image = seller.photoURL || 'https://brumerie.com/assets/og-image.png';
    const url = `https://brumerie.com/vendeur/${id}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${this.esc(title)}</title>
  <meta name="description" content="${this.esc(desc)}">
  <meta property="og:title" content="${this.esc(title)}">
  <meta property="og:description" content="${this.esc(desc)}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Brumerie">
  <meta property="og:locale" content="fr_CI">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.esc(title)}">
  <meta name="twitter:description" content="${this.esc(desc)}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${url}">
</head>
<body>
  <h1>${this.esc(seller.name)}</h1>
  <p>${this.esc(desc)}</p>
  <a href="https://brumerie.com">Voir sur Brumerie</a>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  private renderProductHtml(data: { title: string; desc: string; image: string; url: string; product: any }) {
    const { title, desc, image, url, product } = data;
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || '',
      image: product.images || [],
      url,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'XOF',
        availability: product.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        seller: {
          '@type': 'Person',
          name: product.sellerName || '',
        },
        itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition'
          : product.condition === 'like_new' ? 'https://schema.org/UsedCondition'
          : 'https://schema.org/UsedCondition',
      },
      brand: { '@type': 'Brand', name: 'Brumerie' },
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${this.esc(title)}</title>
  <meta name="description" content="${this.esc(desc)}">
  <meta property="og:title" content="${this.esc(title)}">
  <meta property="og:description" content="${this.esc(desc)}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Brumerie">
  <meta property="og:locale" content="fr_CI">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="XOF">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.esc(title)}">
  <meta name="twitter:description" content="${this.esc(desc)}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${url}">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <h1>${this.esc(product.title)}</h1>
  <p>${this.esc(product.description || '')}</p>
  <p>Prix: ${product.price?.toLocaleString('fr-FR')} FCFA</p>
  <p>Quartier: ${this.esc(product.neighborhood || '')}</p>
  <p>Vendeur: ${this.esc(product.sellerName || '')}</p>
  <img src="${image}" alt="${this.esc(product.title)}">
  <a href="https://brumerie.com">Voir sur Brumerie</a>
</body>
</html>`;
  }

  private notFoundHtml() {
    return `<!DOCTYPE html><html><head><title>Article non trouvé — Brumerie</title></head><body><h1>Article non trouvé</h1><a href="https://brumerie.com">Retour à Brumerie</a></body></html>`;
  }

  private esc(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
