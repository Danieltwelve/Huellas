/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { DataSource, IsNull, Repository } from 'typeorm';
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

@Injectable()
export class ArticulosService {
  private static readonly ETAPA_REVISION_PRELIMINAR = 1;
  private static readonly ETAPA_TURNITING = 3;
  private static readonly ETAPA_COMITE_EDITORIAL = 6;
  private static readonly ETAPA_DESCARTADO = 7;
  private static readonly MAX_ARTICULOS_ASIGNADOS_COMITE = 4;
  private static readonly ASUNTO_CORRECCION_AUTOR =
    'Correccion enviada por autor';
  private static readonly ASUNTO_CORRECCION_ACEPTADA =
    'Correccion aceptada por equipo editorial';
  private static readonly ASUNTO_EVALUACION_TURNITING_CORRECCION =
    'Evaluacion de Turniting: REQUIERE CORRECCION';
  private static readonly ASUNTO_EVALUACION_TURNITING_DESCARTADO =
    'Evaluacion de Turniting: DESCARTADO';
  private static readonly ASUNTO_EVALUACION_COMITE_APROBADO =
    'Evaluacion de comite editorial: ACEPTADO';
  private static readonly ASUNTO_EVALUACION_COMITE_RECHAZADO =
    'Evaluacion de comite editorial: RECHAZADO';

