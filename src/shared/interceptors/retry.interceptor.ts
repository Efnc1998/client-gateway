import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, retry, timer } from 'rxjs';

/**
 * Retry Pattern: Reintenta operaciones fallidas con backoff exponencial.
 * Aplica reintentos automáticos ante fallos transitorios en la comunicación
 * con los microservicios via Kafka.
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
          const delay = this.baseDelayMs * Math.pow(2, retryCount - 1);
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Retry #${retryCount}/${this.maxRetries} en ${delay}ms - ${message}`,
          );
          return timer(delay);
        },
      }),
    );
  }
}
