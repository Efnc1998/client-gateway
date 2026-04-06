import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { NotificationsGateway } from './notifications.gateway';
import { KafkaEventsService } from './kafka-events.service';

/**
 * NotificationsModule — módulo que integra WebSocket con eventos Kafka SAGA.
 *
 * Componentes:
 * - NotificationsGateway  : servidor WebSocket con auth JWT (socket.io)
 *                           gestiona conexiones y emite notificaciones a salas de usuario
 * - KafkaEventsService    : consumer kafkajs directo que suscribe a order.created,
 *                           order.cancelled, order.confirmed y los reenvía al WebSocket
 *
 * Nota: usamos kafkajs directamente (no @EventPattern + connectMicroservice)
 * porque en apps híbridas NestJS el contexto del microservicio es separado
 * del contexto HTTP y no ve los handlers de módulos HTTP.
 */
@Module({
  imports: [
    AuthModule, // Para validar JWT en conexiones WebSocket entrantes
  ],
  providers: [NotificationsGateway, KafkaEventsService],
})
export class NotificationsModule {}
