import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // Cambia esto si tu frontend está en otra URL
    credentials: false,
  });

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
