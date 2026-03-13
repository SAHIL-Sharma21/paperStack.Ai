/**
 * Auth Controller - signup, login
 * Token returned in body (Bearer) AND optionally in httpOnly cookie
 * @author: Sahil Sharma
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response as ExpressResponse } from 'express';
import { AuthService, AuthResponse } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';

const DEFAULT_COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<AuthResponse> {
    const result = await this.authService.signup(signupDto);
    this.setAuthCookie(res, result.access_token);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(loginDto);
    this.setAuthCookie(res, result.access_token);
    return result;
  }

  private setAuthCookie(res: ExpressResponse, token: string): void {
    const cookieName =
      this.configService.get<string>('AUTH_COOKIE_NAME') || 'access_token';
    const configuredExpirySeconds = Number(
      this.configService.get<string>('JWT_EXPIRATION_TIME'),
    );
    const cookieMaxAgeMs =
      Number.isFinite(configuredExpirySeconds) && configuredExpirySeconds > 0
        ? configuredExpirySeconds * 1000
        : DEFAULT_COOKIE_MAX_AGE_MS;

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: cookieMaxAgeMs,
      path: '/',
    });
  }
}
