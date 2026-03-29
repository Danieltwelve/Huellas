import { Module } from '@nestjs/common';
import {
  Credential,
  applicationDefault,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from './firebase-admin.constants';

function buildFirebaseCredential(): Credential {
  return applicationDefault();
}

@Module({
  providers: [
    {
      provide: FIREBASE_AUTH,
      useFactory: (): Auth => {
        const app =
          getApps().length > 0
            ? getApp()
            : initializeApp({
                credential: buildFirebaseCredential(),
              });

        return getAuth(app);
      },
    },
  ],
  exports: [FIREBASE_AUTH],
})
export class FirebaseAdminModule {}
