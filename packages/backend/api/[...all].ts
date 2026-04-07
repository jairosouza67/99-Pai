import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from '../src/app.module';
import { configureNestApp } from '../src/bootstrap-config';

type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

let cachedHandler: RequestHandler | undefined;
const logger = new Logger('VercelHandler');

async function getHandler(): Promise<RequestHandler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const adapter = new ExpressAdapter();
  const app = await NestFactory.create(AppModule, adapter);

  configureNestApp(app);
  await app.init();

  const instance = adapter.getInstance() as RequestHandler;
  cachedHandler = instance;
  logger.log('Nest server initialized in Vercel runtime');

  return instance;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const appHandler = await getHandler();
  await appHandler(req, res);
}