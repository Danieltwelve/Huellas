import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  private client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID);
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async validateGoogleToken(idToken: string): Promise<{ email: string }> {
    try {
      const loginTicket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = loginTicket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }
      return {
        email: payload?.email as string,
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Unable to verify Google token');
    }
  }

  async loginWithGoogle(idToken: string): Promise<{ accessToken: string }> {
    const userData = await this.validateGoogleToken(idToken);
    let user = await this.usersService.findByEmail(userData.email);
    if (!user) {
      user = await this.usersService.create(userData);
    }
    const payload = { userId: user.id, email: userData.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
