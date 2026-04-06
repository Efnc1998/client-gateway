import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom } from 'rxjs';
import { AUTH_SERVICE } from '@/config';
import { KafkaClientBase } from '@/shared/kafka-client.base';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './interfaces';

@Injectable()
export class AuthService extends KafkaClientBase {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientKafka) {
    super();
  }

  getKafkaClient() {
    return this.authClient;
  }

  getTopics() {
    return [
      'auth.register',
      'auth.login',
      'auth.revalidate_token',
      'auth.validate_token',
    ];
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    this.logger.log(`Registering user: ${registerDto.email}`);
    return firstValueFrom(
      this.authClient.send<AuthResponse>('auth.register', registerDto).pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      ),
    );
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`Login attempt: ${loginDto.email}`);
    return firstValueFrom(
      this.authClient.send<AuthResponse>('auth.login', loginDto).pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      ),
    );
  }

  /**
   * Valida un JWT delegando en auth-ms via Kafka.
   * Usado por el WebSocket gateway para autenticar conexiones entrantes.
   */
  async validateToken(token: string): Promise<AuthResponse> {
    this.logger.log(`Validating token for WebSocket connection`);
    return firstValueFrom(
      this.authClient.send<AuthResponse>('auth.validate_token', { token }).pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      ),
    );
  }

  async revalidateToken(token: string): Promise<AuthResponse> {
    this.logger.log(`Revalidating token`);
    return firstValueFrom(
      this.authClient
        .send<AuthResponse>('auth.revalidate_token', { token })
        .pipe(
          catchError((err) => {
            throw new RpcException(err);
          }),
        ),
    );
  }
}
