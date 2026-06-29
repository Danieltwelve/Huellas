import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './common/metrics/metrics.service';
import { MetricsController } from './common/metrics/metrics.controller';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { EdicionesModule } from './modules/ediciones/ediciones.module';
import { RequisitosRevistaModule } from './modules/requisitos-revista/requisitos-revista.module';
import { ArticulosModule } from './modules/articulos/articulos.module';
import { ArticulosHistorialEtapasModule } from './modules/articulos-historial-etapas/articulos-historial-etapas.module';
import { ObservacionesModule } from './modules/observaciones/observaciones.module';
import { ObservacionesArchivosModule } from './modules/observaciones-archivos/observaciones-archivos.module';
import { TemasModule } from './modules/temas/temas.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RevisoresModule } from './modules/revisores/revisores.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AvisosModule } from './modules/avisos/avisos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host =
          configService.get<string>('DB_HOST') ??
          configService.get<string>('DATABASE_HOST') ??
          'localhost';
        const port = Number(
          configService.get<string>('DB_PORT') ??
            configService.get<string>('DATABASE_PORT') ??
            5432,
        );
        const username =
          configService.get<string>('DB_USERNAME') ??
          configService.get<string>('DATABASE_USER') ??
          'huellas_user';
        const password =
          configService.get<string>('DB_PASSWORD') ??
          configService.get<string>('DATABASE_PASSWORD') ??
          'huellas_password';
        const database =
          configService.get<string>('DB_DATABASE') ??
          configService.get<string>('DATABASE_NAME') ??
          'huellas_db';
        const synchronize =
          (configService.get<string>('DB_SYNC') ?? 'false') === 'true' ||
          (configService.get<string>('DATABASE_SYNCHRONIZE') ?? 'true') ===
            'true';
        const ssl =
          configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false;

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize,
          ssl,
        };
      },
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads', 'portadas'),
      serveRoot: '/uploads/portadas',
    }),
    UsersModule,
    AuthModule,
    RolesModule,
    EdicionesModule,
    RequisitosRevistaModule,
    ArticulosModule,
    ArticulosHistorialEtapasModule,
    ObservacionesModule,
    ObservacionesArchivosModule,
    TemasModule,
    RevisoresModule,
    AvisosModule,
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
