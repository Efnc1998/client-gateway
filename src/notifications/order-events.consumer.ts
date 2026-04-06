import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsGateway } from './notifications.gateway';
import {
  OrderCancelledEvent,
  OrderConfirmedEvent,
  OrderCreatedEvent,
  OrderNotificationPayload,
} from './interfaces/order-events.interface';

/**
 * OrderEventsConsumer — Kafka consumer que escucha eventos SAGA
 * y los convierte en notificaciones WebSocket en tiempo real.
 *
 * Actúa como puente entre el bus de eventos (Kafka) y los clientes
 * conectados via WebSocket (socket.io).
 *
 * Eventos consumidos:
 *  - order.created           → notifica "Orden en proceso"
 *  - order.cancelled         → notifica con razón de cancelación
 *  - order.confirmed         → notifica "Orden confirmada"
 */
@Controller()
export class OrderEventsConsumer {
  private readonly logger = new Logger(OrderEventsConsumer.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  /**
   * La orden fue recibida y la SAGA comenzó.
   * Se emite desde orders-ms al iniciar el proceso.
   */
  @EventPattern('order.created')
  handleOrderCreated(@Payload() event: OrderCreatedEvent): void {
    this.logger.log(
      `[KAFKA→WS] order.created | orderId=${event.orderId} | userId=${event.userId}`,
    );

    const payload: OrderNotificationPayload = {
      orderId: event.orderId,
      status: 'PROCESSING',
      message: 'Orden recibida — verificando inventario y procesando pago...',
      timestamp: new Date().toISOString(),
    };

    this.notificationsGateway.notifyUser(event.userId, payload);
  }

  /**
   * La SAGA canceló la orden (producto inexistente, sin stock, o pago fallido).
   * El campo `reason` explica el motivo al usuario.
   */
  @EventPattern('order.cancelled')
  handleOrderCancelled(@Payload() event: OrderCancelledEvent): void {
    this.logger.log(
      `[KAFKA→WS] order.cancelled | orderId=${event.orderId} | userId=${event.userId} | reason=${event.reason}`,
    );

    const payload: OrderNotificationPayload = {
      orderId: event.orderId,
      status: 'CANCELLED',
      message: 'Tu orden fue cancelada',
      reason: event.reason,
      timestamp: new Date().toISOString(),
    };

    this.notificationsGateway.notifyUser(event.userId, payload);
  }

  /**
   * La SAGA completó con éxito: inventario reservado y pago procesado.
   */
  @EventPattern('order.confirmed')
  handleOrderConfirmed(@Payload() event: OrderConfirmedEvent): void {
    this.logger.log(
      `[KAFKA→WS] order.confirmed | orderId=${event.orderId} | userId=${event.userId}`,
    );

    const payload: OrderNotificationPayload = {
      orderId: event.orderId,
      status: 'CONFIRMED',
      message: '¡Orden confirmada! Tu pago fue procesado exitosamente.',
      timestamp: new Date().toISOString(),
    };

    this.notificationsGateway.notifyUser(event.userId, payload);
  }
}
