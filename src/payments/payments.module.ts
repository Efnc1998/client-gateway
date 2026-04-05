import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, PAYMENT_SERVICE } from '@/config';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  controllers: [PaymentsController],
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: PAYMENT_SERVICE,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'payments-client',
            brokers: envs.kafkaBrokers,
          },
          consumer: {
            groupId: 'gateway-payments-consumer',
          },
        },
      },
    ]),
  ],
})
export class PaymentsModule {}
