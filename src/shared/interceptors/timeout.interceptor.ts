import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Timeout Pattern: Establece un tiempo máximo de espera para las respuestas
 * de los microservicios, evitando que peticiones colgadas consuman recursos.
 */
@Injectable()
export class TimeoutInterceptor<T = unknown> implements NestInterceptor<T, T> {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutMs: number;

  constructor(timeoutMs = 10000) {
    this.timeoutMs = timeoutMs;
  }

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          this.logger.warn(
            `Timeout de ${this.timeoutMs}ms excedido en ${context.getClass().name}.${context.getHandler().name}`,
          );
          return throwError(
            () =>
              new RequestTimeoutException(
                `El servicio no respondió en ${this.timeoutMs}ms`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
