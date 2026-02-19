import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { google } from 'googleapis';

interface FirebaseTokenLookupResponse {
  users?: Array<{
    localId: string;
    email: string;
  }>;
}

export interface CustomClaims {
  roles: string[];
  canViewArchivos: boolean;
  canSubmitEnvios: boolean;
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

  async loginWithGoogle(
    idToken: string,
  ): Promise<{ accessToken: string; customClaims: CustomClaims }> {
    try {
      const firebaseUserData = await this.validateFirebaseToken(idToken);
      let user = await this.usersService.findByEmail(firebaseUserData.email);
      if (!user) {
        user = await this.usersService.create({
          email: firebaseUserData.email,
        });
      }
      const customClaims = this.buildCustomClaims(user);
      await this.setFirebaseCustomClaims(firebaseUserData.uid, customClaims);

      const payload = {
        userId: user.id,
        email: firebaseUserData.email,
        roles: user.roles,
      };

      return {
        accessToken: this.jwtService.sign(payload),
        customClaims,
      };
    } catch (error) {
      console.error('ERROR DETALLADO:', error); // agrega esto temporalmente
      throw error;
    }
  }

  async validateFirebaseToken(
    idToken: string,
  ): Promise<{ uid: string; email: string }> {
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
    return { uid: user.localId, email: user.email };
  }

  private buildCustomClaims(user: User): CustomClaims {
    const roles = user.roles ?? [UserRole.USER];

    const canViewArchivos = roles.some((item) =>
      [UserRole.ADMIN, UserRole.EDITOR, UserRole.REVIEWER].includes(item),
    );

    const canSubmitEnvios = roles.some((item) =>
      [UserRole.ADMIN, UserRole.AUTHOR].includes(item),
    );

    return {
      roles,
      canViewArchivos,
      canSubmitEnvios,
      externalSystemUid: `huellas-db-${user.id}`, // vincula Firebase con tu DB interna
    };
  }

  async setFirebaseCustomClaims(
    firebaseUid: string,
    customClaims: CustomClaims,
  ): Promise<void> {
    const { projectId } = this.getFirebaseConfig();
    const accessToken = await this.client.getAccessToken();

    if (!accessToken) {
      throw new InternalServerErrorException(
        'Unable to get Google access token',
      );
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          localId: firebaseUid,
          customAttributes: JSON.stringify(customClaims),
        }),
      },
    );

    if (!response.ok) {
      throw new InternalServerErrorException(
        'Unable to set Firebase custom claims',
      );
    }
  }
}
