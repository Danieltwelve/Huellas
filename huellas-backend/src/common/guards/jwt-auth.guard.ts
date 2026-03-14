import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../../modules/users/users.service';

interface FirebaseTokenLookupResponse {
  users?: Array<{
    localId: string;
    email: string;
  }>;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = this.jwtService.verify<Record<string, unknown>>(token);
      request['user'] = payload;
      return true;
    } catch {
      // Si falla, intentar como Firebase ID token
    }

    // Validar como Firebase ID token
    try {
      const firebaseUser = await this.validateFirebaseToken(token);
      const user = await this.usersService.findByEmail(firebaseUser.email);

      if (!user) {
        throw new UnauthorizedException('Usuario no registrado en el sistema');
      }

      request['user'] = {
        userId: user.id,
        email: user.correo,
        roles: user.roles?.map((r) => r.rol) ?? [],
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private async validateFirebaseToken(
    idToken: string,
  ): Promise<{ uid: string; email: string }> {
    const webApiKey = this.configService.get<string>('FIREBASE_WEB_API_KEY');

    if (!webApiKey) {
      throw new UnauthorizedException('Firebase config missing');
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(webApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Token de Firebase inválido');
    }

    const payload = (await response.json()) as FirebaseTokenLookupResponse;
    const user = payload.users?.[0];

    if (!user?.email || !user.localId) {
      throw new UnauthorizedException('Token de Firebase inválido');
    }

    return { uid: user.localId, email: user.email };
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
