/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService, AuthSyncResponse } from './auth.service';

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 8;

const authRequestState = new Map<string, { count: number; resetAt: number }>();

function registerAuthAttempt(ip: string, action: string): void {
  const now = Date.now();
  const key = `${ip}:${action}`;
  const current = authRequestState.get(key);

  if (!current || current.resetAt <= now) {
    authRequestState.set(key, {
      count: 1,
      resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (current.count >= AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
    throw new HttpException(
      'Demasiados intentos. Intenta nuevamente más tarde.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  current.count += 1;
  authRequestState.set(key, current);
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('social')
  async socialAuth(
    @Req() req: any,
    @Body()
    body: {
      idToken: string;
      nombre?: string;
    },
  ): Promise<AuthSyncResponse> {
    registerAuthAttempt(
      req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown',
      'social',
    );

    const result = await this.authService.loginWithSocialProvider(
      body.idToken,
      {
        nombre: body.nombre,
      },
    );

    this.logger.log(
      `Sincronizacion social completada desde ${req.ip ?? 'unknown'}`,
    );

    return result;
  }

  @Post('sync-email')
  async syncEmailUser(
    @Req() req: any,
    @Body('idToken') idToken: string,
    @Body('nombre') nombre?: string,
  ): Promise<AuthSyncResponse> {
    registerAuthAttempt(
      req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown',
      'sync-email',
    );

    const result = await this.authService.registerWithEmailAndPassword(
      idToken,
      { nombre },
    );

    this.logger.log(
      `Sincronizacion email completada desde ${req.ip ?? 'unknown'}`,
    );

    return result;
  }
}
