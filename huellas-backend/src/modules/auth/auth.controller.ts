import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, AuthSyncResponse } from './auth.service';
import {
  EmailStatusDto,
  EmailStatusResponseDto,
} from './dtos/email-status.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('social')
  async socialAuth(
    @Body()
    body: {
      idToken: string;
      nombre?: string;
    },
  ): Promise<AuthSyncResponse> {
    return this.authService.loginWithSocialProvider(body.idToken, {
      nombre: body.nombre,
    });
  }

  @Post('sync-email')
  async syncEmailUser(
    @Body('idToken') idToken: string,
    @Body('nombre') nombre?: string,
  ): Promise<AuthSyncResponse> {
    return this.authService.registerWithEmailAndPassword(idToken, { nombre });
  }

  @Post('email-status')
  async emailStatus(
    @Body() body: EmailStatusDto,
  ): Promise<EmailStatusResponseDto> {
    return this.authService.getEmailStatusByEmail(
      body.email.trim().toLowerCase(),
    );
  }
}
