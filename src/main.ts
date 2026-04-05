import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';
import { RpcCustomExceptionFilter } from './shared/exceptions/rpc-custom-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('API-Gateway');
  const app = await NestFactory.create(AppModule);

  // Seguridad: Headers HTTP seguros
  app.use(helmet());

  // Seguridad: CORS configurado
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new RpcCustomExceptionFilter());

  await app.listen(envs.port);

  logger.log(`API Gateway is running on port: ${envs.port}`);
}
bootstrap();
