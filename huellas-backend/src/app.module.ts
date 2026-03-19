import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { EdicionesModule } from './modules/ediciones/ediciones.module';
import { RequisitosRevistaModule } from './modules/requisitos-revista/requisitos-revista.module';
import { ArticulosModule } from './modules/articulos/articulos.module';
import { ArticulosHistorialEtapasModule } from './modules/articulos-historial-etapas/articulos-historial-etapas.module';
import { ObservacionesModule } from './modules/observaciones/observaciones.module';
import { ObservacionesArchivosModule } from './modules/observaciones-archivos/observaciones-archivos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // host: configService.get<string>('DATABASE_HOST'),
        // port: Number(configService.get<string>('DATABASE_PORT', '5432')),
        // username: configService.get<string>('DATABASE_USER'),
        // password: configService.get<string>('DATABASE_PASSWORD'),
        // database: configService.get<string>('DATABASE_NAME'),
        host: 'localhost',
        port: 5432,
        username: 'huellas_user',
        password: 'huellas_password',
        database: 'huellas_db',
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('DATABASE_SYNCHRONIZE', 'true') === 'true', //solo para desarrollo, false en producción
      }),
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
  ],
})
export class AppModule {}
