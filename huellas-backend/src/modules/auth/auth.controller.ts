import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, CustomClaims } from './auth.service';

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
  ): Promise<{
    accessToken: string;
    customClaims: CustomClaims;
  }> {
    return this.authService.loginWithSocialProvider(body.idToken, {
      nombre: body.nombre,
    });
  }
}
