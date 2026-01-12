import { envs, PRODUCT_SERVICE } from '@/config';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProductsController } from './products.controller';

@Module({
  controllers: [ProductsController],
  providers: [],
  imports: [
    ClientsModule.register([
      {
        name: PRODUCT_SERVICE,
        transport: Transport.TCP,
        options: {
          host: envs.productMicroserviceHost,
          port: envs.productMicroservicePort,
        },
      },
    ]),
  ],
})
export class ProductsModule {}
