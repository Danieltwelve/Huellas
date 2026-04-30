/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CreateArticuloCompletoDto } from './dto/create-articulo-completo.dto';
import { EdicionRevista } from '../ediciones/edicion-revista.entity';
import { Articulo } from './entities/articulo.entity';
import { EtapaArticulo } from '../etapas-articulo/entities/etapa_articulo.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FerchContador } from './entities/ferch-contador.entity';
import { User } from '../users/user.entity';
import { Tema } from '../temas/entities/tema.entity';
import { ArticulosConfiguracion } from './entities/articulos-configuracion.entity';

@Injectable()
export class ArticulosService {
  private readonly logger = new Logger(ArticulosService.name);

  private static readonly ETAPA_REVISION_PRELIMINAR = 1;
  private static readonly ETAPA_TURNITIN = 3;
  private static readonly ETAPA_COMITE_EDITORIAL = 6;
  private static readonly ETAPAS_FLUJO_ORDENADO = [1, 6, 3, 4, 8, 9, 5];
  private static readonly ETAPA_DESCARTADO = 7;
  private static readonly MAX_ARTICULOS_ASIGNADOS_COMITE = 4;
  private static readonly ASUNTO_CORRECCION_AUTOR =
    'Corrección enviada por autor';
  private static readonly ASUNTO_CORRECCION_ACEPTADA =
    'Corrección aceptada por equipo editorial';
  private static readonly ASUNTO_EVALUACION_TURNITIN_CORRECCION =
    'Evaluación de Turnitin: REQUIERE CORRECCIÓN';
  private static readonly ASUNTO_EVALUACION_TURNITIN_DESCARTADO =
    'Evaluación de Turnitin: DESCARTADO';
  private static readonly ASUNTO_EVALUACION_COMITE_APROBADO =
    'Evaluación de comité editorial: ACEPTADO';
  private static readonly ASUNTO_EVALUACION_COMITE_RECHAZADO =
    'Evaluación de comité editorial: RECHAZADO';

