import { PAYMENT_SERVICE } from '@/config';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { RetryInterceptor } from '@/shared/interceptors/retry.interceptor';
import { TimeoutInterceptor } from '@/shared/interceptors/timeout.interceptor';
import { KafkaClientBase } from '@/shared/kafka-client.base';

@Controller('payments')
@UseInterceptors(new RetryInterceptor(3, 1000), new TimeoutInterceptor(10000))
export class PaymentsController extends KafkaClientBase {
  constructor(
    @Inject(PAYMENT_SERVICE) private readonly paymentsClient: ClientKafka,
  ) {
    super();
  }

  getKafkaClient() {
    return this.paymentsClient;
  }

  getTopics() {
    return ['find_one_payment', 'find_payments_by_order'];
  }

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
