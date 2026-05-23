import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from './firebase-admin.constants';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

@Module({
  providers: [
    {
      provide: FIREBASE_AUTH,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Auth => {
        if (getApps().length === 0) {
          const credentialsPath = configService.get<string>(
            'GOOGLE_APPLICATION_CREDENTIALS',
          );
          const projectId = configService.get<string>('FIREBASE_PROJECT_ID');

          // Opción 1: Usar archivo de credenciales
          if (credentialsPath && fs.existsSync(credentialsPath)) {
            console.log(
              `✅ Inicializando Firebase con archivo: ${credentialsPath}`,
            );
            initializeApp({
              credential: admin.credential.cert(credentialsPath),
              projectId,
            });
          }
          // Opción 2: Usar variables individuales
          else {
            const clientEmail = configService.get<string>(
              'FIREBASE_CLIENT_EMAIL',
            );
            const privateKey = configService.get<string>(
              'FIREBASE_PRIVATE_KEY',
            );

            if (projectId && clientEmail && privateKey) {
              console.log('✅ Inicializando Firebase con variables de entorno');
              initializeApp({
                credential: cert({
                  projectId,
                  clientEmail,
                  privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
              });
            } else {
              throw new Error(
                'No se encontraron credenciales de Firebase. Verifica GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY',
              );
            }
          }
        }

        return getAuth();
      },
    },
  ],
  exports: [FIREBASE_AUTH],
})
export class FirebaseAdminModule {}
