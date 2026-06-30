/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { DataSource, IsNull, Repository } from 'typeorm';
import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { Revisores } from './entities/revisores.entity';
import { GeminiService } from 'src/common/gemini/gemini.service';
import { User } from 'src/modules/users/user.entity';
import { Observacion } from 'src/modules/observaciones/entities/observacione.entity';
import { ObservacionArchivo } from 'src/modules/observaciones-archivos/entities/observaciones-archivo.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as path from 'path';
import { existsSync, promises as fs, mkdirSync } from 'fs';

@Injectable()
export class RevisoresService {
  private static readonly ETAPA_REVISION_PARES = 4;
  private static readonly ASUNTO_REVISION_PARES_APROBADO =
    'Revisión por pares: ACEPTAR';
  private static readonly ASUNTO_REVISION_PARES_AJUSTES =
    'Revisión por pares: AJUSTES';
  private static readonly ASUNTO_REVISION_PARES_RECHAZADO =
    'Revisión por pares: RECHAZAR';

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
      relations: ['revisor', 'etapaActual', 'historialEtapas', 'temas', 'observaciones'],
      order: { id: 'DESC' },
    });

    // Obtener las observaciones de revisión existentes para este revisor, para marcar estado 'evaluado'
    const observacionesRepo = this.dataSource.getRepository(Observacion);
    const observacionesRevisor = await observacionesRepo
      .createQueryBuilder('observacion')
      .where(
        'observacion.usuarioId = :usuarioId AND observacion.etapaId = :etapaId',
        {
          usuarioId,
          etapaId: RevisoresService.ETAPA_REVISION_PARES,
        },
      )
      .andWhere(
        '(observacion.asunto = :aprobado OR observacion.asunto = :rechazado OR observacion.asunto = :ajustes)',
        {
          aprobado: RevisoresService.ASUNTO_REVISION_PARES_APROBADO,
          rechazado: RevisoresService.ASUNTO_REVISION_PARES_RECHAZADO,
          ajustes: RevisoresService.ASUNTO_REVISION_PARES_AJUSTES,
        },
      )
      .getMany();
    const articulosConRevision = new Set(
      observacionesRevisor.map((o) => o.articuloId),
    );

    return articulos
      .filter((articulo) => articulo.revisor?.usuarioId === usuarioId)
      .map((articulo, index) => {
        const fechaAsignacion = this.obtenerFechaAsignacionRevision(articulo);
        const diasExtension = articulo.prorrogaRevisorAceptada ? 15 : 0;
        const fechaLimite = fechaAsignacion
          ? new Date(
              new Date(fechaAsignacion).getTime() +
                (30 + diasExtension) * 24 * 60 * 60 * 1000,
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
            articulo.temas
              ?.map((tema) => tema.nombre)
              .filter(Boolean)
              .join(', ') || 'Sin tema',
          fechaAsignacion: fechaAsignacion?.toISOString() ?? null,
          fechaLimite: fechaLimite?.toISOString() ?? null,
          estado: articulosConRevision.has(articulo.id)
            ? 'evaluado'
            : 'en-proceso',
          prioridad:
            diasRestantes !== null && diasRestantes <= 5
              ? 'alta'
              : diasRestantes !== null && diasRestantes <= 10
                ? 'media'
                : 'baja',
          ronda: Math.max(
            1,
            (articulo.historialEtapas ?? []).filter(
              (historial) =>
                historial.etapaId === RevisoresService.ETAPA_REVISION_PARES,
            ).length,
          ),
          enlace: `/panel-revisor/realizar-revision?articuloId=${articulo.id}`,
          orden: index,
        };
      });
  }

  async getNotificacionesRevisor(usuarioId: number) {
    const articulos = await this.getArticulosAsignadosRevisor(usuarioId);
    if (articulos.length === 0) {
      return [];
    }

    const articuloIds = articulos.map((a) => a.id);

    // Obtener observaciones de prórroga para estos artículos
    const observacionesRepo = this.dataSource.getRepository(Observacion);
    const observacionesProrroga = await observacionesRepo
      .createQueryBuilder('observacion')
      .where('observacion.articuloId IN (:...articuloIds)', { articuloIds })
      .andWhere(
        '(observacion.asunto = :aceptada OR observacion.asunto = :rechazada)',
        {
          aceptada: 'Revisión por pares: prórroga aceptada',
          rechazada: 'Revisión por pares: prórroga rechazada',
        },
      )
      .getMany();

    const notificaciones: any[] = [];

    // Agregar notificaciones de asignación
    for (const articulo of articulos) {
      notificaciones.push({
        id: `ASIG-${articulo.id}`,
        articuloId: articulo.id,
        codigoArticulo: articulo.codigo,
        titulo: 'Nuevo artículo asignado',
        detalle: `Se asignó ${articulo.codigo} para revisión por pares.`,
        fecha: articulo.fechaAsignacion ?? new Date().toISOString(),
        enlace: articulo.enlace,
      });
    }

    // Agregar notificaciones de prórroga
    for (const obs of observacionesProrroga) {
      const articulo = articulos.find((a) => a.id === obs.articuloId);
      if (articulo) {
        const esAceptada = obs.asunto === 'Revisión por pares: prórroga aceptada';
        notificaciones.push({
          id: `PRORR-${obs.id}`,
          articuloId: obs.articuloId,
          codigoArticulo: articulo.codigo,
          titulo: esAceptada ? 'Prórroga aprobada' : 'Prórroga rechazada',
          detalle: esAceptada
            ? `Tu solicitud de prórroga para ${articulo.codigo} fue aprobada. Plazo extendido 15 días.`
            : `Tu solicitud de prórroga para ${articulo.codigo} fue rechazada.`,
          fecha: obs.fechaSubida?.toISOString() ?? new Date().toISOString(),
          enlace: articulo.enlace,
        });
      }
    }

    // Ordenar de más reciente a más antigua
    return notificaciones.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });
  }

  private splitTextIntoLines(
    text: string,
    maxWidth: number,
    font: any,
    fontSize: number,
  ): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('');
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth) {
          if (currentLine !== '') {
            lines.push(currentLine);
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine !== '') {
        lines.push(currentLine);
      }
    }
    return lines;
  }

  private async generateRubricaPdf(
    textoRubrica: string,
    codigoArticulo: string,
    tituloArticulo: string,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const fontSize = 10;
      const titleFontSize = 14;
      const lineSpacing = 16;
      const margin = 50;
      const letterWidth = 612;
      const letterHeight = 792;
      const contentWidth = letterWidth - (2 * margin); // 512

      // Parse metadata from text
      let calificacion = '';
      let decision = '';
      let jurado = '';
      const remainingLines: string[] = [];

      const lines = textoRubrica.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.replace('\r', '').trim();
        if (!line) {
          remainingLines.push('');
          continue;
        }

        const califMatch = line.match(/^calificaci[oó]n:\s*(.*)/i);
        const decMatch = line.match(/^decisi[oó]n:\s*(.*)/i);
        const juradoMatch = line.match(/^(jurado\s+evaluador|nombre\s+del\s+evaluador):\s*(.*)/i);

        if (califMatch) {
          calificacion = califMatch[1].trim();
        } else if (decMatch) {
          decision = decMatch[1].trim();
        } else if (juradoMatch) {
          jurado = juradoMatch[2].trim();
        } else {
          remainingLines.push(line);
        }
      }

      let page = pdfDoc.addPage([letterWidth, letterHeight]);
      let y = letterHeight - margin;

      // 1. Decorative top banner
      page.drawRectangle({
        x: margin,
        y: y - 4,
        width: contentWidth,
        height: 6,
        color: rgb(0, 0.45, 0.45),
      });
      y -= 25;

      // 2. Title and Stage
      page.drawText('REVISTA HUELLAS', {
        x: margin,
        y: y,
        size: titleFontSize,
        font: fontBold,
        color: rgb(0, 0.45, 0.45),
      });

      const typeLabel = decision ? 'REPORTE DE EVALUACIÓN' : 'INFORME DE COMITÉ EDITORIAL';
      const typeWidth = fontBold.widthOfTextAtSize(typeLabel, 10);
      page.drawText(typeLabel, {
        x: letterWidth - margin - typeWidth,
        y: y + 2,
        size: 10,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 20;

      // Thin separator
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: letterWidth - margin, y: y },
        thickness: 0.75,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 20;

      // 3. Metadata Table Block
      const tableHeight = 70;
      page.drawRectangle({
        x: margin,
        y: y - tableHeight,
        width: contentWidth,
        height: tableHeight,
        color: rgb(0.97, 0.97, 0.98),
        borderColor: rgb(0.88, 0.89, 0.9),
        borderWidth: 1,
      });

      const tableContentY = y - 15;
      page.drawText('Código del Artículo:', { x: margin + 15, y: tableContentY, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(codigoArticulo, { x: margin + 130, y: tableContentY, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });

      const titleLabelY = tableContentY - 15;
      page.drawText('Título del Artículo:', { x: margin + 15, y: titleLabelY, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      
      const wrappedTitle = this.splitTextIntoLines(tituloArticulo, contentWidth - 145, font, 9);
      let titleY = titleLabelY;
      for (let i = 0; i < Math.min(2, wrappedTitle.length); i++) {
        page.drawText(wrappedTitle[i], { x: margin + 130, y: titleY, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });
        titleY -= 11;
      }

      if (jurado) {
        const juradoY = tableContentY - 45;
        page.drawText('Evaluador / Jurado:', { x: margin + 15, y: juradoY, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(jurado, { x: margin + 130, y: juradoY, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });
      } else {
        const fechaY = tableContentY - 45;
        page.drawText('Fecha de Reporte:', { x: margin + 15, y: fechaY, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(new Date().toLocaleDateString('es-ES'), { x: margin + 130, y: fechaY, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });
      }

      y -= (tableHeight + 20);

      // 4. Decision & Score Callout Box
      if (decision || calificacion) {
        const hasAjustes = decision.toLowerCase().includes('ajuste');
        const hasRechazo = decision.toLowerCase().includes('rechaz') || decision.toLowerCase().includes('rechazo');
        
        let cardBg = rgb(0.94, 0.98, 0.98); // teal/green
        let cardBorder = rgb(0, 0.6, 0.6);
        let cardText = rgb(0, 0.4, 0.4);
        let decisionText = 'APROBADO';

        if (hasAjustes) {
          cardBg = rgb(0.99, 0.98, 0.94); // yellow/orange
          cardBorder = rgb(0.9, 0.6, 0.1);
          cardText = rgb(0.7, 0.4, 0);
          decisionText = 'APROBADO CON AJUSTES';
        } else if (hasRechazo) {
          cardBg = rgb(0.99, 0.95, 0.95); // red
          cardBorder = rgb(0.9, 0.3, 0.3);
          cardText = rgb(0.7, 0.1, 0.1);
          decisionText = 'RECHAZADO';
        }

        const calloutHeight = 45;
        page.drawRectangle({
          x: margin,
          y: y - calloutHeight,
          width: contentWidth,
          height: calloutHeight,
          color: cardBg,
          borderColor: cardBorder,
          borderWidth: 1.5,
        });

        const calloutTextY = y - 27;
        page.drawText(`DECISIÓN: ${decisionText}`, {
          x: margin + 20,
          y: calloutTextY,
          size: 11,
          font: fontBold,
          color: cardText,
        });

        if (calificacion) {
          const califText = `Puntaje: ${calificacion}`;
          const califWidth = fontBold.widthOfTextAtSize(califText, 11);
          page.drawText(califText, {
            x: letterWidth - margin - 20 - califWidth,
            y: calloutTextY,
            size: 11,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        y -= (calloutHeight + 25);
      }

      // 5. Body Comments Header
      page.drawText('DETALLES Y EVALUACIÓN DE LA RÚBRICA', {
        x: margin,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 15;

      page.drawLine({
        start: { x: margin, y: y },
        end: { x: letterWidth - margin, y: y },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= 20;

      // 6. Print comments with auto line wrapping and page breaks
      for (const line of remainingLines) {
        if (line.trim() === '') {
          y -= 10;
          continue;
        }

        const wrappedLines = this.splitTextIntoLines(line, contentWidth, font, fontSize);

        for (const subLine of wrappedLines) {
          if (y < margin + 40) {
            page = pdfDoc.addPage([letterWidth, letterHeight]);
            y = letterHeight - margin;

            page.drawRectangle({
              x: margin,
              y: y - 4,
              width: contentWidth,
              height: 4,
              color: rgb(0, 0.45, 0.45),
            });
            y -= 25;
          }

          const isSubHeader =
            subLine.includes('RÚBRICA DE EVALUACIÓN') ||
            subLine.includes('OBSERVACIONES GENERALES:') ||
            subLine.includes('CRITERIOS DE EVALUACIÓN:') ||
            /^\d+\.\s/.test(subLine);

          page.drawText(subLine, {
            x: margin,
            y: y,
            size: fontSize,
            font: isSubHeader ? fontBold : font,
            color: isSubHeader ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
          });

          y -= lineSpacing;
        }
      }

      // 7. Footer page numbers
      const pageCount = pdfDoc.getPageCount();
      for (let i = 0; i < pageCount; i++) {
        const p = pdfDoc.getPage(i);
        p.drawText(`Página ${i + 1} de ${pageCount}`, {
          x: letterWidth / 2 - 30,
          y: 25,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
        p.drawText(`Revista Huellas - Sistema de Gestión Editorial`, {
          x: margin,
          y: 25,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      throw error;
    }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const revisor = await queryRunner.manager.findOne(Revisores, {
        where: { usuarioId },
        relations: ['usuario'],
      });

      if (!revisor) {
        throw new NotFoundException('Revisor no encontrado');
      }

      const articulo = await queryRunner.manager.findOne(Articulo, {
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

      const observacionesRepo = queryRunner.manager.getRepository(Observacion);
      const revisionExistente = await observacionesRepo
         .createQueryBuilder('observacion')
         .where(
           'observacion.articuloId = :articuloId AND observacion.usuarioId = :usuarioId AND observacion.etapaId = :etapaId',
           {
             articuloId,
             usuarioId,
             etapaId: RevisoresService.ETAPA_REVISION_PARES,
           },
         )
         .andWhere(
           '(observacion.asunto = :aprobado OR observacion.asunto = :rechazado OR observacion.asunto = :ajustes)',
           {
             aprobado: RevisoresService.ASUNTO_REVISION_PARES_APROBADO,
             rechazado: RevisoresService.ASUNTO_REVISION_PARES_RECHAZADO,
             ajustes: RevisoresService.ASUNTO_REVISION_PARES_AJUSTES,
           },
         )
         .getOne();

      if (revisionExistente) {
        throw new ConflictException(
          'Ya enviaste una revisión para este artículo.',
        );
      }

      const calificacion = Number(data.calificacion);
      if (
        !Number.isFinite(calificacion) ||
        calificacion < 1 ||
        calificacion > 5
      ) {
        throw new BadRequestException(
          'La calificación debe estar entre 1 y 5.',
        );
      }

      const recomendacion = data.recomendacion;
      const asunto =
        recomendacion === 'aceptar'
          ? RevisoresService.ASUNTO_REVISION_PARES_APROBADO
          : recomendacion === 'ajustes'
            ? RevisoresService.ASUNTO_REVISION_PARES_AJUSTES
            : RevisoresService.ASUNTO_REVISION_PARES_RECHAZADO;

      const observacionBase = [
        `Calificación: ${calificacion}/5`,
        `Decisión: ${recomendacion.toUpperCase()}`,
        data.comentarios?.trim()
          ? `Comentarios:\n${data.comentarios.trim()}`
          : '',
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

      // Generar PDF de la rúbrica y guardarlo como archivo adjunto de la observación
      const pdfBuffer = await this.generateRubricaPdf(
        observacionBase,
        articulo.codigo,
        articulo.titulo,
      );

      const uniqueFilename = `rubrica-revision-${articulo.id}-${Date.now()}.pdf`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'articulos');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      const fullPath = path.join(uploadDir, uniqueFilename);
      await fs.writeFile(fullPath, pdfBuffer);

      const archivoRepo = queryRunner.manager.getRepository(ObservacionArchivo);
      const registroPdf = archivoRepo.create({
        observacionesId: observacionGuardada.id,
        archivoPath: path.join('uploads', 'articulos', uniqueFilename),
        archivoNombreOriginal: `Rubrica_Revision_Pares_${articulo.codigo}.pdf`,
      });
      await archivoRepo.save(registroPdf);

      if (archivo) {
        const registroArchivo = archivoRepo.create({
          observacionesId: observacionGuardada.id,
          archivoPath: archivo.path,
          archivoNombreOriginal: archivo.originalname,
        });
        await archivoRepo.save(registroArchivo);
      }

      // Crear observaciones notificación para autores
      const articuloConAutores = await queryRunner.manager.findOne(Articulo, {
        where: { id: articuloId },
        relations: ['autores'],
      });
      const autorIds = articuloConAutores?.autores?.map((a) => a.id) ?? [];
      const resumenDecision =
        recomendacion === 'aceptar'
          ? 'El artículo fue aprobado en la revisión por pares.'
          : recomendacion === 'ajustes'
            ? 'El artículo requiere realizar correcciones (ajustes) en la revisión por pares.'
            : 'El artículo fue rechazado en la revisión por pares.';

      for (const autorId of autorIds) {
        const notificacionAutor = observacionesRepo.create({
          articuloId,
          usuarioId: usuarioId,
          etapaId: RevisoresService.ETAPA_REVISION_PARES,
          asunto: `Revisión por pares completada: ${
            recomendacion === 'aceptar'
              ? 'APROBADO'
              : recomendacion === 'ajustes'
                ? 'AJUSTES'
                : 'RECHAZADO'
          }`,
          comentarios: `${resumenDecision} Calificación: ${calificacion}/5.`,
        });
        await observacionesRepo.save(notificacionAutor);
      }

      // --- LÓGICA PARA MOVER A DESCARTADO SI LA RECOMENDACIÓN ES RECHAZAR ---
      if (recomendacion === 'rechazar') {
        // 1. Cerrar el historial activo de la etapa de Revisión por pares
        const historialAbierto = await queryRunner.manager.findOne(
          ArticuloHistorialEtapa,
          {
            where: {
              articuloId,
              etapaId: RevisoresService.ETAPA_REVISION_PARES,
              fechaFin: IsNull(),
            },
            order: { fechaInicio: 'DESC' },
          },
        );
        if (historialAbierto) {
          historialAbierto.fechaFin = new Date();
          await queryRunner.manager.save(historialAbierto);
        }

        await queryRunner.manager.update(Articulo, articuloId, {
          etapaActualId: 7,
        });

        // 3. Crear un nuevo registro en el historial para la etapa DESCARTADO
        const nuevoHistorial = queryRunner.manager.create(
          ArticuloHistorialEtapa,
          {
            articuloId,
            etapaId: 7,
            fechaInicio: new Date(),
            usuarioId, // el revisor que emite el rechazo
          },
        );
        await queryRunner.manager.save(nuevoHistorial);
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Revisión registrada correctamente.',
        articuloId,
        observacionId: observacionGuardada.id,
        recomendacion,
        calificacion,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getHistorialRevisionRevisor(usuarioId: number) {
    const observaciones = await this.dataSource
      .getRepository(Observacion)
      .createQueryBuilder('observacion')
      .leftJoinAndSelect('observacion.articulo', 'articulo')
      .leftJoinAndSelect('observacion.archivos', 'archivos')
      .where(
        'observacion.usuarioId = :usuarioId AND observacion.etapaId = :etapaId',
        {
          usuarioId,
          etapaId: RevisoresService.ETAPA_REVISION_PARES,
        },
      )
      .andWhere(
        '(observacion.asunto = :aprobado OR observacion.asunto = :rechazado OR observacion.asunto = :ajustes)',
        {
          aprobado: RevisoresService.ASUNTO_REVISION_PARES_APROBADO,
          rechazado: RevisoresService.ASUNTO_REVISION_PARES_RECHAZADO,
          ajustes: RevisoresService.ASUNTO_REVISION_PARES_AJUSTES,
        },
      )
      .orderBy('observacion.fechaSubida', 'DESC')
      .getMany();

    return observaciones.map((observacion) => {
      const asunto = (observacion.asunto ?? '').toLowerCase();
      const decision = asunto.includes('rechaz') ? 'rechazar' : 'aceptar';
      const archivoPrincipal = observacion.archivos?.[0] ?? null;

      return {
        id: observacion.id,
        articuloId: observacion.articuloId,
        codigoArticulo:
          observacion.articulo?.codigo ?? `ART-${observacion.articuloId}`,
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
      const relevancia = String(item?.relevancia ?? '')
        .toUpperCase()
        .trim();
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
    const obsAsignacion = (articulo.observaciones ?? []).find(
      (o) => o.asunto === 'Asignación de revisor por pares',
    );
    if (obsAsignacion) {
      return new Date(obsAsignacion.fechaSubida);
    }

    const historialRevision = (articulo.historialEtapas ?? [])
      .filter(
        (historial) =>
          historial.etapaId === RevisoresService.ETAPA_REVISION_PARES,
      )
      .sort(
        (a, b) =>
          new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
      );

    if (historialRevision.length > 0) {
      return new Date(historialRevision[0].fechaInicio);
    }

    return null;
  }
}
