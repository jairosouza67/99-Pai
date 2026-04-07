import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { configureNestApp } from './bootstrap-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  configureNestApp(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs at: http://localhost:${port}/docs`);
  }
}
bootstrap();
