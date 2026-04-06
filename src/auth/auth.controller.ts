import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '@/shared/decorators/public.decorator';

type AuthenticatedRequest = ExpressRequest & { user: unknown };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @Get('revalidate')
  revalidateToken(@Request() req: AuthenticatedRequest) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.revalidateToken(token);
  }
}
