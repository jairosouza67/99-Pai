import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void; statusCode: number }>();

    const incomingHeader = request.headers['x-request-id'];
    const incomingId = Array.isArray(incomingHeader)
      ? incomingHeader[0]
      : incomingHeader;

    const requestId =
      typeof incomingId === 'string' && incomingId.trim().length > 0
        ? incomingId
        : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    const path = request.originalUrl || request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `[${requestId}] ${request.method} ${path} ${response.statusCode} ${Date.now() - startedAt}ms`,
          );
        },
        error: (error: unknown) => {
          const stack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `[${requestId}] ${request.method} ${path} failed after ${Date.now() - startedAt}ms`,
            stack,
          );
        },
      }),
    );
  }
}