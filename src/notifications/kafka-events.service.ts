import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { envs } from '@/config';
import { NotificationsGateway } from './notifications.gateway';
import {
  OrderCancelledEvent,
  OrderConfirmedEvent,
  OrderCreatedEvent,
  OrderNotificationPayload,
} from './interfaces/order-events.interface';

/**
 * KafkaEventsService — consumer directo de kafkajs para eventos SAGA.
 *
 * Por qué no usamos @EventPattern con connectMicroservice:
 * En una app híbrida NestJS, el contexto del microservicio es separado
 * del contexto HTTP y no ve los handlers registrados en módulos HTTP.
 * Usar kafkajs directamente evita ese problema y nos da control total.
 *
 * Tópicos que consume:
 *  - order.created   → usuario notificado: "Orden en proceso"
 *  - order.cancelled → usuario notificado: "Orden cancelada + razón"
 *  - order.confirmed → usuario notificado: "Orden confirmada"
 */
@Injectable()
export class KafkaEventsService implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(KafkaEventsService.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: 'gateway-notifications-consumer',
      brokers: envs.kafkaBrokers,
    });

    this.consumer = kafka.consumer({
      groupId: 'gateway-notifications-consumer',
    });

    await this.consumer.connect();
    this.logger.log('[KAFKA] Consumer conectado a Kafka');

    // Suscripción explícita a los tópicos de eventos SAGA
    await this.consumer.subscribe({
      topics: ['order.created', 'order.cancelled', 'order.confirmed'],
      fromBeginning: false, // Solo mensajes nuevos desde que el gateway arranca
    });
    this.logger.log('[KAFKA] Suscrito a: order.created, order.cancelled, order.confirmed');

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;

        try {
          const payload = JSON.parse(message.value.toString()) as unknown;
          this.logger.log(`[KAFKA] Evento recibido: ${topic}`);
          this.routeEvent(topic, payload);
        } catch (error) {
          this.logger.error(
            `[KAFKA] Error procesando mensaje del tópico ${topic}: ${error instanceof Error ? error.message : 'unknown'}`,
          );
        }
      },
    });

    this.logger.log('[KAFKA] Consumer corriendo — escuchando eventos SAGA');
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.log('[KAFKA] Consumer desconectado');
  }

  /**
   * Enruta el evento al handler correspondiente según el tópico.
   */
  private routeEvent(topic: string, payload: unknown): void {
    switch (topic) {
      case 'order.created':
        this.handleOrderCreated(payload as OrderCreatedEvent);
        break;
      case 'order.cancelled':
        this.handleOrderCancelled(payload as OrderCancelledEvent);
        break;
      case 'order.confirmed':
        this.handleOrderConfirmed(payload as OrderConfirmedEvent);
        break;
      default:
        this.logger.warn(`[KAFKA] Tópico no manejado: ${topic}`);
    }
  }

  private handleOrderCreated(event: OrderCreatedEvent): void {
    this.logger.log(
      `[KAFKA→WS] order.created | orderId=${event.orderId} | userId=${event.userId}`,
    );
    const notification: OrderNotificationPayload = {
      orderId: event.orderId,
      status: 'PROCESSING',
      message: 'Orden recibida — verificando inventario y procesando pago...',
      timestamp: new Date().toISOString(),
    };
    this.notificationsGateway.notifyUser(event.userId, notification);
  }

  private handleOrderCancelled(event: OrderCancelledEvent): void {
    this.logger.log(
      `[KAFKA→WS] order.cancelled | orderId=${event.orderId} | userId=${event.userId} | reason=${event.reason}`,
    );
    const notification: OrderNotificationPayload = {
      orderId: event.orderId,
      status: 'CANCELLED',
      message: 'Tu orden fue cancelada',
      reason: event.reason,
      timestamp: new Date().toISOString(),
    };
    this.notificationsGateway.notifyUser(event.userId, notification);
  }

  private handleOrderConfirmed(event: OrderConfirmedEvent): void {
    this.logger.log(
      `[KAFKA→WS] order.confirmed | orderId=${event.orderId} | userId=${event.userId}`,
    );
    const notification: OrderNotificationPayload = {
      orderId: event.orderId,
      status: 'CONFIRMED',
      message: '¡Orden confirmada! Tu pago fue procesado exitosamente.',
      timestamp: new Date().toISOString(),
    };
    this.notificationsGateway.notifyUser(event.userId, notification);
  }
}
