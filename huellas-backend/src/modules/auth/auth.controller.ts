import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('google')
  async googleAuth(@Body('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }
}
