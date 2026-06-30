import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticuloFlujo, ArticulosService } from '../../../../../core/articulos/articulos.service';
import { normalizarNombreArchivo } from '../../../../../core/utils/filename.utils';

@Component({
  selector: 'app-resumen-autor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-autor.html',
  styleUrl: './resumen-autor.css',
})
export class ResumenAutor {
  private readonly articulosService = inject(ArticulosService);

  @Input() articulo: ArticuloFlujo | null = null;

  resumenEnvioExpandido = true;

  toggleResumenEnvio(): void {
    this.resumenEnvioExpandido = !this.resumenEnvioExpandido;
  }

  get autoresArticulo(): string {
    if (!this.articulo?.autores?.length) {
      return 'Sin autores registrados';
    }
    return this.articulo.autores.map((autor) => autor.nombre).join(', ');
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

  get fechaEnvioArticulo(): string {
    if (!this.articulo?.fechaEnvio) {
      return 'Sin fecha de envío';
    }
    return this.formatearFecha(new Date(this.articulo.fechaEnvio));
  }

  get resumenArticulo(): string {
    return this.articulo?.resumen ?? 'Sin resumen';
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
        const dia = String(day).padStart(2, '0');
        const meses = [
          'ene',
          'feb',
          'mar',
          'abr',
          'may',
          'jun',
          'jul',
          'ago',
          'sep',
          'oct',
          'nov',
          'dic',
        ];
        return `${dia} ${meses[Math.max(0, month - 1)]} ${year}`;
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
      timeZone: 'America/Bogota',
    }).format(fecha);
  }

  get documentoArticuloInicial(): { nombre: string; path: string } | null {
    if (!this.articulo || !this.articulo.observaciones || this.articulo.observaciones.length === 0) {
      return null;
    }

    const observacionesOrdenadas = [...this.articulo.observaciones].sort(
      (a, b) => new Date(a.fechaSubida).getTime() - new Date(b.fechaSubida).getTime()
    );

    const primeraObsConArchivos = observacionesOrdenadas.find(
      (obs) => obs.archivos && obs.archivos.length > 0
    );

    if (!primeraObsConArchivos || !primeraObsConArchivos.archivos || primeraObsConArchivos.archivos.length === 0) {
      return null;
    }

    const archivo = primeraObsConArchivos.archivos[0];
    return {
      nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
      path: archivo.archivoPath
    };
  }

  descargarDocumento(path: string, nombreOriginal: string): void {
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
        console.error('Error descargando el archivo:', err);
      },
    });
  }
}
