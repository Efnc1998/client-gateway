import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Seguridad: Rate limiting global
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    // WebSocket + Kafka event bridge para notificaciones en tiempo real
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    // Rate limiting global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // JWT auth global — las rutas públicas usan @Public() para saltarse este guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
