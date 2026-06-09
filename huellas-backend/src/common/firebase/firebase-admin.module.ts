import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from './firebase-admin.constants';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Module({
  providers: [
    {
      provide: FIREBASE_AUTH,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Auth => {
        let isMockMode = false;

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
            } else if (configService.get<string>('NODE_ENV') !== 'production') {
              console.warn(
                '⚠️ ADVERTENCIA: No se encontraron credenciales de Firebase. Inicializando en modo MOCK/DESARROLLO.',
              );
              isMockMode = true;

              // Generar una clave privada RSA dinámica para que Firebase Admin acepte la inicialización
              const { privateKey: dynamicKey } = crypto.generateKeyPairSync('rsa' as any, {
                modulusLength: 2048,
                publicKeyEncoding: {
                  type: 'spki',
                  format: 'pem',
                },
                privateKeyEncoding: {
                  type: 'pkcs8',
                  format: 'pem',
                },
              } as any);

              initializeApp({
                credential: cert({
                  projectId: projectId || 'huellas-app-v-2',
                  clientEmail: 'mock-adminsdk@huellas-app-v-2.iam.gserviceaccount.com',
                  privateKey: dynamicKey,
                }),
              });
            } else {
              throw new Error(
                'No se encontraron credenciales de Firebase. Verifica GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY',
              );
            }
          }
        }

        const auth = getAuth();

        if (isMockMode || configService.get<string>('NODE_ENV') !== 'production' && !process.env.FIREBASE_CLIENT_EMAIL && !fs.existsSync(configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS') || '')) {
          auth.verifyIdToken = async (idToken: string, checkRevoked?: boolean) => {
            console.log('⚠️ verifyIdToken MOCK convocado con token:', idToken);
            try {
              const parts = idToken.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
                if (payload && !payload.uid) {
                  payload.uid = payload.user_id || payload.sub;
                }
                return payload;
              }
            } catch (e) {
              // fallback
            }
            return {
              uid: 'mock-uid-123',
              email: 'admin@huellas.com',
              email_verified: true,
              roles: ['admin'],
            } as any;
          };

          auth.createUser = async (properties) => {
            console.log(`⚠️ createUser MOCK convocado para:`, properties);
            return {
              uid: 'mock-uid-' + Math.random().toString(36).substring(7),
              email: properties.email,
              emailVerified: properties.emailVerified ?? false,
            } as any;
          };

          auth.setCustomUserClaims = async (uid, claims) => {
            console.log(`⚠️ setCustomUserClaims MOCK convocado para ${uid}:`, claims);
            return;
          };

          auth.updateUser = async (uid, properties) => {
            console.log(`⚠️ updateUser MOCK convocado para ${uid}:`, properties);
            return {
              uid,
              ...properties,
            } as any;
          };

          auth.deleteUser = async (uid) => {
            console.log(`⚠️ deleteUser MOCK convocado para ${uid}`);
            return;
          };

          auth.getUserByEmail = async (email) => {
            console.log(`⚠️ getUserByEmail MOCK convocado para ${email}`);
            return {
              uid: 'mock-uid-' + Math.random().toString(36).substring(7),
              email,
              emailVerified: true,
            } as any;
          };

          auth.generateEmailVerificationLink = async (email) => {
            console.log(`⚠️ generateEmailVerificationLink MOCK convocado para ${email}`);
            return `http://localhost:4200/verificar-correo?email=${email}&token=mock-token`;
          };

          auth.generatePasswordResetLink = async (email) => {
            console.log(`⚠️ generatePasswordResetLink MOCK convocado para ${email}`);
            return `http://localhost:4200/restablecer-contraseña?email=${email}&token=mock-token`;
          };
        }

        return auth;
      },
    },
  ],
  exports: [FIREBASE_AUTH],
})
export class FirebaseAdminModule {}
