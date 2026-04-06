import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '@/auth/auth.service';
import { OrderNotificationPayload } from './interfaces/order-events.interface';

/**
 * NotificationsGateway — servidor WebSocket del API Gateway.
 *
 * Responsabilidades:
 * 1. Autenticar conexiones WebSocket validando el JWT via auth-ms
 * 2. Asignar cada socket a una sala privada "user:{userId}"
 * 3. Exponer notifyUser() para que OrderEventsConsumer emita al usuario correcto
 *
 * Flujo de conexión del front:
 *   const socket = io('http://localhost:3000/notifications', {
 *     auth: { token: 'Bearer eyJ...' }
 *   });
 *   socket.on('order:update', (data) => console.log(data));
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*', // En producción: lista de dominios permitidos
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly authService: AuthService) {}

  afterInit() {
    this.logger.log(
      '[WS] NotificationsGateway inicializado en namespace /notifications',
    );
  }

  /**
   * Se ejecuta cuando un cliente intenta conectarse.
   * Valida el JWT y une el socket a la sala privada del usuario.
   * Si el token es inválido, desconecta inmediatamente.
   */
  async handleConnection(socket: Socket): Promise<void> {
    const token = this.extractToken(socket);

    if (!token) {
      this.logger.warn(
        `[WS] Conexión rechazada — sin token: socketId=${socket.id}`,
      );
      socket.emit('error', { message: 'Token requerido para conectarse' });
      socket.disconnect();
      return;
    }

    try {
      // Valida el token contra auth-ms via Kafka
      const authResponse = await this.authService.validateToken(token);
      const { id: userId, email } = authResponse.user;

      // Guarda el userId en los datos del socket para uso futuro
      socket.data.userId = userId;

      // Une el socket a la sala privada del usuario
      // Todos los mensajes a esta sala llegan solo a este usuario
      await socket.join(`user:${userId}`);

      this.logger.log(
        `[WS] Cliente conectado — userId=${userId} (${email}), socketId=${socket.id}`,
      );

      // Confirma la conexión al cliente
      socket.emit('connected', {
        message: 'Conectado al sistema de notificaciones en tiempo real',
        userId,
      });
    } catch (error) {
      this.logger.warn(
        `[WS] Token inválido — desconectando socketId=${socket.id}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      socket.emit('error', { message: 'Token inválido o expirado' });
      socket.disconnect();
    }
  }

  /**
   * Se ejecuta cuando un cliente se desconecta.
   */
  handleDisconnect(socket: Socket): void {
    const userId = socket.data.userId ?? 'desconocido';
    this.logger.log(
      `[WS] Cliente desconectado — userId=${userId}, socketId=${socket.id}`,
    );
  }

  /**
   * Emite una notificación a un usuario específico via su sala privada.
   * Llamado por OrderEventsConsumer cuando llega un evento Kafka.
   *
   * @param userId  - ID del usuario destinatario
   * @param payload - Datos de la notificación
   */
  notifyUser(userId: string, payload: OrderNotificationPayload): void {
    const room = `user:${userId}`;
    this.logger.log(
      `[WS] Notificando a userId=${userId} — status=${payload.status} | orderId=${payload.orderId}`,
    );
    this.server.to(room).emit('order:update', payload);
  }

  /**
   * Extrae el Bearer token del handshake del socket.
   * Soporta dos métodos:
   *   1. socket.auth = { token: 'Bearer eyJ...' }  → clientes reales (React, Vue, etc.)
   *   2. Header Authorization: Bearer eyJ...        → Postman Socket.IO
   */
  private extractToken(socket: Socket): string | null {
    // Método 1: handshake.auth (clientes socket.io-client)
    const authToken = socket.handshake.auth?.token as string | undefined;
    if (authToken) {
      const [type, token] = authToken.split(' ');
      return type === 'Bearer' && token ? token : null;
    }

    // Método 2: header Authorization (Postman y herramientas de testing)
    const headerToken = socket.handshake.headers?.authorization as
      | string
      | undefined;
    if (headerToken) {
      const [type, token] = headerToken.split(' ');
      return type === 'Bearer' && token ? token : null;
    }

    return null;
  }
}
