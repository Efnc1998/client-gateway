import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * Bulkhead Pattern: Limita el número de peticiones concurrentes por servicio
 * para evitar que un microservicio sobrecargado afecte a los demás.
 * Aísla los fallos entre servicios.
 */
@Injectable()
export class BulkheadInterceptor<T = unknown> implements NestInterceptor<T, T> {
  private readonly logger = new Logger(BulkheadInterceptor.name);
  private currentConcurrency = 0;
  private readonly maxConcurrent: number;
  private readonly queueSize: number;
  private readonly waitingQueue: Array<() => void> = [];

  constructor(maxConcurrent = 10, queueSize = 20) {
    this.maxConcurrent = maxConcurrent;
    this.queueSize = queueSize;
  }

  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    if (this.currentConcurrency >= this.maxConcurrent) {
      if (this.waitingQueue.length >= this.queueSize) {
        this.logger.warn(
          `Bulkhead: Petición rechazada. Concurrencia: ${this.currentConcurrency}/${this.maxConcurrent}, Cola: ${this.waitingQueue.length}/${this.queueSize}`,
        );
        throw new HttpException(
          {
            status: HttpStatus.TOO_MANY_REQUESTS,
            message:
              'Servicio sobrecargado. Intente nuevamente en unos momentos.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return new Observable<T>((subscriber) => {
        const execute = () => {
          this.currentConcurrency++;
          next
            .handle()
            .pipe(finalize(() => this.release()))
            .subscribe(subscriber);
        };

        this.waitingQueue.push(execute);
        this.logger.debug(
          `Bulkhead: Petición en cola. Cola: ${this.waitingQueue.length}/${this.queueSize}`,
        );
      });
    }

    this.currentConcurrency++;
    return next.handle().pipe(finalize(() => this.release()));
  }

  private release(): void {
    this.currentConcurrency--;
    if (this.waitingQueue.length > 0) {
      const nextInQueue = this.waitingQueue.shift();
      nextInQueue?.();
    }
  }
}
