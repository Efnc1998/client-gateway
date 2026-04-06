import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { envs } from './config';
import { RpcCustomExceptionFilter } from './shared/exceptions/rpc-custom-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('API-Gateway');

  // Crea la aplicación HTTP (Express)
  const app = await NestFactory.create(AppModule);

  // ─── Adaptador WebSocket (socket.io) ──────────────────────────────────────
  // Necesario para que @WebSocketGateway funcione con socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

  // ─── Seguridad ────────────────────────────────────────────────────────────
  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ─── HTTP ─────────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new RpcCustomExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(envs.port);
  logger.log(`API Gateway HTTP corriendo en puerto: ${envs.port}`);
  logger.log(`WebSocket disponible en: ws://localhost:${envs.port}/notifications`);
}
bootstrap();
