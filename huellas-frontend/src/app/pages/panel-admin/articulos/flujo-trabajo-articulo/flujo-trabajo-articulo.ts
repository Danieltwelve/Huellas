import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../../core/articulos/articulos.service';
import { ActivatedRoute } from '@angular/router';
import { normalizarNombreArchivo } from '../../../../core/utils/filename.utils';

interface EtapaFlujo {
  id: number;
  titulo: string;
  activa: boolean;
}

interface ArchivoRegistro {
  nombre: string;
  path: string;
}

interface RegistroFlujo {
  id: number;
  fechaOrden: number;
  fecha: string;
  autor: string;
  rol: string;
  asunto: string;
  comentario?: string;
  archivos?: ArchivoRegistro[];
  esCorreccionAutor?: boolean;
  correccionAceptada?: boolean;
  puedeAceptarCorreccion?: boolean;
  expandido?: boolean;
}

interface EtapaTimeline {
  id: number;
  titulo: string;
  estado: 'completada' | 'actual' | 'pendiente';
  fecha: string;
  descripcion: string;
}

@Component({
  selector: 'app-flujo-trabajo-articulo',
  imports: [CommonModule, FormsModule],
  templateUrl: './flujo-trabajo-articulo.html',
  styleUrl: './flujo-trabajo-articulo.scss',
  standalone: true,
})
export class FlujoTrabajoArticulo {
  private readonly route = inject(ActivatedRoute);
  private readonly articulosService = inject(ArticulosService);

  articulo: ArticuloFlujo | null = null;
  loading = true;
  error: string | null = null;
  accionExitosa: string | null = null;
  accionError: string | null = null;
  aceptandoCorreccionIds = new Set<number>();

  guardandoObservacion = false;
  moviendoEtapa = false;

  asuntoObservacion = '';
  comentarioObservacion = '';
  archivoObservacion: File | null = null;
  nombreArchivoObservacion = '';
  etapaSeleccionadaId: number | null = null;

  tituloArticulo = 'Cargando...';

  readonly etapasDisponibles: EtapaFlujo[] = [
    { id: 1, titulo: 'Revisión Preliminar', activa: false },
    { id: 2, titulo: 'Recepción', activa: false },
    { id: 3, titulo: 'Turniting', activa: false },
    { id: 4, titulo: 'Revisión por pares', activa: false },
    { id: 5, titulo: 'Publicación', activa: false },
  ];

  private readonly etapasDescripciones: Map<number, string> = new Map([
    [1, 'Validación editorial inicial del envío'],
    [2, 'Registro formal del artículo en la revista'],
    [3, 'Validación de originalidad y similitud'],
    [4, 'Evaluación por revisores académicos'],
    [5, 'Preparación y salida en volumen activo'],
  ]);

  etapas: EtapaFlujo[] = [...this.etapasDisponibles];

