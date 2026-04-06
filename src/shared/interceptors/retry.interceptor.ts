import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, retry, timer, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

const BUSINESS_ERROR_STATUSES = [400, 401, 403, 404, 409, 422];

function extractStatus(error: unknown): number | null {
  if (error instanceof RpcException) {
    const err = error.getError();
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return (err as { status: number }).status;
    }
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status: number }).status;
  }

  return null;
}

function isBusinessError(error: unknown): boolean {
  const status = extractStatus(error);
  return status !== null && BUSINESS_ERROR_STATUSES.includes(status);
}

/**
 * Retry Pattern: Reintenta operaciones fallidas con backoff exponencial.
 * Solo reintenta errores de infraestructura (timeout, conexión),
 * nunca errores de negocio (4xx).
 */
@Injectable()
export class RetryInterceptor<T = unknown> implements NestInterceptor<T, T> {
  private readonly logger = new Logger(RetryInterceptor.name);
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(maxRetries = 3, baseDelayMs = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
  }

  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    return next.handle().pipe(
      retry({
        count: this.maxRetries,
        delay: (error: unknown, retryCount: number) => {
          if (isBusinessError(error)) {
            return throwError(() => error);
          }

          const delay = this.baseDelayMs * Math.pow(2, retryCount - 1);
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);

          this.logger.warn(
            `Retry #${retryCount}/${this.maxRetries} en ${delay}ms - ${message}`,
          );

          return timer(delay);
        },
      }),
    );
  }
}
