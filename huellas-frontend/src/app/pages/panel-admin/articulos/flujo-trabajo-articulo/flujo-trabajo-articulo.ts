import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../../core/articulos/articulos.service';
import { ActivatedRoute } from '@angular/router';

interface EtapaFlujo {
  id: string;
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
  imports: [CommonModule],
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

  tituloArticulo = 'Cargando...';

  private readonly mapaEtapas: Record<string, string> = {
    'REVISIÓN PRELIMINAR': 'revision-preliminar',
    RECEPCIÓN: 'recepcion',
    TURNITING: 'turniting',
    'REVISIÓN POR PARES': 'revision-pares',
    PUBLICACIÓN: 'publicacion',
  };

  readonly etapasDisponibles: EtapaFlujo[] = [
    { id: 'revision-preliminar', titulo: 'Revisión Preliminar', activa: false },
    { id: 'recepcion', titulo: 'Recepción', activa: false },
    { id: 'turniting', titulo: 'Turniting', activa: false },
    { id: 'revision-pares', titulo: 'Revisión por pares', activa: false },
    { id: 'publicacion', titulo: 'Publicación', activa: false },
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
        this.actualizarEtapaActual(data.etapaActual.nombre);
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

  private actualizarEtapaActual(nombreEtapa: string): void {
    const etapaId = this.mapaEtapas[nombreEtapa];

    this.etapas = this.etapasDisponibles.map((etapa) => ({
      ...etapa,
      activa: etapa.id === etapaId,
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
    this.etapas.forEach((etapa, posicion) => {
      etapa.activa = posicion === indice;
    });
  }
}
