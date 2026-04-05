import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, ORDER_SERVICE } from '@/config';
import { OrdersController } from './orders.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  controllers: [OrdersController],
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: ORDER_SERVICE,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'orders-client',
            brokers: envs.kafkaBrokers,
          },
          consumer: {
            groupId: 'gateway-orders-consumer',
          },
        },
      },
    ]),
  ],
})
export class OrdersModule {}
