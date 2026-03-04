import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, CustomClaims } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async googleAuth(
    @Body()
    body: {
      idToken: string;
      nombre?: string;
      apellido?: string;
    },
  ): Promise<{
    accessToken: string;
    customClaims: CustomClaims;
  }> {
    return this.authService.loginWithGoogle(body.idToken, body);
  }
}
