import { ORDER_SERVICE } from '@/config';
import { PaginationDto } from '@/shared';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { Request as ExpressRequest } from 'express';
import { catchError } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { RetryInterceptor } from '@/shared/interceptors/retry.interceptor';
import { TimeoutInterceptor } from '@/shared/interceptors/timeout.interceptor';
import { KafkaClientBase } from '@/shared/kafka-client.base';

@Controller('orders')
@UseInterceptors(new RetryInterceptor(3, 1000), new TimeoutInterceptor(15000))
export class OrdersController extends KafkaClientBase {
  constructor(
    @Inject(ORDER_SERVICE) private readonly ordersClient: ClientKafka,
  ) {
    super();
  }

  getKafkaClient() {
    return this.ordersClient;
  }

  getTopics() {
    return [
      'create_order',
      'find_all_orders',
      'find_one_order',
      'change_order_status',
    ];
  }

  @Post()
  createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: ExpressRequest & { user: { user: { id: string } } },
  ) {
    // Extrae el userId del JWT validado por JwtAuthGuard e inyéctalo en el payload
    // El usuario no puede manipular su propio userId — viene del token firmado
    const userId = req.user.user.id;
    return this.ordersClient
      .send('create_order', { ...createOrderDto, userId })
      .pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      );
  }

  @Get()
  findAllOrders(@Query() paginationDto: PaginationDto) {
    return this.ordersClient.send('find_all_orders', paginationDto).pipe(
      catchError((err) => {
        throw new RpcException(err);
      }),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersClient.send('find_one_order', { id }).pipe(
      catchError((err) => {
        throw new RpcException(err);
      }),
    );
  }

  @Patch('change-status')
  changeOrderStatus(@Body() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersClient
      .send('change_order_status', changeOrderStatusDto)
      .pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      );
  }
}
