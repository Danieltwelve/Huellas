import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ArticulosService } from './modules/articulos/articulos.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ArticulosService);
  try {
    console.log('Querying articles for user 2 (coauthor)...');
    const articles = await service.getArticulosPorAutor(2);
    console.log(`Found ${articles.length} articles:`);
    console.log(JSON.stringify(articles, null, 2));
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await app.close();
  }
}

test();
