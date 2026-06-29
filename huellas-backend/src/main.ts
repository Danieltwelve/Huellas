process.env.TZ = 'UTC';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Registrar Helmet para inyectar cabeceras de seguridad
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permitir que Swagger UI cargue sus recursos correctamente
    }),
  );

  // Configuración de CORS dinámico según el entorno
  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
      : ['http://localhost:4200'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Huellas API')
    .setDescription('API de la revista Huellas - Sistema de gestión editorial')
    .setVersion('1.0')
    .addTag('users', 'Usuarios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
  console.log(
    `Documentación Swagger disponible en http://localhost:${port}/api`,
  );
}
bootstrap().catch((err) => {
  console.error('Error starting application:', err);
  process.exit(1);
});
