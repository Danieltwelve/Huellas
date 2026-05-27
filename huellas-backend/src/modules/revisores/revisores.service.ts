/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/await-thenable */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { Revisores } from './entities/revisores.entity';
import { GeminiService } from 'src/common/gemini/gemini.service';
import { User } from 'src/modules/users/user.entity';

@Injectable()
export class RevisoresService {
  constructor(
    @InjectRepository(Revisores)
    private readonly revisoresRepository: Repository<Revisores>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Devuelve la lista de revisores con los campos solicitados:
   * nombre, correo, perfil y cargaActual
   */
  async findAll() {
    const revisores = await this.revisoresRepository.find({
      relations: ['usuario'],
    });

    return revisores.map((r) => ({
      id: r.id,
      nombre: r.usuario?.nombre ?? null,
      correo: r.usuario?.correo ?? null,
      perfil: r.perfil,
      cargaActual: r.cargaActual,
    }));
  }

  async findPerfilByUsuarioId(usuarioId: number) {
    const revisor = await this.revisoresRepository.findOne({
      where: { usuarioId },
      relations: ['usuario'],
    });

    if (!revisor) {
      throw new NotFoundException('Revisor no encontrado');
    }

    return {
      nombre: revisor.usuario?.nombre ?? '',
      telefono: revisor.usuario?.telefono ?? '',
      perfilAcademico: revisor.perfil ?? '',
      institucion: revisor.institucion ?? '',
    };
  }

  async updatePerfilByUsuarioId(
    usuarioId: number,
    data: {
      nombre?: string;
      telefono?: string;
      perfilAcademico?: string;
      institucion?: string;
    },
  ) {
    const revisor = await this.revisoresRepository.findOne({
      where: { usuarioId },
      relations: ['usuario'],
    });

    if (!revisor) {
      throw new NotFoundException('Revisor no encontrado');
    }

    if (typeof data.nombre === 'string') {
      revisor.usuario.nombre = data.nombre;
    }

    if (typeof data.telefono === 'string') {
      revisor.usuario.telefono = data.telefono;
    }

    if (typeof data.perfilAcademico === 'string') {
      revisor.perfil = data.perfilAcademico;
    }

    if (typeof data.institucion === 'string') {
      revisor.institucion = data.institucion;
    }

    await this.userRepository.save(revisor.usuario);
    await this.revisoresRepository.save(revisor);

    return this.findPerfilByUsuarioId(usuarioId);
  }

  async generarPuntaje(
    articuloId: number,
  ): Promise<{ id: number; relevancia: string }[]> {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: ['temas'],
    });

    if (!articulo) {
      throw new NotFoundException('Articulo no encontrado');
    }

    const tituloArticulo = articulo.titulo ?? '';
    const resumenArticulo = articulo.resumen ?? '';
    const palabrasClave = articulo.palabrasClave ?? '';
    const temasArticulo = (articulo.temas ?? [])
      .map((tema) => tema.nombre)
      .filter(Boolean)
      .join(', ');
    const revisores = await this.revisoresRepository.find();
    if (revisores.length === 0) {
      return [];
    }
    const model = this.geminiService.getGenerativeModel();

    const prompt = `
Eres un asistente experto en la asignación de revisores para artículos académicos.
Tu tarea es evaluar la idoneidad de una lista de revisores para un artículo específico, basándote en el perfil del revisor y la información del artículo.
Debes asignar una relevancia de ALTA, MEDIA o BAJA a cada revisor, según la siguiente escala:
- ALTA: el revisor es muy afín al tema, con experiencia directa y conocimientos relevantes.
- MEDIA: el revisor tiene cierta afinidad, pero no es totalmente especialista en el área.
- BAJA: el revisor no tiene relación con el tema del artículo.

Considera la experiencia, áreas de interés y conocimientos del revisor en relación con el tema y la metodología del artículo.

Título del artículo:
"${tituloArticulo}"

Resumen del artículo:
"${resumenArticulo}"

Palabras clave del artículo:
"${palabrasClave}"

Temas del artículo:
"${temasArticulo}"

Lista de revisores:
${revisores
  .map(
    (r) => `
- ID: ${r.id}
  Perfil: ${r.perfil}
`,
  )
  .join('')}

Devuelve la respuesta en formato JSON, como un array de objetos, donde cada objeto contenga "id" y "relevancia" (solo los valores "ALTA", "MEDIA" o "BAJA", sin texto adicional ni justificación).
Ejemplo de formato de respuesta:
[
  { "id": 1, "relevancia": "ALTA" },
  { "id": 2, "relevancia": "MEDIA" }
]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    try {
      const cleanedText = text
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();
      const jsonStart = cleanedText.indexOf('[');
      const jsonEnd = cleanedText.lastIndexOf(']');
      const jsonPayload =
        jsonStart !== -1 && jsonEnd !== -1
          ? cleanedText.slice(jsonStart, jsonEnd + 1)
          : cleanedText;

      const parsed = JSON.parse(jsonPayload);
      const relevancias = Array.isArray(parsed) ? parsed : [];
      return this.normalizarRelevancias(revisores, relevancias);
    } catch (error) {
      console.error('Error al parsear la respuesta de Gemini:', error);
      throw new Error('Error al procesar la respuesta del modelo de lenguaje.');
    }
  }

  private normalizarRelevancias(
    revisores: Revisores[],
    relevancias: Array<{ id: number; relevancia: string }>,
  ): { id: number; relevancia: string }[] {
    const mapa = new Map<number, string>();
    const valoresValidos = new Set(['ALTA', 'MEDIA', 'BAJA']);

    for (const item of relevancias) {
      const id = Number(item?.id);
      const relevancia = String(item?.relevancia ?? '').toUpperCase().trim();
      if (Number.isFinite(id) && valoresValidos.has(relevancia)) {
        mapa.set(id, relevancia);
      }
    }

    return revisores.map((revisor) => {
      const normalizado = mapa.get(revisor.id) ?? 'BAJA';
      return {
        id: revisor.id,
        relevancia: normalizado,
      };
    });
  }
}
