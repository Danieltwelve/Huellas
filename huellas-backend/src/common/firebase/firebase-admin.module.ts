/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Credential,
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from './firebase-admin.constants';

function buildFirebaseCredential(configService: ConfigService): Credential {
  const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
  const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
  const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  }

  return applicationDefault();
}

@Module({
  providers: [
    {
      provide: FIREBASE_AUTH,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Auth => {
        const app =
          getApps().length > 0
            ? getApp()
            : initializeApp({
                credential: buildFirebaseCredential(configService),
                projectId:
                  configService.get<string>('FIREBASE_PROJECT_ID') || undefined,
              });

        return getAuth(app);
      },
    },
  ],
  exports: [FIREBASE_AUTH],
})
export class FirebaseAdminModule {}
