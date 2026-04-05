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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RetryInterceptor } from '@/shared/interceptors/retry.interceptor';
import { TimeoutInterceptor } from '@/shared/interceptors/timeout.interceptor';

@Controller('orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(new RetryInterceptor(3, 1000), new TimeoutInterceptor(15000))
export class OrdersController {
  constructor(
    @Inject(ORDER_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  @Post()
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersClient.send('create_order', createOrderDto).pipe(
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
