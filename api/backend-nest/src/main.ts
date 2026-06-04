import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Validation globale des DTOs ───────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ── Headers de sécurité HTTP ──────────────────────────────────
  // Protection XSS, Clickjacking, MIME sniffing, etc.
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ── Rate limiting simple ───────────────────────────────────────
  // Protection brute force : max 100 req/min par IP
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  app.use((req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const window = 60 * 1000; // 1 minute
    const maxRequests = 100;

    const current = requestCounts.get(ip);
    if (!current || now > current.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + window });
      return next();
    }
    current.count++;
    if (current.count > maxRequests) {
      return res.status(429).json({ message: 'Trop de requêtes. Réessaie dans 1 minute.' });
    }
    next();
  });

  // ── CORS ──────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://brumerie.com',
      'https://www.brumerie.com',
      'https://brumerie-beta.vercel.app',
      process.env.FRONTEND_URL || 'https://brumerie.com',
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Brumerie Backend démarré sur le port ${port}`);
}

bootstrap();
