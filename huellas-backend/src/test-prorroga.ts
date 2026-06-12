import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ArticulosService } from './modules/articulos/articulos.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ArticulosService);
  try {
    console.log('Resolving prorroga...');
    const res = await service.resolverSolicitudProrrogaComite(34, 10, 'aceptar');
    console.log('Success!', res);
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await app.close();
  }
}

test();
