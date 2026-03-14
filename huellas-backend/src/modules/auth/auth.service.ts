/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { google } from 'googleapis';

interface FirebaseTokenLookupResponse {
  users?: Array<{
    localId: string;
    email: string;
    emailVerified: false;
  }>;
}

export interface CustomClaims {
  roles: string[];
  canViewArchivos: boolean;
  canSubmitEnvios: boolean;
  canManageUsers: boolean;
  externalSystemUid: string;
}

@Injectable()
export class AuthService {
  private client = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  private getFirebaseConfig() {
    const webApiKey = process.env.FIREBASE_WEB_API_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!webApiKey || !projectId) {
      throw new InternalServerErrorException(
        'Firebase config missing. Define FIREBASE_WEB_API_KEY and FIREBASE_PROJECT_ID.',
      );
    }

    return { webApiKey, projectId };
  }

  async loginWithSocialProvider(
    idToken: string,
    registerData?: { nombre?: string },
  ): Promise<{ accessToken: string; customClaims: CustomClaims }> {
    try {
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
        true,
      );

      const payload = {
        userId: user.id,
        email: user.correo,
        roles: user.roles?.map((r) => r.rol) ?? [],
      };

      return {
        accessToken: this.jwtService.sign(payload),
        customClaims,
      };
    } catch (error) {
      console.error('ERROR DETALLADO:', error);
      throw error;
    }
  }

  async registerWithEmailAndPassword(
    idToken: string,
    registerData?: { nombre?: string },
  ): Promise<{ accessToken: string; customClaims: CustomClaims }> {
    try {
      const firebaseUserData = await this.validateFirebaseToken(idToken);
      let user = await this.usersService.findByEmail(firebaseUserData.email);

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

      await this.setFirebaseCustomClaims(
        firebaseUserData.uid,
        customClaims,
        false,
      );

      const payload = {
        userId: user.id,
        email: user.correo,
        roles: user.roles?.map((r) => r.rol) ?? [],
      };

      return {
        accessToken: this.jwtService.sign(payload),
        customClaims,
      };
    } catch (error) {
      console.error('Error en syncEmailUser:', error);
      throw error;
    }
  }

  async sendVerificationEmail(idToken: string): Promise<void> {
    const { webApiKey } = this.getFirebaseConfig();

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${webApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken,
        }),
      },
    );

    if (!response.ok) {
      throw new InternalServerErrorException(
        'No fue posible enviar el correo de verificación desde el login',
      );
    }
  }

  async validateFirebaseToken(
    idToken: string,
  ): Promise<{ uid: string; email: string; emailVerified: boolean }> {
    const { webApiKey } = this.getFirebaseConfig();

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );

    if (!response.ok) {
      throw new BadRequestException('Unable to verify Firebase token');
    }

    const payload = (await response.json()) as FirebaseTokenLookupResponse;
    const user = payload.users?.[0];

    if (!user?.email || !user.localId) {
      throw new BadRequestException('Invalid Firebase token payload');
    }

    return {
      uid: user.localId,
      email: user.email,
      emailVerified: user.emailVerified ?? false,
    };
  }

  private buildCustomClaims(user: User): CustomClaims {
    const roleNames: string[] = user.roles?.map((r) => r.rol) ?? [];

    const canViewArchivos = roleNames.some((rol) =>
      ['admin', 'editor', 'reviewer'].includes(rol),
    );

    const canSubmitEnvios = roleNames.some((rol) =>
      ['admin', 'author'].includes(rol),
    );

    const canManageUsers = roleNames.some((rol) => ['admin'].includes(rol));

    return {
      roles: roleNames,
      canViewArchivos,
      canSubmitEnvios,
      canManageUsers,
      externalSystemUid: `huellas-db-${user.id}`,
    };
  }

  async setFirebaseCustomClaims(
    firebaseUid: string,
    customClaims: CustomClaims,
    markAsVerified: boolean = false,
  ): Promise<void> {
    const { projectId } = this.getFirebaseConfig();
    const accessToken = await this.client.getAccessToken();

    if (!accessToken) {
      throw new InternalServerErrorException(
        'Unable to get Google access token',
      );
    }

    const requestBody: any = {
      localId: firebaseUid,
      customAttributes: JSON.stringify(customClaims),
    };

    if (markAsVerified) {
      requestBody.emailVerified = true;
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new InternalServerErrorException(
        'Unable to set Firebase custom claims',
      );
    }
  }
}
