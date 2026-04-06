import { PRODUCT_SERVICE } from '@/config';
import { PaginationDto } from '@/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { RetryInterceptor } from '@/shared/interceptors/retry.interceptor';
import { TimeoutInterceptor } from '@/shared/interceptors/timeout.interceptor';
import { BulkheadInterceptor } from '@/shared/interceptors/bulkhead.interceptor';
import { KafkaClientBase } from '@/shared/kafka-client.base';
import { Public } from '@/shared/decorators/public.decorator';

@Controller('products')
@UseInterceptors(
  new BulkheadInterceptor(15, 30),
  new RetryInterceptor(3, 1000),
  new TimeoutInterceptor(10000),
)
export class ProductsController extends KafkaClientBase {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productsClient: ClientKafka,
  ) {
    super();
  }

  getKafkaClient() {
    return this.productsClient;
  }

  getTopics() {
    return [
      'create_product',
      'find_all_products',
      'find_one_product',
      'delete_product',
      'update_product',
    ];
  }

  @Post()
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsClient.send('create_product', createProductDto);
  }

  @Public()
  @Get()
  findAllProducts(@Query() paginationDto: PaginationDto) {
    return this.productsClient.send('find_all_products', paginationDto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsClient.send('find_one_product', { id }).pipe(
      catchError((err) => {
        throw new RpcException(err);
      }),
    );
  }

  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsClient.send('delete_product', { id }).pipe(
      catchError((err) => {
        throw new RpcException(err);
      }),
    );
  }

  @Patch(':id')
  patchProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsClient
      .send('update_product', { id, ...updateProductDto })
      .pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      );
  }
}
