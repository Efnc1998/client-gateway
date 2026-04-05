import { PAYMENT_SERVICE } from '@/config';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RetryInterceptor } from '@/shared/interceptors/retry.interceptor';
import { TimeoutInterceptor } from '@/shared/interceptors/timeout.interceptor';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@UseInterceptors(new RetryInterceptor(3, 1000), new TimeoutInterceptor(10000))
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_SERVICE) private readonly paymentsClient: ClientProxy,
  ) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsClient.send('find_one_payment', { id }).pipe(
      catchError((err) => {
        throw new RpcException(err);
      }),
    );
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsClient
      .send('find_payments_by_order', { orderId })
      .pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      );
  }
}