  constructor(
    private dataSource: DataSource,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FerchContador)
    private readonly ferchContadorRepository: Repository<FerchContador>,
    @InjectRepository(ArticulosConfiguracion)
    private readonly articulosConfiguracionRepository: Repository<ArticulosConfiguracion>,
  ) {}

  private readonly configuracionEnviosKey = 'envios_articulos_habilitados';

  private async obtenerConfiguracionEnvios(): Promise<ArticulosConfiguracion> {
    const configuracion = await this.articulosConfiguracionRepository.findOne({
      where: { clave: this.configuracionEnviosKey },
    });

    if (configuracion) {
      return configuracion;
    }

    const nuevaConfiguracion = this.articulosConfiguracionRepository.create({
      clave: this.configuracionEnviosKey,
      valorBooleano: true,
    });

    return await this.articulosConfiguracionRepository.save(nuevaConfiguracion);
  }

  async getEstadoEnviosArticulos(): Promise<{ habilitado: boolean }> {
    const configuracion = await this.obtenerConfiguracionEnvios();
    return { habilitado: configuracion.valorBooleano };
  }

  async actualizarEstadoEnviosArticulos(
    habilitado: boolean,
  ): Promise<{ habilitado: boolean }> {
    const configuracion = await this.obtenerConfiguracionEnvios();
    configuracion.valorBooleano = habilitado;
    await this.articulosConfiguracionRepository.save(configuracion);

    return { habilitado: configuracion.valorBooleano };
  }

  private ensureArticuloNoDescartado(articulo: Articulo): void {
    if (articulo.etapaActualId === ArticulosService.ETAPA_DESCARTADO) {
      throw new BadRequestException(
        'Este artículo fue descartado y no puede continuar en el proceso editorial.',
      );
    }
  }

  private getSiguienteEtapaPermitida(etapaActualId: number): number | null {
    // eslint-disable-next-line prettier/prettier
    const indiceActual = ArticulosService.ETAPAS_FLUJO_ORDENADO.indexOf(
      etapaActualId,
    );

    if (indiceActual === -1) {
      return null;
    }

    return ArticulosService.ETAPAS_FLUJO_ORDENADO[indiceActual + 1] ?? null;
  }

  async crearEnvioArticulo(
    dto: CreateArticuloCompletoDto,
    archivoPath: string,
    archivoNombreOriginal: string,
    usuarioEmisorId: number,
  ) {
    const estadoEnvios = await this.getEstadoEnviosArticulos();
    if (!estadoEnvios.habilitado) {
      throw new ForbiddenException(
        'El envío de artículos está deshabilitado temporalmente.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --- PASO 1: Obtener FERCH - Buscar edicion_id activa ---

      const contador = await queryRunner.manager
        .createQueryBuilder(FerchContador, 'contador')
        .setLock('pessimistic_write')
        .where('id = 1')
        .getOne();

      if (!contador) {
        throw new InternalServerErrorException(
          'No se encontró el contador de artículos',
        );
      }

      const siguienteNumero = contador.ultimoNumero + 1;
      const siguienteCodigo = `FERCH - ${siguienteNumero}`;

      await queryRunner.manager.update(
        FerchContador,
        { id: 1 },
        { ultimoNumero: siguienteNumero },
      );

      const edicionActiva = await queryRunner.manager.findOne(EdicionRevista, {
        where: { estado_id: { id: 1 } } as any,
        order: { fecha_estado: 'ASC' },
      });
      if (!edicionActiva) {
        throw new BadRequestException(
          'No hay ninguna edición ABIERTA en este momento.',
        );
      }

      // --- PASO 2: Crear Artículo ---
      const palabrasClaveString = dto.palabras_clave!.join(', ');

      const nuevoArticulo = queryRunner.manager.create(Articulo, {
        codigoNumero: siguienteNumero,
        codigo: siguienteCodigo,
        titulo: dto.titulo,
        resumen: dto.resumen,
        palabrasClave: palabrasClaveString,
        etapaActualId: ArticulosService.ETAPA_REVISION_PRELIMINAR,
        edicionId: edicionActiva.id,
      });
      const articuloGuardado = await queryRunner.manager.save(nuevoArticulo);

      const temaSeleccionado = await queryRunner.manager.findOne(Tema, {
        where: { id: dto.tema_id },
      });

      if (!temaSeleccionado) {
        throw new BadRequestException('El tema seleccionado no existe.');
      }

      const autoresExistentes = await queryRunner.manager.find(User, {
        where: { id: In(dto.usuarios_ids) },
        select: ['id'],
      });

      if (autoresExistentes.length !== dto.usuarios_ids.length) {
        throw new BadRequestException(
          'Uno o más autores seleccionados no existen.',
        );
      }

      // 3. Insertar en articulo_temas
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Articulo, 'temas') // 'temas' es la propiedad en articulo.entity.ts
        .of(articuloGuardado.id)
        .add(dto.tema_id);

      // 4. Insertar en articulo_autores
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Articulo, 'autores')
        .of(articuloGuardado.id)
        .add(dto.usuarios_ids);

      // --- PASO 5: Crear Observaciones ---
      console.log('-----------------');
      const nuevaObservacion = queryRunner.manager.create(Observacion, {
        articulo: { id: articuloGuardado.id },
        usuario: { id: usuarioEmisorId },
        etapa: { id: ArticulosService.ETAPA_REVISION_PRELIMINAR },
        asunto: dto.asunto,
        comentarios: dto.comentarios,
      });
      const observacionGuardada =
        await queryRunner.manager.save(nuevaObservacion);

      // --- PASO 6: Registrar Archivo ---
      const observacionArchivo = queryRunner.manager.create(
        ObservacionArchivo,
        {
          observacionesId: observacionGuardada.id,
          archivoPath: archivoPath,
          archivoNombreOriginal,
        },
      );
      await queryRunner.manager.save(observacionArchivo);

      // --- PASO 7: Historial de Etapas ---
      const ahora = new Date();

      const historialEtapaRevision = queryRunner.manager.create(
        ArticuloHistorialEtapa,
        {
          articuloId: articuloGuardado.id,
          etapaId: ArticulosService.ETAPA_REVISION_PRELIMINAR,
          fechaInicio: ahora,
          usuarioId: usuarioEmisorId,
        },
      );
      await queryRunner.manager.save(historialEtapaRevision);

      // FINALIZACIÓN: Confirmar transacción
      await queryRunner.commitTransaction();

      return {
        message: 'Artículo enviado y registrado correctamente',
        articuloId: articuloGuardado.id,
      };
    } catch (error) {
      // ROLLBACK: Revertir todo si hay error
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error al registrar envío de artículo: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      // Borrar archivo huérfano
      if (archivoPath) {
        try {
          await fs.unlink(archivoPath);
        } catch (unlinkError) {
          console.error(
            `No se pudo borrar el archivo: ${archivoPath}`,
            unlinkError,
          );
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al registrar el envío. ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
      );
    } finally {
      // Liberar el runner
      await queryRunner.release();
    }
  }

  async getArticuloFujo(articuloId: number) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: [
        'autores',
        'temas',
        'etapaActual',
        'comiteEditorial',
        'historialEtapas',
        'historialEtapas.etapa',
        'observaciones',
        'observaciones.etapa',
        'observaciones.usuario',
        'observaciones.usuario.roles',
        'observaciones.archivos',
      ],
    });

    if (!articulo) {
      throw new BadRequestException('Artículo no encontrado');
    }

    const historialEnvioInicial = (articulo.historialEtapas ?? [])
      .filter((historial) => historial.etapaId === 1)
      .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime());

    const fechaEnvioInicial = historialEnvioInicial[0]?.fechaInicio;

    const evaluacionComiteRealizada = (articulo.observaciones ?? []).some(
      (obs) =>
        [
          ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO,
          ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO,
        ].includes(obs.asunto),
    );

    return {
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      evaluacionComiteRealizada,
      fechaAsignacionComite: articulo.fechaAsignacionComite ?? null,
      fechaVencimientoComite: articulo.fechaVencimientoComite ?? null,
      resumen: articulo.resumen,
      palabrasClave: articulo.palabrasClave
        .split(',')
        .map((palabra) => palabra.trim())
        .filter((palabra) => palabra.length > 0),
      temas: articulo.temas?.map((tema) => tema.nombre) ?? [],
      fechaEnvio: fechaEnvioInicial ?? null,
      etapaActual: articulo.etapaActual
        ? {
            id: articulo.etapaActual.id,
            nombre: articulo.etapaActual.nombre,
          }
        : null,
      autores: articulo.autores.map((autor) => ({
        id: autor.id,
        nombre: autor.nombre,
        email: autor.correo,
      })),
      comiteEditorial: articulo.comiteEditorial
        ? {
            id: articulo.comiteEditorial.id,
            nombre: articulo.comiteEditorial.nombre,
            email: articulo.comiteEditorial.correo,
          }
        : null,
      historialEtapas: (articulo.historialEtapas ?? [])
        .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())
        .map((historial) => ({
          id: historial.id,
          etapaId: historial.etapaId,
          etapaNombre: historial.etapa?.nombre ?? 'Sin etapa',
          fechaInicio: historial.fechaInicio,
          fechaFin: historial.fechaFin,
          usuarioId: historial.usuarioId,
        })),
      observaciones: articulo.observaciones.map((obs) => ({
        id: obs.id,
        asunto: obs.asunto,
        comentarios: obs.comentarios,
        fechaSubida: obs.fechaSubida,
        etapa: obs.etapa
          ? {
              id: obs.etapa.id,
              nombre: obs.etapa.nombre,
            }
          : null,
        usuario: obs.usuario
          ? {
              id: obs.usuario.id,
              nombre: obs.usuario.nombre,
              email: obs.usuario.correo,
              roles: obs.usuario.roles.map((role) => ({
                id: role.id,
                nombre: role.rol,
              })),
            }
          : null,
        archivos: obs.archivos.map((arch) => ({
          id: arch.id,
          archivoPath: arch.archivoPath,
          archivoNombreOriginal: arch.archivoNombreOriginal,
        })),
      })),
    };
  }

  async agregarObservacion(
    articuloId: number,
    payload: {
      asunto: string;
      comentarios?: string;
      etapaId?: number;
    },
    usuarioId: number,
    archivo?: Express.Multer.File,
  ) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: ['etapaActual'],
    });

    if (!articulo) {
      throw new NotFoundException('Artículo no encontrado');
    }

    this.ensureArticuloNoDescartado(articulo);

    const etapaId = payload.etapaId ?? articulo.etapaActualId;

    const etapaExiste = await this.dataSource
      .getRepository(EtapaArticulo)
      .findOne({
        where: { id: etapaId },
      });

    if (!etapaExiste) {
      throw new BadRequestException('La etapa indicada no existe');
    }

    const observacion = this.dataSource.getRepository(Observacion).create({
      articuloId,
      usuarioId,
      etapaId,
      asunto: payload.asunto,
      comentarios: payload.comentarios || '',
    });

    const observacionGuardada = await this.dataSource
      .getRepository(Observacion)
      .save(observacion);

    if (archivo) {
      const registroArchivo = this.dataSource
        .getRepository(ObservacionArchivo)
        .create({
          observacionesId: observacionGuardada.id,
          archivoPath: archivo.path,
          archivoNombreOriginal: archivo.originalname,
        });

      await this.dataSource
        .getRepository(ObservacionArchivo)
        .save(registroArchivo);
    }

    return {
      message: 'Observación registrada correctamente',
      observacionId: observacionGuardada.id,
    };
  }

  async cambiarEtapaArticulo(
    articuloId: number,
    nuevaEtapaId: number,
    usuarioId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const articulo = await queryRunner.manager.findOne(Articulo, {
        where: { id: articuloId },
      });

      if (!articulo) {
        throw new NotFoundException('Artículo no encontrado');
      }

      this.ensureArticuloNoDescartado(articulo);

      if (articulo.etapaActualId === nuevaEtapaId) {
        throw new BadRequestException(
          'El artículo ya se encuentra en esta etapa',
        );
      }

      const etapaSiguientePermitida = this.getSiguienteEtapaPermitida(
        articulo.etapaActualId,
      );

      if (!etapaSiguientePermitida) {
        throw new BadRequestException(
          'El artículo ya está en la última etapa del flujo editorial.',
        );
      }

      if (nuevaEtapaId !== etapaSiguientePermitida) {
        throw new BadRequestException(
          'Solo puedes avanzar a la siguiente etapa del flujo editorial.',
        );
      }

      if (
        articulo.etapaActualId === ArticulosService.ETAPA_COMITE_EDITORIAL &&
        nuevaEtapaId === ArticulosService.ETAPA_TURNITIN
      ) {
        const evaluacionComiteAceptada = await queryRunner.manager.findOne(
          Observacion,
          {
            where: {
              articuloId,
              etapaId: ArticulosService.ETAPA_COMITE_EDITORIAL,
              asunto: ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO,
            },
            select: ['id'],
          },
        );

        const evaluacionComiteRechazada = await queryRunner.manager.findOne(
          Observacion,
          {
            where: {
              articuloId,
              etapaId: ArticulosService.ETAPA_COMITE_EDITORIAL,
              asunto: ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO,
            },
            select: ['id'],
          },
        );

        if (evaluacionComiteRechazada) {
          throw new BadRequestException(
            'El artículo fue rechazado por el Comité Editorial y no puede avanzar a Turnitin.',
          );
        }

        if (!evaluacionComiteAceptada) {
          throw new BadRequestException(
            'Para mover a Turnitin, primero debes contar con una evaluación aprobada del Comité Editorial.',
          );
        }
      }

      const etapaDestino = await queryRunner.manager.findOne(EtapaArticulo, {
        where: { id: nuevaEtapaId },
      });

      if (!etapaDestino) {
        throw new BadRequestException('La etapa de destino no existe');
      }

      const historialAbierto = await queryRunner.manager.findOne(
        ArticuloHistorialEtapa,
        {
          where: {
            articuloId,
            fechaFin: IsNull(),
          },
          order: { fechaInicio: 'DESC' },
        },
      );

      const ahora = new Date();

      if (historialAbierto) {
        historialAbierto.fechaFin = ahora;
        await queryRunner.manager.save(historialAbierto);
      }

      articulo.etapaActualId = nuevaEtapaId;
      await queryRunner.manager.save(articulo);

      const nuevoHistorial = queryRunner.manager.create(
        ArticuloHistorialEtapa,
        {
          articuloId,
          etapaId: nuevaEtapaId,
          usuarioId,
          fechaInicio: ahora,
        },
      );

      await queryRunner.manager.save(nuevoHistorial);
      await queryRunner.commitTransaction();

      return {
        message: 'Etapa actualizada correctamente',
        etapaActual: {
          id: etapaDestino.id,
          nombre: etapaDestino.nombre,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async evaluarArticuloTurnitin(
    articuloId: number,
    usuarioId: number,
    porcentaje: number,
    observacion?: string,
    archivo?: Express.Multer.File,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const articulo = await queryRunner.manager.findOne(Articulo, {
        where: { id: articuloId },
      });

      if (!articulo) {
        throw new NotFoundException('Artículo no encontrado');
      }

      this.ensureArticuloNoDescartado(articulo);

      if (articulo.etapaActualId !== ArticulosService.ETAPA_TURNITIN) {
        throw new BadRequestException(
          'El artículo no está en la etapa de Turnitin.',
        );
      }

      const evaluacionDescarta = porcentaje >= 65;
      const asuntoEvaluacion = evaluacionDescarta
        ? ArticulosService.ASUNTO_EVALUACION_TURNITIN_DESCARTADO
        : ArticulosService.ASUNTO_EVALUACION_TURNITIN_CORRECCION;

      const comentarioBase = evaluacionDescarta
        ? `Evaluación de Turnitin: ${porcentaje}% de similitud. El artículo supera el umbral permitido y queda descartado.`
        : `Evaluación de Turnitin: ${porcentaje}% de similitud. El artículo puede continuar con una única corrección del autor.`;

      const observacionFinal = observacion?.trim()
        ? `${observacion.trim()}\n\n${comentarioBase}`
        : comentarioBase;

      const observacionTurnitin = queryRunner.manager.create(Observacion, {
        articuloId,
        usuarioId,
        etapaId: ArticulosService.ETAPA_TURNITIN,
        asunto: asuntoEvaluacion,
        comentarios: observacionFinal,
      });

      const observacionGuardada =
        await queryRunner.manager.save(observacionTurnitin);

      if (archivo) {
        const registroArchivo = queryRunner.manager.create(ObservacionArchivo, {
          observacionesId: observacionGuardada.id,
          archivoPath: archivo.path,
          archivoNombreOriginal: archivo.originalname,
        });

        await queryRunner.manager.save(registroArchivo);
      }

      articulo.comiteEditorialId = null;
      await queryRunner.manager.save(articulo);

      if (evaluacionDescarta) {
        const historialAbierto = await queryRunner.manager.findOne(
          ArticuloHistorialEtapa,
          {
            where: {
              articuloId,
              fechaFin: IsNull(),
            },
            order: { fechaInicio: 'DESC' },
          },
        );

        const ahora = new Date();

        if (historialAbierto) {
          historialAbierto.fechaFin = ahora;
          await queryRunner.manager.save(historialAbierto);
        }

        articulo.etapaActualId = ArticulosService.ETAPA_DESCARTADO;
        await queryRunner.manager.save(articulo);

        const historialDescartado = queryRunner.manager.create(
          ArticuloHistorialEtapa,
          {
            articuloId,
            etapaId: ArticulosService.ETAPA_DESCARTADO,
            usuarioId,
            fechaInicio: ahora,
          },
        );

        await queryRunner.manager.save(historialDescartado);
      }

      await queryRunner.commitTransaction();

      return {
        message: evaluacionDescarta
          ? 'Artículo descartado por resultado de Turnitin.'
          : 'Turnitin aprobado. Se notificó al autor para una única corrección.',
        evaluacion: {
          porcentaje,
          resultado: evaluacionDescarta ? 'descartado' : 'correccion-requerida',
          observacionId: observacionGuardada.id,
        },
        etapaActual: {
          id: evaluacionDescarta
            ? ArticulosService.ETAPA_DESCARTADO
            : ArticulosService.ETAPA_TURNITIN,
          nombre: evaluacionDescarta ? 'DESCARTADO' : 'TURNITIN',
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async evaluarArticuloComite(
    articuloId: number,
    usuarioComiteId: number,
    decision: 'aceptar' | 'rechazar',
    observacion?: string,
    archivo?: Express.Multer.File,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const articulo = await queryRunner.manager.findOne(Articulo, {
        where: { id: articuloId },
      });

      if (!articulo) {
        throw new NotFoundException('Artículo no encontrado');
      }

      this.ensureArticuloNoDescartado(articulo);

      if (
        articulo.comiteEditorialId &&
        articulo.comiteEditorialId !== usuarioComiteId
      ) {
        throw new ForbiddenException(
          'Este artículo está asignado a otro miembro del Comité Editorial.',
        );
      }

      if (!articulo.comiteEditorialId) {
        throw new BadRequestException(
          'Este artículo aún no tiene un miembro del Comité Editorial asignado.',
        );
      }

      if (articulo.etapaActualId !== ArticulosService.ETAPA_COMITE_EDITORIAL) {
        throw new BadRequestException(
          'El artículo no está en la etapa de Comité Editorial.',
        );
      }

      const observacionesComite = await queryRunner.manager.find(Observacion, {
        where: {
          articuloId,
          etapaId: ArticulosService.ETAPA_COMITE_EDITORIAL,
        },
        select: ['id', 'asunto'],
      });

      const evaluacionComiteExistente = observacionesComite.find((obs) => {
        const asuntoNormalizado = (obs.asunto ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        return (
          asuntoNormalizado.includes('evalu') &&
          asuntoNormalizado.includes('comite') &&
          (asuntoNormalizado.includes('acept') ||
            asuntoNormalizado.includes('rechaz'))
        );
      });

      if (evaluacionComiteExistente) {
        throw new BadRequestException(
          'Este artículo ya fue evaluado por el Comité Editorial y no puede evaluarse nuevamente.',
        );
      }

      const asuntoEvaluacion =
        decision === 'aceptar'
          ? ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO
          : ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO;

      const observacionEvaluacion = queryRunner.manager.create(Observacion, {
        articuloId,
        usuarioId: usuarioComiteId,
        etapaId: ArticulosService.ETAPA_COMITE_EDITORIAL,
        asunto: asuntoEvaluacion,
        comentarios:
          observacion?.trim() ||
          (decision === 'aceptar'
            ? 'El comité editorial aprueba el artículo. El equipo editorial continuará el flujo.'
            : 'El comité editorial rechaza el artículo. El equipo editorial revisará la decisión.'),
      });

      const observacionGuardada = await queryRunner.manager.save(
        observacionEvaluacion,
      );

      if (archivo) {
        const registroArchivo = queryRunner.manager.create(ObservacionArchivo, {
          observacionesId: observacionGuardada.id,
          archivoPath: archivo.path,
          archivoNombreOriginal: archivo.originalname,
        });

        await queryRunner.manager.save(registroArchivo);
      }

      await queryRunner.commitTransaction();

      return {
        message:
          decision === 'aceptar'
            ? 'Evaluación registrada. El equipo editorial puede avanzar el artículo manualmente.'
            : 'Evaluación registrada como rechazo. El equipo editorial debe definir el siguiente paso.',
        etapaActual: {
          id: articulo.etapaActualId,
          nombre: 'COMITÉ EDITORIAL',
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async asignarComiteEditorial(articuloId: number, comiteEditorialId: number) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: ['comiteEditorial'],
    });

    if (!articulo) {
      throw new NotFoundException('Artículo no encontrado');
    }

    this.ensureArticuloNoDescartado(articulo);

    if (articulo.etapaActualId !== ArticulosService.ETAPA_COMITE_EDITORIAL) {
      throw new BadRequestException(
        'Solo puedes asignar miembro del comité cuando el artículo está en etapa Comité Editorial.',
      );
    }

    const comiteMember = await this.userRepository.findOne({
      where: { id: comiteEditorialId },
      relations: ['roles'],
    });

    if (!comiteMember) {
      throw new NotFoundException('Miembro del comité no encontrado');
    }

    if (!comiteMember.estado_cuenta) {
      throw new BadRequestException(
        'No puedes asignar un miembro del Comité Editorial con cuenta inactiva.',
      );
    }

    const esComiteEditorial = comiteMember.roles?.some(
      (role) => role.rol === 'comite-editorial',
    );

    if (!esComiteEditorial) {
      throw new BadRequestException(
        'El usuario seleccionado no pertenece al Comité Editorial.',
      );
    }

    const articulosAsignados = await this.articuloRepository.count({
      where: {
        comiteEditorialId,
        etapaActualId: ArticulosService.ETAPA_COMITE_EDITORIAL,
      } as any,
    });

    const esMismoAsignado = articulo.comiteEditorialId === comiteEditorialId;

    if (
      !esMismoAsignado &&
      articulosAsignados >= ArticulosService.MAX_ARTICULOS_ASIGNADOS_COMITE
    ) {
      throw new BadRequestException(
        'Este miembro del Comité Editorial ya tiene el máximo de 4 artículos asignados.',
      );
    }

    articulo.comiteEditorialId = comiteEditorialId;
    articulo.comiteEditorial = comiteMember;

    // Registrar fechas de asignación y vencimiento (30 días)
    const ahora = new Date();
    articulo.fechaAsignacionComite = ahora;
    const fechaVencimiento = new Date(ahora);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    articulo.fechaVencimientoComite = fechaVencimiento;

    await this.articuloRepository.save(articulo);

    return {
      message: 'Artículo asignado al miembro del Comité Editorial.',
      comiteEditorial: {
        id: comiteMember.id,
        nombre: comiteMember.nombre,
        correo: comiteMember.correo,
      },
    };
  }

  async getArticulosAsignadosComite(usuarioId: number) {
    const articulos = await this.articuloRepository.find({
      relations: ['etapaActual', 'historialEtapas', 'observaciones'],
      order: { id: 'DESC' },
    });

    return articulos
      .map((articulo) => {
        const evaluacionesComite = (articulo.observaciones ?? [])
          .filter((obs) => obs.usuarioId === usuarioId)
          .filter((obs) =>
            [
              ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO,
              ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO,
            ].includes(obs.asunto),
          )
          .sort(
            (a, b) =>
              new Date(b.fechaSubida).getTime() -
              new Date(a.fechaSubida).getTime(),
          );

        const evaluacionReciente = evaluacionesComite[0];
        const pendiente =
          articulo.comiteEditorialId === usuarioId &&
          articulo.etapaActualId === ArticulosService.ETAPA_COMITE_EDITORIAL &&
          !evaluacionReciente;

        let estadoEvaluacion:
          | 'pendiente'
          | 'evaluado-aceptado'
          | 'evaluado-rechazado' = 'pendiente';

        if (
          evaluacionReciente?.asunto ===
          ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO
        ) {
          estadoEvaluacion = 'evaluado-aceptado';
        }

        if (
          evaluacionReciente?.asunto ===
          ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO
        ) {
          estadoEvaluacion = 'evaluado-rechazado';
        }

        if (!pendiente && !evaluacionReciente) {
          return null;
        }

        // Calcular fecha de asignacion y vencimiento (fallback para asignaciones historicas)
        const fechaAsignacionBase =
          articulo.fechaAsignacionComite ??
          articulo.historialEtapas
            ?.filter(
              (h) => h.etapaId === ArticulosService.ETAPA_COMITE_EDITORIAL,
            )
            ?.sort(
              (a, b) =>
                new Date(a.fechaInicio).getTime() -
                new Date(b.fechaInicio).getTime(),
            )?.[0]?.fechaInicio ??
          null;

        const fechaVencimientoBase =
          articulo.fechaVencimientoComite ??
          (fechaAsignacionBase
            ? new Date(
                new Date(fechaAsignacionBase).getTime() +
                  30 * 24 * 60 * 60 * 1000,
              )
            : null);

        // Calcular si está vencido y dias restantes
        const ahora = new Date();
        const fechaVencimientoDate = fechaVencimientoBase
          ? new Date(fechaVencimientoBase)
          : null;
        const estaVencido =
          !!fechaVencimientoDate &&
          fechaVencimientoDate.getTime() < ahora.getTime();
        const diasRestantes = fechaVencimientoDate
          ? Math.ceil(
              (fechaVencimientoDate.getTime() - ahora.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return {
          id: articulo.id,
          codigo: articulo.codigo,
          titulo: articulo.titulo,
          etapa_nombre: articulo.etapaActual?.nombre ?? 'Sin etapa',
          fecha_inicio:
            articulo.historialEtapas?.[0]?.fechaInicio?.toISOString() ?? null,
          estado_evaluacion: pendiente ? 'pendiente' : estadoEvaluacion,
          fecha_asignacion: fechaAsignacionBase
            ? new Date(fechaAsignacionBase).toISOString()
            : null,
          fecha_vencimiento: fechaVencimientoDate
            ? fechaVencimientoDate.toISOString()
            : null,
          esta_vencido: estaVencido ?? false,
          dias_restantes: diasRestantes ?? null,
        };
      })
      .filter((item) => item !== null);
  }

  async getHistorialEvaluacionesComite(usuarioId: number) {
    const articulos = await this.articuloRepository.find({
      relations: ['etapaActual', 'observaciones', 'historialEtapas'],
      order: { id: 'DESC' },
    });

    const evaluaciones = articulos
      .flatMap((articulo) => {
        const evaluacionesComite = (articulo.observaciones ?? [])
          .filter((obs) => obs.usuarioId === usuarioId)
          .filter((obs) =>
            [
              ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO,
              ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO,
            ].includes(obs.asunto),
          );

        return evaluacionesComite.map((obs) => {
          const fechaAsignacionBase =
            articulo.fechaAsignacionComite ??
            articulo.historialEtapas
              ?.filter(
                (h) => h.etapaId === ArticulosService.ETAPA_COMITE_EDITORIAL,
              )
              ?.sort(
                (a, b) =>
                  new Date(a.fechaInicio).getTime() -
                  new Date(b.fechaInicio).getTime(),
              )?.[0]?.fechaInicio ??
            null;

          const diasEvaluacion = fechaAsignacionBase
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(obs.fechaSubida).getTime() -
                    new Date(fechaAsignacionBase).getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
              )
            : null;

          return {
            articuloId: articulo.id,
            codigo: articulo.codigo,
            titulo: articulo.titulo,
            decision:
              obs.asunto === ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO
                ? 'aceptado'
                : 'rechazado',
            fechaEvaluacion: obs.fechaSubida,
            diasEvaluacion,
            etapaActual: articulo.etapaActual?.nombre ?? 'Sin etapa',
          };
        });
      })
      .sort(
        (a, b) =>
          new Date(b.fechaEvaluacion).getTime() -
          new Date(a.fechaEvaluacion).getTime(),
      );

    return evaluaciones;
  }

  async getEstadisticasComite(usuarioId: number) {
    const historial = await this.getHistorialEvaluacionesComite(usuarioId);
    const asignados = await this.getArticulosAsignadosComite(usuarioId);

    const totalEvaluadas = historial.length;
    const totalAceptadas = historial.filter(
      (h) => h.decision === 'aceptado',
    ).length;
    const totalRechazadas = historial.filter(
      (h) => h.decision === 'rechazado',
    ).length;
    const totalPendientes = asignados.filter(
      (a) => a.estado_evaluacion === 'pendiente',
    ).length;

    const tiempos = historial
      .map((h) => h.diasEvaluacion)
      .filter((d) => d !== null);
    const promedioDiasEvaluacion =
      tiempos.length > 0
        ? Number(
            (tiempos.reduce((acc, v) => acc + v, 0) / tiempos.length).toFixed(
              2,
            ),
          )
        : 0;

    const tasaAprobacion =
      totalEvaluadas > 0
        ? Number(((totalAceptadas / totalEvaluadas) * 100).toFixed(2))
        : 0;

    const tasaCumplimiento30Dias =
      totalEvaluadas > 0
        ? Number(
            (
              (historial.filter((h) => (h.diasEvaluacion ?? 9999) <= 30)
                .length /
                totalEvaluadas) *
              100
            ).toFixed(2),
          )
        : 0;

    return {
      totalAsignadas: asignados.length,
      totalPendientes,
      totalEvaluadas,
      totalAceptadas,
      totalRechazadas,
      tasaAprobacion,
      promedioDiasEvaluacion,
      tasaCumplimiento30Dias,
    };
  }

  async getNotificacionesVencimientoComite(usuarioId: number) {
    const asignados = await this.getArticulosAsignadosComite(usuarioId);

    return asignados
      .filter((articulo) => articulo.estado_evaluacion === 'pendiente')
      .filter(
        (articulo) =>
          articulo.esta_vencido ||
          (articulo.dias_restantes !== null && articulo.dias_restantes <= 5),
      )
      .map((articulo) => ({
        articuloId: articulo.id,
        codigo: articulo.codigo,
        titulo: articulo.titulo,
        tipo: articulo.esta_vencido ? 'vencido' : 'proximo-vencer',
        diasRestantes: articulo.dias_restantes,
        mensaje: articulo.esta_vencido
          ? `El articulo ${articulo.codigo} vencio su plazo de 30 dias para evaluacion.`
          : `El articulo ${articulo.codigo} vence en ${articulo.dias_restantes} dia(s).`,
      }));
  }

  async generarReporteComiteExcel(usuarioId: number): Promise<Buffer> {
    const asignados = await this.getArticulosAsignadosComite(usuarioId);
    const historial = await this.getHistorialEvaluacionesComite(usuarioId);
    const estadisticas = await this.getEstadisticasComite(usuarioId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Revista Huellas';
    workbook.lastModifiedBy = 'Sistema Editorial Huellas';
    workbook.created = new Date();

    const resumenSheet = workbook.addWorksheet('Resumen');
    resumenSheet.columns = [
      { header: 'Indicador', key: 'indicador', width: 34 },
      { header: 'Valor', key: 'valor', width: 20 },
    ];

    resumenSheet.mergeCells('A1:B1');
    resumenSheet.getCell('A1').value =
      'REVISTA HUELLAS - REPORTE COMITÉ EDITORIAL';
    resumenSheet.getCell('A1').font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 13,
    };
    resumenSheet.getCell('A1').alignment = { horizontal: 'center' };
    resumenSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };

    const resumenRows = [
      {
        indicador: 'Fecha de generación',
        valor: new Date().toLocaleString('es-CO'),
      },
      { indicador: 'Total asignadas', valor: estadisticas.totalAsignadas },
      { indicador: 'Total pendientes', valor: estadisticas.totalPendientes },
      { indicador: 'Total evaluadas', valor: estadisticas.totalEvaluadas },
      {
        indicador: 'Tasa de aprobación (%)',
        valor: estadisticas.tasaAprobacion,
      },
      {
        indicador: 'Promedio días de evaluación',
        valor: estadisticas.promedioDiasEvaluacion,
      },
      {
        indicador: 'Cumplimiento dentro de 30 días (%)',
        valor: estadisticas.tasaCumplimiento30Dias,
      },
    ];

    resumenRows.forEach((row) => resumenSheet.addRow(row));

    const asignadosSheet = workbook.addWorksheet('Asignados');
    asignadosSheet.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Título', key: 'titulo', width: 42 },
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Fecha asignación', key: 'fechaAsignacion', width: 22 },
      { header: 'Fecha vencimiento', key: 'fechaVencimiento', width: 22 },
      { header: 'Días restantes', key: 'diasRestantes', width: 16 },
    ];

    asignadosSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    asignadosSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF155E75' },
    };

    asignados.forEach((item) => {
      asignadosSheet.addRow({
        codigo: item.codigo,
        titulo: item.titulo,
        estado: item.estado_evaluacion,
        fechaAsignacion: item.fecha_asignacion ?? '-',
        fechaVencimiento: item.fecha_vencimiento ?? '-',
        diasRestantes: item.dias_restantes ?? '-',
      });
    });

    const historialSheet = workbook.addWorksheet('Historial');
    historialSheet.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Título', key: 'titulo', width: 42 },
      { header: 'Decisión', key: 'decision', width: 18 },
      { header: 'Fecha evaluación', key: 'fecha', width: 22 },
      { header: 'Días para evaluar', key: 'dias', width: 18 },
    ];

    historialSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    historialSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };

    historial.forEach((item) => {
      historialSheet.addRow({
        codigo: item.codigo,
        titulo: item.titulo,
        decision: item.decision,
        fecha: new Date(item.fechaEvaluacion).toLocaleString('es-CO'),
        dias: item.diasEvaluacion ?? '-',
      });
    });

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }

  async generarReporteComitePdf(usuarioId: number): Promise<Buffer> {
    const historial = await this.getHistorialEvaluacionesComite(usuarioId);
    const estadisticas = await this.getEstadisticasComite(usuarioId);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colorBrand = rgb(0.06, 0.46, 0.43);
    const colorDark = rgb(0.11, 0.16, 0.23);
    const colorMuted = rgb(0.36, 0.43, 0.5);

    page.drawRectangle({
      x: 0,
      y: height - 78,
      width,
      height: 78,
      color: colorBrand,
    });

    page.drawText('REVISTA HUELLAS', {
      x: 36,
      y: height - 42,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('Reporte Corporativo de Evaluaciones - Comité Editorial', {
      x: 36,
      y: height - 60,
      size: 11,
      font: fontRegular,
      color: rgb(0.91, 0.98, 0.97),
    });

    page.drawText(`Generado: ${new Date().toLocaleString('es-CO')}`, {
      x: 36,
      y: height - 96,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });

    const stats = [
      `Total evaluadas: ${estadisticas.totalEvaluadas}`,
      `Total pendientes: ${estadisticas.totalPendientes}`,
      `Tasa aprobación: ${estadisticas.tasaAprobacion}%`,
      `Promedio días evaluación: ${estadisticas.promedioDiasEvaluacion}`,
      `Cumplimiento <= 30 días: ${estadisticas.tasaCumplimiento30Dias}%`,
    ];

    let cursorY = height - 130;
    page.drawText('Indicadores del evaluador', {
      x: 36,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: colorDark,
    });

    cursorY -= 22;
    stats.forEach((line) => {
      page.drawText(`• ${line}`, {
        x: 42,
        y: cursorY,
        size: 10,
        font: fontRegular,
        color: colorDark,
      });
      cursorY -= 15;
    });

    cursorY -= 10;
    page.drawText('Historial de evaluaciones', {
      x: 36,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: colorDark,
    });

    cursorY -= 18;
    const maxRows = 16;
    historial.slice(0, maxRows).forEach((item, index) => {
      const line = `${index + 1}. ${item.codigo} | ${item.decision.toUpperCase()} | ${new Date(item.fechaEvaluacion).toLocaleDateString('es-CO')} | ${item.diasEvaluacion ?? '-'} día(s)`;
      page.drawText(line, {
        x: 42,
        y: cursorY,
        size: 9,
        font: fontRegular,
        color: colorDark,
      });
      cursorY -= 13;
    });

    page.drawText(
      'Documento generado automaticamente por el sistema editorial Huellas.',
      {
        x: 36,
        y: 22,
        size: 8,
        font: fontRegular,
        color: colorMuted,
      },
    );

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  async getResumenArticulos() {
    const articulos = await this.articuloRepository
      .createQueryBuilder('articulo')
      .select(['articulo.id', 'articulo.codigo', 'articulo.titulo'])
      .innerJoin('articulo.etapaActual', 'etapa')
      .addSelect(['etapa.nombre'])

      .innerJoin(
        'articulo.historialEtapas',
        'historial',
        'historial.etapaId = :etapaBuscada',
        { etapaBuscada: 1 },
      )
      .addSelect(['historial.fechaInicio'])
      .orderBy('historial.fechaInicio', 'DESC')
      .getMany();

    return articulos.map((articulo) => ({
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapa_nombre: articulo.etapaActual?.nombre || 'Desconocida',
      fecha_inicio: articulo.historialEtapas[0]?.fechaInicio || null,
    }));
  }

  async getEstadisticasGenerales() {
    const articulos = await this.articuloRepository.find({
      relations: [
        'etapaActual',
        'temas',
        'autores',
        'historialEtapas',
        'observaciones',
      ],
    });

    const porEtapa = new Map<string, number>();
    const porTema = new Map<string, number>();
    const porMes = new Map<string, number>();

    let totalAutores = 0;
    let totalTemas = 0;
    let totalDiasDesdeEnvio = 0;
    let articulosConFecha = 0;

    const articulosRecientes = [...articulos]
      .map((articulo) => ({
        articulo,
        fechaEnvio: this.obtenerFechaEnvioArticulo(articulo),
      }))
      .sort((a, b) => {
        const fechaA = a.fechaEnvio?.getTime() ?? 0;
        const fechaB = b.fechaEnvio?.getTime() ?? 0;
        return fechaB - fechaA;
      })
      .slice(0, 8)
      .map(({ articulo, fechaEnvio }) => ({
        codigo: articulo.codigo,
        titulo: articulo.titulo,
        etapa: articulo.etapaActual?.nombre ?? 'Desconocida',
        fechaEnvio: fechaEnvio ? fechaEnvio.toISOString() : null,
        autores: articulo.autores?.length ?? 0,
        observaciones: articulo.observaciones?.length ?? 0,
      }));

    for (const articulo of articulos) {
      const etapa = articulo.etapaActual?.nombre?.trim() || 'Desconocida';
      porEtapa.set(etapa, (porEtapa.get(etapa) ?? 0) + 1);

      totalAutores += articulo.autores?.length ?? 0;
      totalTemas += articulo.temas?.length ?? 0;

      for (const tema of articulo.temas ?? []) {
        const nombreTema = tema.nombre?.trim() || 'Sin tema';
        porTema.set(nombreTema, (porTema.get(nombreTema) ?? 0) + 1);
      }

      const fechaEnvio = this.obtenerFechaEnvioArticulo(articulo);
      if (fechaEnvio) {
        articulosConFecha += 1;
        totalDiasDesdeEnvio += Math.max(
          0,
          Math.floor(
            (Date.now() - fechaEnvio.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        const mes = new Intl.DateTimeFormat('es-CO', {
          month: 'short',
          year: 'numeric',
        }).format(fechaEnvio);
        porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
      }
    }

    const etapaDistribucion = [...porEtapa.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([etapa, cantidad]) => ({ etapa, cantidad }));

    const temaDistribucion = [...porTema.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tema, cantidad]) => ({ tema, cantidad }));

    const mensualDistribucion = [...porMes.entries()].map(
      ([mes, cantidad]) => ({ mes, cantidad }),
    );

    return {
      totalArticulos: articulos.length,
      promedioAutores: articulos.length
        ? Number((totalAutores / articulos.length).toFixed(1))
        : 0,
      promedioTemas: articulos.length
        ? Number((totalTemas / articulos.length).toFixed(1))
        : 0,
      promedioDiasDesdeEnvio: articulosConFecha
        ? Number((totalDiasDesdeEnvio / articulosConFecha).toFixed(1))
        : 0,
      articulosEnPublicacion: articulos.filter((articulo) =>
        this.normalizarTexto(articulo.etapaActual?.nombre ?? '').includes(
          'publicacion',
        ),
      ).length,
      articulosEnProceso: articulos.filter((articulo) => {
        return !this.normalizarTexto(
          articulo.etapaActual?.nombre ?? '',
        ).includes('publicacion');
      }).length,
      etapaDistribucion,
      temaDistribucion,
      mensualDistribucion,
      articulosRecientes,
    };
  }

  async getArticulosPorAutor(userId: number) {
    const articulos = await this.articuloRepository
      .createQueryBuilder('articulo')
      .innerJoin('articulo.autores', 'autor', 'autor.id = :userId', { userId })
      .leftJoinAndSelect('articulo.etapaActual', 'etapa')
      .leftJoinAndSelect('articulo.historialEtapas', 'historial')
      .leftJoinAndSelect('articulo.observaciones', 'observacion')
      .leftJoinAndSelect('observacion.usuario', 'usuarioObservacion')
      .leftJoinAndSelect('articulo.autores', 'autoresArticulo')
      .orderBy('historial.fechaInicio', 'DESC')
      .getMany();

    return articulos.map((articulo) => ({
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapa_nombre: articulo.etapaActual?.nombre || 'Desconocida',
      fecha_inicio: articulo.historialEtapas[0]?.fechaInicio || null,
      correccion_pendiente: this.tieneCorreccionPendiente(articulo, userId),
    }));
  }

  private obtenerFechaEnvioArticulo(articulo: Articulo): Date | null {
    const historialOrdenado = [...(articulo.historialEtapas ?? [])].sort(
      (a, b) =>
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
    );

    const primeraEtapa = historialOrdenado[0];
    if (!primeraEtapa?.fechaInicio) {
      return null;
    }

    const fecha = new Date(primeraEtapa.fechaInicio);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private normalizarTexto(texto: string): string {
    return (texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  async subirCorreccionAutor(
    articuloId: number,
    userId: number,
    archivo: Express.Multer.File,
    comentarios?: string,
  ) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: [
        'autores',
        'observaciones',
        'observaciones.usuario',
        'observaciones.archivos',
      ],
    });

    if (!articulo) {
      throw new NotFoundException('Artículo no encontrado');
    }

    this.ensureArticuloNoDescartado(articulo);

    const esAutorDelArticulo =
      articulo.autores?.some((autor) => autor.id === userId) ?? false;

    if (!esAutorDelArticulo) {
      throw new ForbiddenException(
        'No tienes permiso para cargar correcciones de este artículo',
      );
    }

    if (!this.tieneCorreccionPendiente(articulo, userId)) {
      throw new BadRequestException(
        'Este artículo no tiene correcciones pendientes',
      );
    }

    const observacion = this.dataSource.getRepository(Observacion).create({
      articuloId,
      usuarioId: userId,
      etapaId: articulo.etapaActualId,
      asunto: ArticulosService.ASUNTO_CORRECCION_AUTOR,
      comentarios:
        comentarios?.trim() ||
        'Se carga una nueva versión con las correcciones solicitadas.',
    });

    const observacionGuardada = await this.dataSource
      .getRepository(Observacion)
      .save(observacion);

    const observacionArchivo = this.dataSource
      .getRepository(ObservacionArchivo)
      .create({
        observacionesId: observacionGuardada.id,
        archivoPath: archivo.path,
        archivoNombreOriginal: archivo.originalname,
      });

    await this.dataSource
      .getRepository(ObservacionArchivo)
      .save(observacionArchivo);

    return {
      message: 'Corrección cargada correctamente',
      observacionId: observacionGuardada.id,
    };
  }

  async aceptarCorreccionAutor(
    articuloId: number,
    observacionId: number,
    usuarioAdminId: number,
    comentarios?: string,
  ) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: ['autores', 'observaciones', 'observaciones.usuario'],
    });

    if (!articulo) {
      throw new NotFoundException('Artículo no encontrado');
    }

    this.ensureArticuloNoDescartado(articulo);

    const observacionCorreccion = (articulo.observaciones ?? []).find(
      (obs) => obs.id === observacionId,
    );

    if (!observacionCorreccion) {
      throw new NotFoundException('La corrección seleccionada no existe');
    }

    const autoresIds = new Set(
      (articulo.autores ?? []).map((autor) => autor.id),
    );
    const usuarioObservacionId =
      observacionCorreccion.usuarioId ?? observacionCorreccion.usuario?.id;

    if (
      typeof usuarioObservacionId !== 'number' ||
      !autoresIds.has(usuarioObservacionId)
    ) {
      throw new BadRequestException(
        'La observación indicada no corresponde a una corrección de autor',
      );
    }

    const textoCorreccionAutor =
      `${observacionCorreccion.asunto ?? ''} ${observacionCorreccion.comentarios ?? ''}`.toLowerCase();

    if (
      !/correccion enviada por autor|corrección enviada por autor/.test(
        textoCorreccionAutor,
      )
    ) {
      throw new BadRequestException(
        'La observación indicada no corresponde a una corrección de autor',
      );
    }

    const fechaCorreccionAutor = new Date(observacionCorreccion.fechaSubida);

    const yaAceptada = (articulo.observaciones ?? []).some((obs) => {
      if (obs.id === observacionCorreccion.id) {
        return false;
      }

      const fechaObs = new Date(obs.fechaSubida);
      if (isNaN(fechaObs.getTime()) || isNaN(fechaCorreccionAutor.getTime())) {
        return false;
      }

      if (fechaObs < fechaCorreccionAutor) {
        return false;
      }

      const usuarioIdObs = obs.usuarioId ?? obs.usuario?.id;
      const esDeAutor =
        typeof usuarioIdObs === 'number' && autoresIds.has(usuarioIdObs);

      if (esDeAutor) {
        return false;
      }

      const texto =
        `${obs.asunto ?? ''} ${obs.comentarios ?? ''}`.toLowerCase();
      return /correccion aceptada|corrección aceptada|correccion aprobada|corrección aprobada/.test(
        texto,
      );
    });

    if (yaAceptada) {
      return {
        message: 'Esta corrección ya había sido aceptada previamente',
      };
    }

    const observacionAceptacion = this.dataSource
      .getRepository(Observacion)
      .create({
        articuloId,
        usuarioId: usuarioAdminId,
        etapaId: articulo.etapaActualId,
        asunto: ArticulosService.ASUNTO_CORRECCION_ACEPTADA,
        comentarios:
          comentarios?.trim() ||
          'Se confirma que la corrección del autor fue revisada y aceptada.',
      });

    const registro = await this.dataSource
      .getRepository(Observacion)
      .save(observacionAceptacion);

    return {
      message: 'Corrección del autor aceptada correctamente',
      observacionId: registro.id,
    };
  }

  private tieneCorreccionPendiente(
    articulo: Articulo,
    userId: number,
  ): boolean {
    const autoresIds = new Set(
      (articulo.autores ?? []).map((autor) => autor.id),
    );
    const observaciones = articulo.observaciones ?? [];

    let ultimaSolicitudCorreccion: Date | null = null;
    let ultimaRespuestaAutor: Date | null = null;
    let ultimaAceptacionCorreccion: Date | null = null;

    for (const observacion of observaciones) {
      const fecha = new Date(observacion.fechaSubida);
      if (isNaN(fecha.getTime())) {
        continue;
      }

      const usuarioObservacionId =
        observacion.usuarioId ?? observacion.usuario?.id;
      const esAutor =
        (typeof usuarioObservacionId === 'number' &&
          autoresIds.has(usuarioObservacionId)) ||
        false;

      const texto =
        `${observacion.asunto ?? ''} ${observacion.comentarios ?? ''}`.toLowerCase();

      const esAceptacionCorreccion =
        !esAutor &&
        /(correccion aceptada|corrección aceptada|correccion aprobada|corrección aprobada)/.test(
          texto,
        );

      if (esAceptacionCorreccion) {
        if (!ultimaAceptacionCorreccion || fecha > ultimaAceptacionCorreccion) {
          ultimaAceptacionCorreccion = fecha;
        }
        continue;
      }

      const esSolicitudCorreccion =
        !esAutor &&
        /(correccion|corrección|ajuste|subsan|pendiente)/.test(texto);

      if (esSolicitudCorreccion) {
        if (!ultimaSolicitudCorreccion || fecha > ultimaSolicitudCorreccion) {
          ultimaSolicitudCorreccion = fecha;
        }
        continue;
      }

      const esRespuestaAutorCorreccion =
        usuarioObservacionId === userId &&
        (observacion.asunto ?? '').trim() ===
          ArticulosService.ASUNTO_CORRECCION_AUTOR;

      if (esRespuestaAutorCorreccion) {
        if (!ultimaRespuestaAutor || fecha > ultimaRespuestaAutor) {
          ultimaRespuestaAutor = fecha;
        }
      }
    }

    if (!ultimaSolicitudCorreccion) {
      return false;
    }

    if (
      ultimaAceptacionCorreccion &&
      ultimaAceptacionCorreccion >= ultimaSolicitudCorreccion &&
      (!ultimaRespuestaAutor ||
        ultimaAceptacionCorreccion >= ultimaRespuestaAutor)
    ) {
      return false;
    }

    if (!ultimaRespuestaAutor) {
      return true;
    }

    return ultimaSolicitudCorreccion > ultimaRespuestaAutor;
  }

  async getNotificacionesAutor(userId: number) {
    const articulos = await this.articuloRepository.find({
      relations: [
        'autores',
        'etapaActual',
        'historialEtapas',
        'historialEtapas.etapa',
        'observaciones',
        'observaciones.etapa',
        'observaciones.usuario',
      ],
    });

    const articulosDelAutor = articulos.filter((articulo) =>
      articulo.autores?.some((autor) => autor.id === userId),
    );

    const notificaciones: Array<{
      id: string;
      articuloId: number;
      codigoArticulo: string;
      tituloArticulo: string;
      titulo: string;
      detalle: string;
      tipo: 'accion' | 'informacion' | 'exito';
      fecha: Date;
      origen: 'etapa' | 'observacion';
    }> = [];

    for (const articulo of articulosDelAutor) {
      const historial = [...(articulo.historialEtapas ?? [])].sort(
        (a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime(),
      );

      for (const eventoEtapa of historial) {
        const nombreEtapa = eventoEtapa.etapa?.nombre ?? 'Etapa editorial';
        const tipo = nombreEtapa.includes('PUBLICACIÓN')
          ? 'exito'
          : 'informacion';

        notificaciones.push({
          id: `etapa-${articulo.id}-${eventoEtapa.id}`,
          articuloId: articulo.id,
          codigoArticulo: articulo.codigo,
          tituloArticulo: articulo.titulo,
          titulo: `Cambio de estado: ${nombreEtapa}`,
          detalle: `Tu artículo ${articulo.codigo} fue movido a ${nombreEtapa.toLowerCase()}.`,
          tipo,
          fecha: eventoEtapa.fechaInicio,
          origen: 'etapa',
        });
      }

      for (const obs of articulo.observaciones ?? []) {
        // Evita notificar al autor por observaciones creadas por si mismo.
        if (obs.usuarioId && obs.usuarioId === userId) {
          continue;
        }

        const texto =
          `${obs.asunto ?? ''} ${obs.comentarios ?? ''}`.toLowerCase();
        const tipo = /(correccion|corrección|ajuste|subsan|pendiente)/.test(
          texto,
        )
          ? 'accion'
          : 'informacion';

        notificaciones.push({
          id: `obs-${articulo.id}-${obs.id}`,
          articuloId: articulo.id,
          codigoArticulo: articulo.codigo,
          tituloArticulo: articulo.titulo,
          titulo: obs.asunto?.trim() || 'Nueva observación editorial',
          detalle:
            obs.comentarios?.trim() ||
            `Se registró una observación sobre tu artículo ${articulo.codigo}.`,
          tipo,
          fecha: obs.fechaSubida,
          origen: 'observacion',
        });
      }
    }

    return notificaciones
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .map((item) => ({
        ...item,
        fecha: item.fecha.toISOString(),
      }));
  }

  async getArticuloFileStream(
    filename: string,
    userId: number,
    userRoles: string[],
  ): Promise<NodeJS.ReadableStream> {
    const archivo = await this.dataSource
      .getRepository(ObservacionArchivo)
      .createQueryBuilder('oa')
      .innerJoinAndSelect('oa.observacion', 'obs')
      .innerJoinAndSelect('obs.articulo', 'articulo')
      .leftJoinAndSelect('articulo.autores', 'autor')
      .where('oa.archivoPath LIKE :suffix', { suffix: `%${filename}` })
      .getOne();

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const articulo = archivo.observacion?.articulo;
    if (!articulo) {
      throw new NotFoundException('Artículo asociado no encontrado');
    }

    const esAdmin = userRoles.includes('admin');
    const esDirector = userRoles.includes('director');
    const esMonitor = userRoles.includes('monitor');
    const esComiteEditorial = userRoles.includes('comite-editorial');
    const esAutor =
      articulo.autores?.some((autor) => autor.id === userId) ?? false;

    if (
      !esAdmin &&
      !esAutor &&
      !esDirector &&
      !esMonitor &&
      !esComiteEditorial
    ) {
      throw new ForbiddenException(
        'No tienes permiso para descargar este archivo',
      );
    }

    const filePath = archivo.archivoPath;
    if (!existsSync(filePath)) {
      throw new NotFoundException('El archivo no existe en el servidor');
    }

    return createReadStream(filePath);
  }

  async eliminarArticulo(articuloId: number) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: [
        'temas',
        'autores',
        'observaciones',
        'observaciones.archivos',
      ],
    });

    if (!articulo) {
      throw new NotFoundException(
        `El artículo con ID ${articuloId} no existe.`,
      );
    }

    const observacionesIds: number[] = [];
    const archivosFisicos: string[] = [];

    articulo.observaciones.forEach((obs) => {
      observacionesIds.push(obs.id);
      obs.archivos.forEach((archivo) => {
        if (archivo.archivoPath) archivosFisicos.push(archivo.archivoPath);
      });
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      if (observacionesIds.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ObservacionArchivo)
          .where('observacionesId IN (:...ids)', { ids: observacionesIds })
          .execute();
      }

      await queryRunner.manager.delete(Observacion, {
        articuloId: articulo.id,
      });

      await queryRunner.manager.delete(ArticuloHistorialEtapa, {
        articuloId: articulo.id,
      });

      if (articulo.temas && articulo.temas.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Articulo, 'temas')
          .of(articulo.id)
          .remove(articulo.temas.map((tema) => tema.id));
      }

      if (articulo.autores && articulo.autores.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Articulo, 'autores')
          .of(articulo.id)
          .remove(articulo.autores.map((autor) => autor.id));
      }

      await queryRunner.manager.delete(Articulo, { id: articulo.id });

      await queryRunner.commitTransaction();

      for (const path of archivosFisicos) {
        try {
          await fs.unlink(path);
        } catch (unlinkError) {
          console.warn(
            `Aviso: No se encontró el archivo físico para borrar: ${path}`,
          );
        }
      }

      return {
        message: 'Artículo y todas sus dependencias eliminadas correctamente',
        id_eliminado: articuloId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Error crítico al eliminar el artículo.',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
