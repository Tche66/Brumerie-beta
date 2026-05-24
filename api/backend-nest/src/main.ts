import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation globale des DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS pour le frontend Brumerie
  app.enableCors({
    origin: ['http://localhost:5173', 'https://brumerie.com', 'https://brumerie-social.netlify.app'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Brumerie Backend démarré sur le port ${port}`);
}

bootstrap();
