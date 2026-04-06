import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Record<string, unknown>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const message = this.resolveMessage(request.method, response.statusCode);

    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          typeof payload === 'object' &&
          payload !== null &&
          'data' in payload
        ) {
          const { data, ...rest } = payload as Record<string, unknown>;
          return { status: response.statusCode, message, data, ...rest };
        }

        return { status: response.statusCode, message, data: payload };
      }),
    );
  }

  private resolveMessage(method: string, statusCode: number): string {
    if (statusCode === 201) return 'Created successfully';
    switch (method) {
      case 'GET':
        return 'OK';
      case 'POST':
        return 'Created successfully';
      case 'PATCH':
      case 'PUT':
        return 'Updated successfully';
      case 'DELETE':
        return 'Deleted successfully';
      default:
        return 'OK';
    }
  }
}