  constructor(
    private dataSource: DataSource,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FerchContador)
    private readonly ferchContadorRepository: Repository<FerchContador>,
  ) {}

  private ensureArticuloNoDescartado(articulo: Articulo): void {
    if (articulo.etapaActualId === ArticulosService.ETAPA_DESCARTADO) {
      throw new BadRequestException(
        'Este artículo fue descartado y no puede continuar en el proceso editorial.',
      );
    }
  }

  async crearEnvioArticulo(
    dto: CreateArticuloCompletoDto,
    archivoPath: string,
    archivoNombreOriginal: string,
    usuarioEmisorId: number,
  ) {
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
        etapaActualId: ArticulosService.ETAPA_COMITE_EDITORIAL,
        edicionId: edicionActiva.id,
      });
      const articuloGuardado = await queryRunner.manager.save(nuevoArticulo);

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
          fechaFin: ahora,
          usuarioId: usuarioEmisorId,
        },
      );
      await queryRunner.manager.save(historialEtapaRevision);

      const historialEtapaComite = queryRunner.manager.create(
        ArticuloHistorialEtapa,
        {
          articuloId: articuloGuardado.id,
          etapaId: ArticulosService.ETAPA_COMITE_EDITORIAL,
          fechaInicio: ahora,
          usuarioId: usuarioEmisorId,
        },
      );
      await queryRunner.manager.save(historialEtapaComite);

      // FINALIZACIÓN: Confirmar transacción
      await queryRunner.commitTransaction();

      return {
        message: 'Artículo enviado y registrado correctamente',
        articuloId: articuloGuardado.id,
      };
    } catch (error) {
      // ROLLBACK: Revertir todo si hay error
      await queryRunner.rollbackTransaction();

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
        'Error crítico al registrar el envío. Transacción revertida.',
        error instanceof Error ? error.message : 'Error desconocido',
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

    const fechaEnvioInicial = articulo.historialEtapas
      ?.filter((historial) => historial.etapaId === 1)
      .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())[0]
      ?.fechaInicio;

    return {
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
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

    const etapaExiste = await this.dataSource.getRepository(EtapaArticulo).findOne({
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

      await this.dataSource.getRepository(ObservacionArchivo).save(registroArchivo);
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
        throw new BadRequestException('El artículo ya se encuentra en esta etapa');
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

      const nuevoHistorial = queryRunner.manager.create(ArticuloHistorialEtapa, {
        articuloId,
        etapaId: nuevaEtapaId,
        usuarioId,
        fechaInicio: ahora,
      });

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

  async evaluarArticuloTurniting(
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

      if (articulo.etapaActualId !== ArticulosService.ETAPA_TURNITING) {
        throw new BadRequestException(
          'El artículo no está en la etapa de Turniting.',
        );
      }

      const evaluacionDescarta = porcentaje >= 65;
      const asuntoEvaluacion = evaluacionDescarta
        ? ArticulosService.ASUNTO_EVALUACION_TURNITING_DESCARTADO
        : ArticulosService.ASUNTO_EVALUACION_TURNITING_CORRECCION;

      const comentarioBase = evaluacionDescarta
        ? `Evaluación de Turniting: ${porcentaje}% de similitud. El artículo supera el umbral permitido y queda descartado.`
        : `Evaluación de Turniting: ${porcentaje}% de similitud. El artículo puede continuar con una única corrección del autor.`;

      const observacionTurniting = queryRunner.manager.create(Observacion, {
        articuloId,
        usuarioId,
        etapaId: ArticulosService.ETAPA_TURNITING,
        asunto: asuntoEvaluacion,
        comentarios: observacion?.trim() || comentarioBase,
      });

      const observacionGuardada = await queryRunner.manager.save(
        observacionTurniting,
      );

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
          ? 'Artículo descartado por resultado de Turniting.'
          : 'Turniting aprobado. Se notificó al autor para una única corrección.',
        evaluacion: {
          porcentaje,
          resultado: evaluacionDescarta ? 'descartado' : 'correccion-requerida',
          observacionId: observacionGuardada.id,
        },
        etapaActual: {
          id: evaluacionDescarta
            ? ArticulosService.ETAPA_DESCARTADO
            : ArticulosService.ETAPA_TURNITING,
          nombre: evaluacionDescarta ? 'DESCARTADO' : 'TURNITING',
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

      if (articulo.comiteEditorialId && articulo.comiteEditorialId !== usuarioComiteId) {
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

      const etapaDestinoId =
        decision === 'aceptar'
          ? ArticulosService.ETAPA_TURNITING
          : ArticulosService.ETAPA_DESCARTADO;

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
            ? 'El comité editorial aprueba el artículo para continuar el flujo.'
            : 'El comité editorial rechaza el artículo y lo retorna al equipo editorial.'),
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

      articulo.etapaActualId = etapaDestinoId;
      articulo.comiteEditorialId = null;
      await queryRunner.manager.save(articulo);

      const nuevoHistorial = queryRunner.manager.create(ArticuloHistorialEtapa, {
        articuloId,
        etapaId: etapaDestinoId,
        usuarioId: usuarioComiteId,
        fechaInicio: ahora,
      });

      await queryRunner.manager.save(nuevoHistorial);
      await queryRunner.commitTransaction();

      return {
        message:
          decision === 'aceptar'
            ? 'Artículo evaluado y enviado a la siguiente fase editorial.'
            : 'Artículo rechazado y descartado del proceso editorial.',
        etapaActual: {
          id: etapaDestinoId,
          nombre:
            etapaDestinoId === ArticulosService.ETAPA_TURNITING
              ? 'TURNITING'
              : 'DESCARTADO',
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
          articulo.etapaActualId === ArticulosService.ETAPA_COMITE_EDITORIAL;

        let estadoEvaluacion: 'pendiente' | 'evaluado-aceptado' | 'evaluado-rechazado' =
          'pendiente';

        if (evaluacionReciente?.asunto === ArticulosService.ASUNTO_EVALUACION_COMITE_APROBADO) {
          estadoEvaluacion = 'evaluado-aceptado';
        }

        if (evaluacionReciente?.asunto === ArticulosService.ASUNTO_EVALUACION_COMITE_RECHAZADO) {
          estadoEvaluacion = 'evaluado-rechazado';
        }

        if (!pendiente && !evaluacionReciente) {
          return null;
        }

        return {
          id: articulo.id,
          codigo: articulo.codigo,
          titulo: articulo.titulo,
          etapa_nombre: articulo.etapaActual?.nombre ?? 'Sin etapa',
          fecha_inicio:
            articulo.historialEtapas?.[0]?.fechaInicio?.toISOString() ?? null,
          estado_evaluacion: pendiente ? 'pendiente' : estadoEvaluacion,
        };
      })
      .filter((item) => item !== null);
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

    await this.dataSource.getRepository(ObservacionArchivo).save(observacionArchivo);

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

    const autoresIds = new Set((articulo.autores ?? []).map((autor) => autor.id));
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

    if (!/correccion enviada por autor|corrección enviada por autor/.test(textoCorreccionAutor)) {
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

      const texto = `${obs.asunto ?? ''} ${obs.comentarios ?? ''}`.toLowerCase();
      return /correccion aceptada|corrección aceptada|correccion aprobada|corrección aprobada/.test(
        texto,
      );
    });

    if (yaAceptada) {
      return {
        message: 'Esta corrección ya había sido aceptada previamente',
      };
    }

    const observacionAceptacion = this.dataSource.getRepository(Observacion).create({
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

  private tieneCorreccionPendiente(articulo: Articulo, userId: number): boolean {
    const autoresIds = new Set((articulo.autores ?? []).map((autor) => autor.id));
    const observaciones = articulo.observaciones ?? [];

    let ultimaSolicitudCorreccion: Date | null = null;
    let ultimaRespuestaAutor: Date | null = null;
    let ultimaAceptacionCorreccion: Date | null = null;

    for (const observacion of observaciones) {
      const fecha = new Date(observacion.fechaSubida);
      if (isNaN(fecha.getTime())) {
        continue;
      }

      const usuarioObservacionId = observacion.usuarioId ?? observacion.usuario?.id;
      const esAutor =
        (typeof usuarioObservacionId === 'number' && autoresIds.has(usuarioObservacionId)) ||
        false;

      const texto = `${observacion.asunto ?? ''} ${observacion.comentarios ?? ''}`.toLowerCase();

      const esAceptacionCorreccion =
        !esAutor && /(correccion aceptada|corrección aceptada|correccion aprobada|corrección aprobada)/.test(texto);

      if (esAceptacionCorreccion) {
        if (!ultimaAceptacionCorreccion || fecha > ultimaAceptacionCorreccion) {
          ultimaAceptacionCorreccion = fecha;
        }
        continue;
      }

      const esSolicitudCorreccion =
        !esAutor && /(correccion|corrección|ajuste|subsan|pendiente)/.test(texto);

      if (esSolicitudCorreccion) {
        if (!ultimaSolicitudCorreccion || fecha > ultimaSolicitudCorreccion) {
          ultimaSolicitudCorreccion = fecha;
        }
        continue;
      }

      const esRespuestaAutorCorreccion =
        usuarioObservacionId === userId &&
        (observacion.asunto ?? '').trim() === ArticulosService.ASUNTO_CORRECCION_AUTOR;

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
      (!ultimaRespuestaAutor || ultimaAceptacionCorreccion >= ultimaRespuestaAutor)
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

        const texto = `${obs.asunto ?? ''} ${obs.comentarios ?? ''}`.toLowerCase();
        const tipo = /(correccion|corrección|ajuste|subsan|pendiente)/.test(texto)
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

    if (!esAdmin && !esAutor && !esDirector && !esMonitor && !esComiteEditorial) {
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
