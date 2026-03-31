import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../../core/articulos/articulos.service';
import { ActivatedRoute } from '@angular/router';

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
  expandido?: boolean;
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
    return observaciones
      .map((obs) => {
        const fecha = new Date(obs.fechaSubida);

        return {
          id: obs.id,
          fechaOrden: fecha.getTime(),
          fecha: this.formatearFecha(fecha),
          autor: obs.usuario?.nombre ?? 'Usuario desconocido',
          rol: obs.usuario?.roles[0]?.nombre ?? 'Sin rol',
          asunto: obs.asunto,
          comentario: obs.comentarios ?? undefined,
          expandido: false,
          archivos: obs.archivos.map((archivo) => ({
            nombre: archivo.archivoNombreOriginal,
            path: archivo.archivoPath,
          })),
        };
      })
      .sort((a, b) => b.fechaOrden - a.fechaOrden);
  }

  toggleRegistro(registro: RegistroFlujo): void {
    registro.expandido = !registro.expandido;
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    let filename = path.split('/').pop() || '';
    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreOriginal;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar archivo:', err);
      },
    });
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
