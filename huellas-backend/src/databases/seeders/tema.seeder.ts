// src/modules/articulos/seeders/tema.seeder.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tema } from 'src/modules/temas/entities/tema.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TemaSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,
  ) {}

  async onModuleInit() {
    const temasIniciales = [
      {
        nombre: 'Ciencia',
        descripcion: 'Artículos relacionados con la ciencia en general',
      },
      {
        nombre: 'Ciencias Naturales',
        descripcion: 'Biología, química, física y ciencias de la tierra',
      },
      {
        nombre: 'Lingüística',
        descripcion: 'Estudio del lenguaje, la comunicación y sus formas de análisis',
      },
      {
        nombre: 'Educación',
        descripcion: 'Pedagogía, didáctica, innovación educativa y formación',
      },
      {
        nombre: 'Tecnología',
        descripcion: 'Innovaciones y avances tecnológicos',
      },
      {
        nombre: 'Salud',
        descripcion: 'Medicina, bienestar y salud pública',
      },
      {
        nombre: 'Matemáticas',
        descripcion: 'Álgebra, cálculo, modelación y pensamiento matemático',
      },
      {
        nombre: 'Lengua y Literatura',
        descripcion: 'Análisis del discurso, escritura, lectura y literatura',
      },
      {
        nombre: 'Ciencias Sociales',
        descripcion: 'Historia, geografía, sociedad y estudios culturales',
      },
      {
        nombre: 'Medio Ambiente',
        descripcion: 'Ecología, sostenibilidad y cambio climático',
      },
      {
        nombre: 'Cultura',
        descripcion: 'Arte, literatura y tradiciones',
      },
      {
        nombre: 'Otro',
        descripcion:
          'Temas diversos no clasificados en las categorías anteriores',
      },
    ];

    for (const temaData of temasIniciales) {
      // Verificar si ya existe un tema con el mismo nombre (o podrías usar el nombre como identificador único)
      const existe = await this.temaRepository.findOneBy({
        nombre: temaData.nombre,
      });
      if (!existe) {
        const nuevoTema = this.temaRepository.create(temaData);
        await this.temaRepository.save(nuevoTema);
      } else {
        // Opcional: si existe, puedes actualizar la descripción si cambió
        if (existe.descripcion !== temaData.descripcion) {
          await this.temaRepository.update(
            { nombre: temaData.nombre },
            { descripcion: temaData.descripcion },
          );
        }
      }
    }
  }
}
