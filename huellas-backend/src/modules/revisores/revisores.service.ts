/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { Revisores } from './entities/revisores.entity';
import { GeminiService } from 'src/common/gemini/gemini.service';
import { User } from 'src/modules/users/user.entity';
import { Observacion } from 'src/modules/observaciones/entities/observacione.entity';
import { ObservacionArchivo } from 'src/modules/observaciones-archivos/entities/observaciones-archivo.entity';

@Injectable()
export class RevisoresService {
  private static readonly ETAPA_REVISION_PARES = 4;
  private static readonly ASUNTO_REVISION_PARES_APROBADO = 'Revisión por pares: ACEPTAR';
  private static readonly ASUNTO_REVISION_PARES_AJUSTES = 'Revisión por pares: AJUSTES';
  private static readonly ASUNTO_REVISION_PARES_RECHAZADO = 'Revisión por pares: RECHAZAR';

  constructor(
    private readonly dataSource: DataSource,
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

  async getArticulosAsignadosRevisor(usuarioId: number) {
    const articulos = await this.articuloRepository.find({
      relations: ['revisor', 'etapaActual', 'historialEtapas', 'temas'],
      order: { id: 'DESC' },
    });

    // Obtener las observaciones de revisión existentes para este revisor, para marcar estado 'enviado'
    const observacionesRepo = this.dataSource.getRepository(Observacion);
    const observacionesRevisor = await observacionesRepo.find({
      where: { usuarioId, etapaId: RevisoresService.ETAPA_REVISION_PARES },
    });
    const articulosConRevision = new Set(observacionesRevisor.map((o) => o.articuloId));

    return articulos
      .filter((articulo) => articulo.revisor?.usuarioId === usuarioId)
      .map((articulo, index) => {
        const fechaAsignacion = this.obtenerFechaAsignacionRevision(articulo);
        const fechaLimite = fechaAsignacion
          ? new Date(
              new Date(fechaAsignacion).getTime() + 30 * 24 * 60 * 60 * 1000,
            )
          : null;
        const diasRestantes = fechaLimite
          ? Math.ceil(
              (fechaLimite.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return {
          id: articulo.id,
          codigo: articulo.codigo,
          titulo: articulo.titulo,
          resumen: articulo.resumen,
          tema:
            articulo.temas?.map((tema) => tema.nombre).filter(Boolean).join(', ') ||
            'Sin tema',
          fechaAsignacion: fechaAsignacion?.toISOString() ?? null,
          fechaLimite: fechaLimite?.toISOString() ?? null,
          estado: articulosConRevision.has(articulo.id) ? 'enviado' : 'en-proceso',
          prioridad:
            diasRestantes !== null && diasRestantes <= 5
              ? 'alta'
              : diasRestantes !== null && diasRestantes <= 10
                ? 'media'
                : 'baja',
          ronda: Math.max(
            1,
            (articulo.historialEtapas ?? []).filter(
              (historial) => historial.etapaId === RevisoresService.ETAPA_REVISION_PARES,
            ).length,
          ),
          enlace: `/panel-revisor/realizar-revision?articuloId=${articulo.id}`,
          orden: index,
        };
      });
  }

  async getNotificacionesRevisor(usuarioId: number) {
    const articulos = await this.getArticulosAsignadosRevisor(usuarioId);

    return articulos
      .sort((a, b) => {
        const fechaA = a.fechaAsignacion ? new Date(a.fechaAsignacion).getTime() : 0;
        const fechaB = b.fechaAsignacion ? new Date(b.fechaAsignacion).getTime() : 0;
        return fechaB - fechaA;
      })
      .map((articulo) => ({
        id: `ASIG-${articulo.id}`,
        articuloId: articulo.id,
        codigoArticulo: articulo.codigo,
        titulo: 'Nuevo artículo asignado',
        detalle: `Se asignó ${articulo.codigo} para revisión por pares.`,
        fecha: articulo.fechaAsignacion ?? new Date().toISOString(),
        enlace: articulo.enlace,
      }));
  }

  async registrarRevisionRevisor(
    usuarioId: number,
    articuloId: number,
    data: {
      recomendacion: 'aceptar' | 'ajustes' | 'rechazar';
      calificacion: number;
      comentarios?: string;
    },
    archivo?: Express.Multer.File,
  ) {
    const revisor = await this.revisoresRepository.findOne({
      where: { usuarioId },
      relations: ['usuario'],
    });

    if (!revisor) {
      throw new NotFoundException('Revisor no encontrado');
    }

    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: ['revisor', 'etapaActual'],
    });

    if (!articulo) {
      throw new NotFoundException('Artículo no encontrado');
    }

    if (articulo.etapaActualId !== RevisoresService.ETAPA_REVISION_PARES) {
      throw new BadRequestException(
        'El artículo no está en la etapa de Revisión por pares.',
      );
    }

    if (articulo.revisor?.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permiso para revisar este artículo porque no está asignado a tu cuenta.',
      );
    }

    const observacionesRepo = this.dataSource.getRepository(Observacion);
    const revisionExistente = await observacionesRepo.findOne({
      where: {
        articuloId,
        usuarioId,
        etapaId: RevisoresService.ETAPA_REVISION_PARES,
      },
    });

    if (revisionExistente) {
      throw new ConflictException(
        'Ya enviaste una revisión para este artículo.',
      );
    }

    const calificacion = Number(data.calificacion);
    if (!Number.isFinite(calificacion) || calificacion < 1 || calificacion > 5) {
      throw new BadRequestException('La calificación debe estar entre 1 y 5.');
    }

    const recomendacion = data.recomendacion;
    const asunto =
      recomendacion === 'aceptar'
        ? RevisoresService.ASUNTO_REVISION_PARES_APROBADO
        : recomendacion === 'rechazar'
          ? RevisoresService.ASUNTO_REVISION_PARES_RECHAZADO
          : RevisoresService.ASUNTO_REVISION_PARES_AJUSTES;

    const observacionBase = [
      `Calificación: ${calificacion}/5`,
      `Recomendación: ${recomendacion.toUpperCase()}`,
      data.comentarios?.trim() ? `Comentarios:\n${data.comentarios.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const observacion = observacionesRepo.create({
      articuloId,
      usuarioId,
      etapaId: RevisoresService.ETAPA_REVISION_PARES,
      asunto,
      comentarios: observacionBase,
    });

    const observacionGuardada = await observacionesRepo.save(observacion);

    if (archivo) {
      const archivoRepo = this.dataSource.getRepository(ObservacionArchivo);
      const registroArchivo = archivoRepo.create({
        observacionesId: observacionGuardada.id,
        archivoPath: archivo.path,
        archivoNombreOriginal: archivo.originalname,
      });

      await archivoRepo.save(registroArchivo);
    }

    return {
      message: 'Revisión registrada correctamente.',
      articuloId,
      observacionId: observacionGuardada.id,
      recomendacion,
      calificacion,
    };
  }

  async getHistorialRevisionRevisor(usuarioId: number) {
    const observaciones = await this.dataSource.getRepository(Observacion).find({
      where: {
        usuarioId,
        etapaId: RevisoresService.ETAPA_REVISION_PARES,
      },
      relations: ['articulo', 'archivos'],
      order: { fechaSubida: 'DESC' },
    });

    return observaciones.map((observacion) => {
      const asunto = (observacion.asunto ?? '').toLowerCase();
      const decision = asunto.includes('rechaz')
        ? 'rechazar'
        : asunto.includes('ajust')
          ? 'ajustes'
          : 'aceptar';
      const archivoPrincipal = observacion.archivos?.[0] ?? null;

      return {
        id: observacion.id,
        articuloId: observacion.articuloId,
        codigoArticulo: observacion.articulo?.codigo ?? `ART-${observacion.articuloId}`,
        tituloArticulo: observacion.articulo?.titulo ?? 'Artículo sin título',
        decision,
        fechaEnvio: observacion.fechaSubida.toISOString(),
        observacion: observacion.comentarios ?? '',
        tieneAdjunto: Boolean(archivoPrincipal),
        archivoNombre: archivoPrincipal?.archivoNombreOriginal ?? null,
        enlace: `/panel-revisor/realizar-revision?articuloId=${observacion.articuloId}`,
      };
    });
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

    try {
      const model = await this.geminiService.getGenerativeModel();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

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
      console.warn(
        'Gemini no estuvo disponible o respondió con error. Usando relevancia local de respaldo.',
        error,
      );

      return this.calcularRelevanciaLocal(
        revisores,
        tituloArticulo,
        resumenArticulo,
        palabrasClave,
        temasArticulo,
      );
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

  private calcularRelevanciaLocal(
    revisores: Revisores[],
    tituloArticulo: string,
    resumenArticulo: string,
    palabrasClave: string,
    temasArticulo: string,
  ): { id: number; relevancia: string }[] {
    const contextoArticulo = [
      tituloArticulo,
      resumenArticulo,
      palabrasClave,
      temasArticulo,
    ]
      .join(' ')
      .toLowerCase();

    return revisores.map((revisor) => {
      const perfil = (revisor.perfil ?? '').toLowerCase();
      const coincidenciasTematicas = this.contarCoincidencias(
        contextoArticulo,
        perfil,
      );

      let relevancia: 'ALTA' | 'MEDIA' | 'BAJA' = 'BAJA';

      if (coincidenciasTematicas >= 5) {
        relevancia = 'ALTA';
      } else if (coincidenciasTematicas >= 2) {
        relevancia = 'MEDIA';
      }

      return {
        id: revisor.id,
        relevancia,
      };
    });
  }

  private contarCoincidencias(textoBase: string, textoPerfil: string): number {
    const palabrasClave = [
      'investig',
      'acad',
      'ciencia',
      'tecnolog',
      'educ',
      'linguist',
      'lenguaj',
      'discurso',
      'metodolog',
      'estadistic',
      'ingenier',
      'comput',
      'datos',
      'ia',
      'inteligencia artificial',
      'sosten',
      'social',
    ];

    const combinado = `${textoBase} ${textoPerfil}`;
    return palabrasClave.reduce((acumulado, palabra) => {
      return acumulado + (combinado.includes(palabra) ? 1 : 0);
    }, 0);
  }

  private obtenerFechaAsignacionRevision(articulo: Articulo): Date | null {
    const historialRevision = (articulo.historialEtapas ?? [])
      .filter((historial) => historial.etapaId === RevisoresService.ETAPA_REVISION_PARES)
      .sort(
        (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
      );

    if (historialRevision.length > 0) {
      return new Date(historialRevision[0].fechaInicio);
    }

    return null;
  }
}
