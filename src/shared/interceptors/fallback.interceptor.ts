import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, catchError, of } from 'rxjs';

export interface FallbackResponse {
  message: string;
  data: null;
}

/**
 * Fallback Pattern: Proporciona una respuesta alternativa cuando un microservicio
 * no está disponible o falla después de agotar los reintentos.
 * Permite degradación elegante del servicio.
 */
@Injectable()
export class FallbackInterceptor<T = unknown> implements NestInterceptor<
  T,
  T | FallbackResponse
> {
  private readonly logger = new Logger(FallbackInterceptor.name);
  private readonly fallbackResponse: FallbackResponse;

  constructor(
    fallbackResponse: FallbackResponse = {
      message: 'Servicio temporalmente no disponible',
      data: null,
    },
  ) {
    this.fallbackResponse = fallbackResponse;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | FallbackResponse> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);
        this.logger.error(
          `Fallback activado para ${context.getClass().name}.${context.getHandler().name}: ${message}`,
        );
        return of(this.fallbackResponse);
      }),
    );
  }
}