  historialObservaciones: RegistroFlujo[] = [];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.cargarArticulo(+id);
      } else {
        this.error = 'No se encontró el ID del artículo';
        this.loading = false;
      }
    });
  }

  cargarArticulo(id: number): void {
    this.loading = true;
    this.articulosService.getArticuloFlujo(id).subscribe({
      next: (data) => {
        this.articulo = data;
        this.tituloArticulo = `${data.codigo} - ${data.titulo}`;
        this.actualizarEtapaActual(data.etapaActual.id);
        this.etapaSeleccionadaId = data.etapaActual.id;
        this.historialObservaciones = this.mapearObservacionesAHistorial(data.observaciones);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar artículo:', err);
        this.error = 'Error al cargar los datos del artículo';
        this.loading = false;
      },
    });
  }

  private actualizarEtapaActual(etapaActualId: number): void {
    this.etapas = this.etapasDisponibles.map((etapa) => ({
      ...etapa,
      activa: etapa.id === etapaActualId,
    }));
  }

  private mapearObservacionesAHistorial(observaciones: ObservacionBackend[] = []): RegistroFlujo[] {
    const historial = observaciones
      .map<RegistroFlujo>((obs) => {
        const fecha = new Date(obs.fechaSubida);
        const esCorreccionAutor = this.esAsuntoCorreccionAutor(obs.asunto ?? '');

        return {
          id: obs.id,
          fechaOrden: fecha.getTime(),
          fecha: this.formatearFecha(obs.fechaSubida),
          autor: obs.usuario?.nombre ?? 'Usuario desconocido',
          rol: obs.usuario?.roles[0]?.nombre ?? 'Sin rol',
          asunto: obs.asunto,
          comentario: obs.comentarios ?? undefined,
          esCorreccionAutor,
          expandido: esCorreccionAutor,
          archivos: obs.archivos.map((archivo) => ({
            nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
            path: archivo.archivoPath,
          })),
        };
      })
      .sort((a, b) => b.fechaOrden - a.fechaOrden);

    historial.forEach((registro) => {
      if (!registro.esCorreccionAutor) {
        registro.correccionAceptada = false;
        registro.puedeAceptarCorreccion = false;
        return;
      }

      const correccionAceptada = historial.some((item) => {
        if (item.id === registro.id) {
          return false;
        }

        if (item.fechaOrden < registro.fechaOrden) {
          return false;
        }

        return this.esAsuntoAceptacionCorreccion(item.asunto);
      });

      registro.correccionAceptada = correccionAceptada;
      registro.puedeAceptarCorreccion = !correccionAceptada;
    });

    const primeraCorreccion = historial.find((item) => item.esCorreccionAutor);
    if (primeraCorreccion) {
      primeraCorreccion.expandido = true;
    }

    return historial;
  }

  toggleRegistro(registro: RegistroFlujo): void {
    registro.expandido = !registro.expandido;
  }

  private formatearFecha(fechaValor: string | Date): string {
    const valor = typeof fechaValor === 'string' ? fechaValor.trim() : fechaValor.toISOString();

    if (!valor) {
      return 'Sin fecha';
    }

    const sinZonaHoraria = !/(z|[+-]\d{2}:\d{2})$/i.test(valor);

    if (sinZonaHoraria) {
      const match = valor.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/,
      );

      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const hour24 = Number(match[4]);
        const minute = Number(match[5]);
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const periodo = hour24 >= 12 ? 'p. m.' : 'a. m.';
        const dia = String(day).padStart(2, '0');
        const hora = String(hour12).padStart(2, '0');
        const minutos = String(minute).padStart(2, '0');
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

        return `${dia} ${meses[Math.max(0, month - 1)]} ${year}, ${hora}:${minutos} ${periodo}`;
      }
    }

    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota',
    }).format(fecha);
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';

    if (!filename) {
      this.accionError = 'No se pudo resolver el archivo a descargar.';
      this.accionExitosa = null;
      return;
    }

    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = normalizarNombreArchivo(nombreOriginal);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar archivo:', err);
        this.accionError = 'No fue posible descargar el archivo.';
        this.accionExitosa = null;
      },
    });
  }

  confirmarAceptacionCorreccion(registro: RegistroFlujo): void {
    if (!registro.esCorreccionAutor || !registro.puedeAceptarCorreccion) {
      return;
    }

    const confirmado = window.confirm(
      '¿Deseas marcar como aceptada la corrección enviada por el autor?',
    );

    if (!confirmado) {
      return;
    }

    const comentarios =
      window.prompt(
        'Comentario opcional para el autor (puedes dejarlo vacío):',
      ) ?? undefined;

    this.aceptarCorreccionAutor(registro, comentarios);
  }

  aceptarCorreccionAutor(registro: RegistroFlujo, comentarios?: string): void {
    if (!this.articulo || !registro.esCorreccionAutor || !registro.puedeAceptarCorreccion) {
      return;
    }

    this.aceptandoCorreccionIds.add(registro.id);
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .aceptarCorreccionAutor(this.articulo.id, registro.id, comentarios)
      .subscribe({
        next: (respuesta) => {
          this.aceptandoCorreccionIds.delete(registro.id);
          this.accionExitosa = respuesta.message || 'Corrección aceptada correctamente.';
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          this.aceptandoCorreccionIds.delete(registro.id);
          this.accionError = err?.error?.message ?? 'No se pudo aceptar la corrección.';
        },
      });
  }

  isAceptandoCorreccion(registroId: number): boolean {
    return this.aceptandoCorreccionIds.has(registroId);
  }

  private esAsuntoCorreccionAutor(asunto: string): boolean {
    return /correccion enviada por autor|corrección enviada por autor/.test(
      (asunto ?? '').toLowerCase(),
    );
  }

  private esAsuntoAceptacionCorreccion(asunto: string): boolean {
    return /correccion aceptada|corrección aceptada|correccion aprobada|corrección aprobada/.test(
      (asunto ?? '').toLowerCase(),
    );
  }

  get etapaActual(): string {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva?.titulo ?? 'Sin etapa';
  }

  get etiquetaEtapaActual(): string {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva ? `EN ${etapaActiva.titulo.toUpperCase()}` : 'SIN ETAPA';
  }

  get historialVisible(): RegistroFlujo[] {
    return this.historialObservaciones;
  }

  get etapasTimeline(): EtapaTimeline[] {
    if (!this.articulo) {
      return [];
    }

    const etapaActualId = this.articulo.etapaActual.id;
    const historialEtapas = this.articulo.historialEtapas ?? [];
    const historialPorEtapa = new Map<number, string>();

    for (const historial of historialEtapas) {
      if (!historialPorEtapa.has(historial.etapaId)) {
        historialPorEtapa.set(historial.etapaId, historial.fechaInicio);
      }
    }

    return this.etapasDisponibles.map((etapa) => {
      const estado: 'completada' | 'actual' | 'pendiente' =
        etapa.id < etapaActualId
          ? 'completada'
          : etapa.id === etapaActualId
            ? 'actual'
            : 'pendiente';

      const fechaRegistrada = historialPorEtapa.get(etapa.id);

      return {
        id: etapa.id,
        titulo: etapa.titulo,
        estado,
        fecha: fechaRegistrada ? this.formatearFechaCorta(fechaRegistrada) : 'Por definir',
        descripcion: this.etapasDescripciones.get(etapa.id) ?? '',
      };
    });
  }

  private formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Por definir';
    }

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  seleccionarEtapa(indice: number): void {
    this.etapaSeleccionadaId = this.etapas[indice]?.id ?? null;
  }

  onArchivoObservacionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoObservacion = file;
    this.nombreArchivoObservacion = file?.name ?? '';
  }

  agregarObservacion(): void {
    if (!this.articulo) {
      return;
    }

    const asunto = this.asuntoObservacion.trim();
    if (!asunto) {
      this.accionError = 'El asunto de la observación es obligatorio.';
      this.accionExitosa = null;
      return;
    }

    this.guardandoObservacion = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .agregarObservacion(this.articulo.id, {
        asunto,
        comentarios: this.comentarioObservacion.trim() || undefined,
        etapaId: this.etapaSeleccionadaId ?? this.articulo.etapaActual.id,
        archivo: this.archivoObservacion,
      })
      .subscribe({
        next: () => {
          this.guardandoObservacion = false;
          this.asuntoObservacion = '';
          this.comentarioObservacion = '';
          this.archivoObservacion = null;
          this.nombreArchivoObservacion = '';
          this.accionExitosa = 'Observación añadida correctamente.';
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          console.error('Error al agregar observación:', err);
          this.guardandoObservacion = false;
          this.accionError = err?.error?.message ?? 'No se pudo guardar la observación.';
        },
      });
  }

  moverArticulo(): void {
    if (!this.articulo || !this.etapaSeleccionadaId) {
      return;
    }

    if (this.etapaSeleccionadaId === this.articulo.etapaActual.id) {
      this.accionError = 'El artículo ya se encuentra en la etapa seleccionada.';
      this.accionExitosa = null;
      return;
    }

    this.moviendoEtapa = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService.moverEtapa(this.articulo.id, this.etapaSeleccionadaId).subscribe({
      next: () => {
        this.moviendoEtapa = false;
        this.accionExitosa = 'Etapa actualizada correctamente.';
        this.cargarArticulo(this.articulo!.id);
      },
      error: (err) => {
        console.error('Error al mover etapa:', err);
        this.moviendoEtapa = false;
        this.accionError = err?.error?.message ?? 'No se pudo mover el artículo de etapa.';
      },
    });
  }

  get resumenArticulo(): string {
    return this.articulo?.resumen ?? 'Sin resumen';
  }

  get temasArticulo(): string {
    if (!this.articulo?.temas?.length) {
      return 'Sin temas registrados';
    }

    return this.articulo.temas.join(', ');
  }

  get palabrasClaveArticulo(): string {
    if (!this.articulo?.palabrasClave?.length) {
      return 'Sin palabras clave';
    }

    return this.articulo.palabrasClave.join(', ');
  }

  get autoresArticulo(): string {
    if (!this.articulo?.autores?.length) {
      return 'Sin autores registrados';
    }

    return this.articulo.autores.map((autor) => autor.nombre).join(', ');
  }

  get fechaEnvioArticulo(): string {
    if (!this.articulo?.fechaEnvio) {
      return 'Sin fecha de envío';
    }

    return this.formatearFecha(new Date(this.articulo.fechaEnvio));
  }
}
