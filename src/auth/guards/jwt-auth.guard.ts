import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE } from '@/config';
import { IS_PUBLIC_KEY } from '@/shared/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Si la ruta está marcada con @Public(), se omite la validación
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const user = await firstValueFrom(
        this.authClient.send('auth.validate_token', { token }),
      );
      (request as Request & { user: unknown }).user = user;
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Token validation failed: ${message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers['authorization'];
    const [type, token] = authHeader?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
