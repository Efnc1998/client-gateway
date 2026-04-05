import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit Breaker Pattern: Previene llamadas a microservicios que están fallando,
 * permitiendo que se recuperen sin recibir carga adicional.
 *
 * Estados:
 * - CLOSED: Operación normal, las peticiones pasan al servicio
 * - OPEN: El servicio está fallando, las peticiones se rechazan inmediatamente
 * - HALF_OPEN: Se permite una petición de prueba para verificar recuperación
 */
@Injectable()
export class CircuitBreakerInterceptor<T = unknown> implements NestInterceptor<
  T,
  T
> {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;

  constructor(failureThreshold = 5, recoveryTimeMs = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeMs = recoveryTimeMs;
  }

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeMs) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.log('Circuit Breaker: Transición a HALF_OPEN');
      } else {
        this.logger.warn('Circuit Breaker: OPEN - Petición rechazada');
        return throwError(
          () =>
            new HttpException(
              {
                status: HttpStatus.SERVICE_UNAVAILABLE,
                message:
                  'Servicio temporalmente no disponible (Circuit Breaker activo)',
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            ),
        );
      }
    }

    return next.handle().pipe(
      tap(() => {
        if (this.state === CircuitState.HALF_OPEN) {
          this.logger.log('Circuit Breaker: Recuperado - Transición a CLOSED');
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      }),
      catchError((error: unknown) => {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
          this.state = CircuitState.OPEN;
          this.logger.error(
            `Circuit Breaker: OPEN después de ${this.failureCount} fallos`,
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
