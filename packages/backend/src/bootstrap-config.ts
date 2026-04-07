import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export function configureNestApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:19006',
  ];

  const envOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) || [];

  const allowedOrigins = new Set([
    ...defaultOrigins,
    ...envOrigins,
    'https://99pai-web.vercel.app',
    'https://99pai-web-jairosouza67-5313s-projects.vercel.app',
    'https://99pai-web-jairosouza67-5313-jairosouza67-5313s-projects.vercel.app',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.trim().replace(/\/$/, '');
      const isWebPreview = /^https:\/\/99pai-[a-z0-9-]+-jairosouza67-5313s-projects\.vercel\.app$/.test(
        normalizedOrigin,
      );

      if (allowedOrigins.has(normalizedOrigin) || isWebPreview) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(helmet());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('99-Pai API')
      .setDescription(
        'Unified API for elderly assistant and service marketplace',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }
}