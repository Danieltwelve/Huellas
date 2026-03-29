import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../../common/firebase/firebase-admin.constants';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { EmailStatusResponseDto } from './dtos/email-status.dto';

export interface CustomClaims {
  roles: string[];
  canViewArchivos: boolean;
  canSubmitEnvios: boolean;
  canManageUsers: boolean;
  canManageArticulos: boolean;
  canManageFlujoEditorial: boolean;
  externalSystemUid: string;
}

export interface AuthSyncResponse {
  status: 'ok';
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: Auth,
    private readonly usersService: UsersService,
  ) {}

  async loginWithSocialProvider(
    idToken: string,
    registerData?: { nombre?: string },
  ): Promise<AuthSyncResponse> {
    const firebaseUserData = await this.validateFirebaseToken(idToken);
    let user = await this.usersService.findByEmail(firebaseUserData.email);

    if (!user) {
      user = await this.usersService.create({
        nombre: registerData?.nombre || '',
        correo: firebaseUserData.email,
        correo_verificado: true,
      });
    } else if (!user.correo_verificado) {
      user.correo_verificado = true;
      await this.usersService.save(user);
    }

    const customClaims = this.buildCustomClaims(user);
    await this.setFirebaseCustomClaims(
      firebaseUserData.uid,
      customClaims,
      // Sobrecarga de llamada para marcar el correo como verificado en Firebase si no lo estaba previamente
      true,
    );

    return { status: 'ok' };
  }

  async registerWithEmailAndPassword(
    idToken: string,
    registerData?: { nombre?: string },
  ): Promise<AuthSyncResponse> {
    const firebaseUserData = await this.validateFirebaseToken(idToken);
    let user = await this.usersService.findByEmail(firebaseUserData.email);

    // Desincronización posible: el usuario existe en firebase pero no en la base de datos local. En este caso, se crea el usuario local con el correo verificado (ya que viene de Firebase) y se asignan los claims correspondientes.

    if (!user) {
      user = await this.usersService.create({
        nombre: registerData?.nombre || '',
        correo: firebaseUserData.email,
        correo_verificado: firebaseUserData.emailVerified,
      });
    } else if (!user.correo_verificado && firebaseUserData.emailVerified) {
      user.correo_verificado = true;
      await this.usersService.save(user);
    }

    const customClaims = this.buildCustomClaims(user);
    await this.setFirebaseCustomClaims(firebaseUserData.uid, customClaims);

    return { status: 'ok' };
  }

  async validateFirebaseToken(
    idToken: string,
  ): Promise<{ uid: string; email: string; emailVerified: boolean }> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(idToken, true);

      if (!decodedToken.uid || !decodedToken.email) {
        throw new BadRequestException('Invalid Firebase token payload');
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified ?? false,
      };
    } catch {
      throw new BadRequestException('Unable to verify Firebase token');
    }
  }

  private buildCustomClaims(user: User): CustomClaims {
    const roleNames: string[] = user.roles?.map((r) => r.rol) ?? [];

    const canViewArchivos = roleNames.some((rol) =>
      ['admin', 'editor', 'reviewer'].includes(rol),
    );
    const canSubmitEnvios = roleNames.some((rol) =>
      ['admin', 'autor'].includes(rol),
    );
    const canManageUsers = roleNames.some((rol) =>
      ['admin', 'director'].includes(rol),
    );
    const canManageArticulos = roleNames.some((rol) =>
      ['admin', 'director'].includes(rol),
    );
    const canManageFlujoEditorial = roleNames.some((rol) =>
      ['admin', 'director'].includes(rol),
    );

    return {
      roles: roleNames,
      canViewArchivos,
      canSubmitEnvios,
      canManageUsers,
      canManageArticulos,
      canManageFlujoEditorial,
      externalSystemUid: `huellas-db-${user.id}`,
    };
  }

  async setFirebaseCustomClaims(
    firebaseUid: string,
    customClaims: CustomClaims,
    markAsVerified: boolean = false,
  ): Promise<void> {
    try {
      await this.firebaseAuth.setCustomUserClaims(firebaseUid, customClaims);

      if (markAsVerified) {
        await this.firebaseAuth.updateUser(firebaseUid, {
          emailVerified: true,
        });
      }
    } catch {
      throw new InternalServerErrorException(
        'Unable to set Firebase custom claims',
      );
    }
  }

  async getEmailStatusByEmail(email: string): Promise<EmailStatusResponseDto> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { exists: false, emailVerified: false };
    }

    return {
      exists: true,
      emailVerified: Boolean(user.correo_verificado),
    };
  }
}
