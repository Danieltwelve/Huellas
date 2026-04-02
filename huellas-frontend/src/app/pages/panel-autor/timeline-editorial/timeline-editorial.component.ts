import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../core/articulos/articulos.service';
import {
  ArticuloAutor,
  ArticulosAutorService,
} from '../../../core/articulos/articulos-autor.service';
import { normalizarNombreArchivo } from '../../../core/utils/filename.utils';

interface EtapaEditorial {
  id: number;
  nombre: string;
  fecha: string;
  descripcion: string;
  estado: 'completada' | 'actual' | 'pendiente';
}

interface EventoTimeline {
  fecha: string;
  titulo: string;
  descripcion: string;
  archivos: Array<{ nombre: string; path: string }>;
}

@Component({
  selector: 'app-timeline-editorial',
  standalone: true,
  templateUrl: './timeline-editorial.component.html',
  styleUrls: ['./timeline-editorial.component.css']
})
export class TimelineEditorialComponent implements OnInit {
  private readonly articulosAutorService = inject(ArticulosAutorService);
  private readonly articulosService = inject(ArticulosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  articulos: ArticuloAutor[] = [];
  articuloSeleccionadoId: number | null = null;
  flujo: ArticuloFlujo | null = null;
  cargandoLista = true;
  cargandoFlujo = false;
  error: string | null = null;

  private readonly etapasBase: Array<{
    id: number;
    nombre: string;
    descripcion: string;
  }> = [
    {
      id: 1,
      nombre: 'Revision preliminar',
      descripcion: 'Validacion editorial inicial del envio',
    },
    {
      id: 2,
      nombre: 'Recepcion',
      descripcion: 'Registro formal del articulo en la revista',
    },
    {
      id: 3,
      nombre: 'Turniting',
      descripcion: 'Validacion de originalidad y similitud',
    },
    {
      id: 4,
      nombre: 'Revision por pares',
      descripcion: 'Evaluacion por revisores academicos',
    },
    {
      id: 5,
      nombre: 'Publicacion',
      descripcion: 'Preparacion y salida en volumen activo',
    },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const articuloId = Number(params.get('articuloId'));
      this.cargarArticulos(isNaN(articuloId) ? null : articuloId);
    });
  }

  cargarArticulos(articuloIdQuery: number | null): void {
    this.cargandoLista = true;
    this.error = null;

    this.articulosAutorService.getMisArticulos().subscribe({
      next: (articulos) => {
        this.articulos = articulos;
        this.cargandoLista = false;

        if (this.articulos.length === 0) {
          this.flujo = null;
          this.articuloSeleccionadoId = null;
          return;
        }

        const articuloValido =
          articuloIdQuery && this.articulos.some((articulo) => articulo.id === articuloIdQuery)
            ? articuloIdQuery
            : this.articulos[0].id;

        if (this.articuloSeleccionadoId !== articuloValido) {
          this.articuloSeleccionadoId = articuloValido;
          this.cargarFlujo(articuloValido);
        }
      },
      error: (err) => {
        console.error('Error cargando articulos del autor:', err);
        this.error = 'No fue posible cargar tus articulos.';
        this.cargandoLista = false;
      },
    });
  }

  onSeleccionArticulo(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const id = Number(target.value);

    if (isNaN(id)) {
      return;
    }

    this.articuloSeleccionadoId = id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { articuloId: id },
      queryParamsHandling: 'merge',
    });
    this.cargarFlujo(id);
  }

  private cargarFlujo(articuloId: number): void {
    this.cargandoFlujo = true;
    this.error = null;

    this.articulosService.getArticuloFlujo(articuloId).subscribe({
      next: (flujo) => {
        this.flujo = flujo;
        this.cargandoFlujo = false;
      },
      error: (err) => {
        console.error('Error al cargar timeline del articulo:', err);
        this.error = 'No fue posible cargar el seguimiento del articulo.';
        this.cargandoFlujo = false;
      },
    });
  }

  get titulo(): string {
    if (!this.flujo) {
      return 'Selecciona un articulo para ver su seguimiento';
    }

    return `${this.flujo.codigo} - ${this.flujo.titulo}`;
  }

  get etapas(): EtapaEditorial[] {
    if (!this.flujo) {
      return [];
    }

    const etapaActualId = this.flujo.etapaActual?.id ?? 1;
    const historialPorEtapa = new Map<number, string>();

    for (const historial of this.flujo.historialEtapas ?? []) {
      if (!historialPorEtapa.has(historial.etapaId)) {
        historialPorEtapa.set(historial.etapaId, historial.fechaInicio);
      }
    }

    return this.etapasBase.map((etapa) => {
      const estado: 'completada' | 'actual' | 'pendiente' =
        etapa.id < etapaActualId
          ? 'completada'
          : etapa.id === etapaActualId
            ? 'actual'
            : 'pendiente';

      const fechaRegistrada = historialPorEtapa.get(etapa.id);

      return {
        id: etapa.id,
        nombre: etapa.nombre,
        descripcion: etapa.descripcion,
        estado,
        fecha: fechaRegistrada ? this.formatearFechaCorta(fechaRegistrada) : 'Por definir',
      };
    });
  }

  get historial(): EventoTimeline[] {
    if (!this.flujo?.observaciones?.length) {
      return [];
    }

    return [...this.flujo.observaciones]
      .sort((a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime())
      .map((obs: ObservacionBackend) => ({
        fecha: this.formatearFechaLarga(obs.fechaSubida),
        titulo: obs.asunto || 'Observacion editorial',
        descripcion: obs.comentarios || 'Sin comentarios adicionales.',
        archivos: obs.archivos.map((archivo) => ({
          nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
          path: archivo.archivoPath,
        })),
      }));
  }

  get progreso(): number {
    const completadas = this.etapas.filter((etapa) => etapa.estado === 'completada').length;
    return Math.round((completadas / this.etapas.length) * 100);
  }

  get siguientePaso(): EtapaEditorial | null {
    return this.etapas.find((etapa) => etapa.estado === 'actual') ?? null;
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';

    if (!filename) {
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
      },
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

  private formatearFechaLarga(fechaIso: string): string {
    const valor = (fechaIso ?? '').trim();
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
}
