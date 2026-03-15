import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../firebase/firebase-admin.constants';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: Auth,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(token, true);

      if (!decodedToken.email) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      const user = await this.usersService.findByEmail(decodedToken.email);

      if (!user) {
        throw new UnauthorizedException('Usuario no registrado en el sistema');
      }

      const tokenRoles = this.extractRoles(decodedToken);

      request['user'] = {
        userId: user.id,
        email: user.correo,
        roles: tokenRoles.length > 0 ? tokenRoles : user.roles?.map((r) => r.rol) ?? [],
      };
      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractRoles(decodedToken: DecodedIdToken): string[] {
    const roles = decodedToken.roles;

    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.filter((role): role is string => typeof role === 'string');
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
