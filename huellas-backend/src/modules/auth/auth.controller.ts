import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, CustomClaims } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async googleAuth(@Body('idToken') idToken: string): Promise<{
    accessToken: string;
    customClaims: CustomClaims;
  }> {
    return this.authService.loginWithGoogle(idToken);
  }
}
