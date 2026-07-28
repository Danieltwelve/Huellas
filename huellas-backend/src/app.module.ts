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
        const databaseUrl = configService.get<string>('DATABASE_URL');

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false, // En producción siempre false
          ssl: { rejectUnauthorized: false },
        };
      },
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
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
