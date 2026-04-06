/**
 * Interfaces de los eventos Kafka que el gateway consume
 * para convertirlos en notificaciones WebSocket al usuario.
 */

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  totalAmount: number;
}

export interface OrderCancelledEvent {
  orderId: string;
  userId: string;
  reason: string;
}

export interface OrderConfirmedEvent {
  orderId: string;
  userId: string;
}

/**
 * Payload que se envía al front via WebSocket.
 * El front escucha el evento 'order:update'.
 */
export interface OrderNotificationPayload {
  orderId: string;
  status: 'PROCESSING' | 'CONFIRMED' | 'CANCELLED';
  message: string;
  reason?: string;
  timestamp: string;
}
