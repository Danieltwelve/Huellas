import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdicionesRevistaService } from '../../core/ediciones-revista/ediciones.revista.service';
import { Articulos, ArticuloDetalle } from './articulos/articulos';
import { environment } from '../../../environments/environments';

interface EdicionFormateada {
  id: number;
  tituloCompleto: string;
  tituloOriginal: string;
  anio: number;
  fecha: string;
  descripcion: string;
  autores: number;
  articulosCount: number;
  portada?: string | null;
  pdf: string;
  enlacePublicacion: string;
  articulos: ArticuloDetalle[];
}

@Component({
  selector: 'app-actual',
  standalone: true,
  imports: [CommonModule, FormsModule, Articulos],
  templateUrl: './actual.component.html',
  styleUrls: ['./actual.component.css'],
})
export class ActualComponent {
  private edicionesService = inject(EdicionesRevistaService);

  busqueda = '';
  anioFiltro = '';
  loading = false;
  error: string | null = null;
  readonly portadaFallback = '/equipo/portada.jpg';
  readonly enlaceRevistaGeneral = '/acerca-de';

  edicionesFormateadas: EdicionFormateada[] = [];
  aniosDisponibles: number[] = [];

  edicionSeleccionada: EdicionFormateada | null = null;

  ngOnInit(): void {
    this.cargarEdiciones();
  }

  cargarEdiciones(): void {
    this.loading = true;
    this.error = null;
    this.edicionesService.getEdicionesPublicadas().subscribe({
      next: (respuesta) => {
        const edicionesBackend = respuesta.data;
        this.edicionesFormateadas = edicionesBackend.map((ed) => this.formatearEdicion(ed));
        const yearsSet = new Set<number>();
        this.edicionesFormateadas.forEach((ed) => yearsSet.add(ed.anio));
        this.aniosDisponibles = Array.from(yearsSet).sort((a, b) => b - a);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar las ediciones publicadas.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  private formatearEdicion(backendEd: any): EdicionFormateada {
    const tituloCompleto = `Vol. ${backendEd.volumen} Núm. ${backendEd.numero} (${backendEd.anio})`;
    let fechaMostrar = `${backendEd.anio}`;
    if (backendEd.fecha_estado) {
      try {
        const fechaObj = new Date(backendEd.fecha_estado);
        if (!isNaN(fechaObj.getTime())) {
          fechaMostrar = fechaObj.toLocaleDateString('es-CO');
        }
      } catch (e) {}
    }

    const articulosMapeados: ArticuloDetalle[] = (backendEd.articulos || []).map((art: any) => ({
      id: art.id,
      titulo: art.titulo,
      resumen: art.resumen || '',
      autores: art.autores || [],
      temas: art.temas || [],
      palabrasClave: art.palabrasClave || '',
      doi: art.doi ?? null,
      issn: art.issn ?? null,
      paginas: art.paginas ?? null,
      fechaPublicacion: art.fechaPublicacion ?? null,
    }));

    let portadaUrl = this.portadaFallback;
    if (backendEd.portada) {
      portadaUrl = `${environment.apiUrlBackend}/${backendEd.portada}`;
    }

    return {
      id: backendEd.id,
      tituloCompleto,
      tituloOriginal: backendEd.titulo,
      anio: backendEd.anio,
      fecha: fechaMostrar,
      descripcion: '',
      autores: 0,
      articulosCount: backendEd.numeroArticulos ?? articulosMapeados.length,
      pdf: '',
      portada: portadaUrl,
      enlacePublicacion: '',
      articulos: articulosMapeados,
    };
  }

  verEdicion(edicion: EdicionFormateada): void {
    this.edicionSeleccionada = edicion;
  }

  volverAListado(): void {
    this.edicionSeleccionada = null;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.anioFiltro = '';
  }

  get edicionesFiltradas(): EdicionFormateada[] {
    return this.edicionesFormateadas.filter((ed) => {
      const coincideBusqueda =
        ed.tituloCompleto.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        ed.tituloOriginal.toLowerCase().includes(this.busqueda.toLowerCase());
      const coincideAnio = this.anioFiltro ? ed.anio === Number(this.anioFiltro) : true;
      return coincideBusqueda && coincideAnio;
    });
  }
}
