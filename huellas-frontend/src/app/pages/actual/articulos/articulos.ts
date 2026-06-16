import { ModalVisualizar } from './modal-visualizar/modal-visualizar';
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ObservacionesService,
  UltimaVersionAutorResponse,
} from './../../../core/observaciones/observaciones.service';
import { environment } from '../../../../environments/environments';

export interface ArticuloDetalle {
  id: number;
  titulo: string;
  resumen: string;
  autores: Array<{ id: number; nombre: string; correo: string }>;
  temas: string[];
  palabrasClave: string;
  doi: string | null;
  issn: string | null;
  paginas: string | null;
  fechaPublicacion: string | null;
}

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [CommonModule, ModalVisualizar],
  templateUrl: './articulos.html',
  styleUrls: ['./articulos.css'],
})
export class Articulos {
  @Input() articulos: ArticuloDetalle[] = [];

  private observacionesService = inject(ObservacionesService);
  public descargando = new Set<number>();

  articuloSeleccionado: ArticuloDetalle | null = null;
  mostrarModal = false;

  descargarUltimaVersion(articulo: ArticuloDetalle): void {
    if (this.descargando.has(articulo.id)) return;
    this.descargando.add(articulo.id);

    this.observacionesService.getUltimaVersionAutor(articulo.id).subscribe({
      next: (respuesta) => {
        // Extraer solo el nombre del archivo de la ruta (ej: "uploads/articulos/12345.pdf" -> "12345.pdf")
        const filename = respuesta.archivo.path.split('/').pop();
        if (!filename) {
          console.error('No se pudo obtener el nombre del archivo');
          this.descargando.delete(articulo.id);
          return;
        }
        // Construir la URL de descarga (endpoint público)
        const url = `${environment.apiUrlBackend}/articulos/descargar/${filename}`;
        // Forzar la descarga con el nombre original usando fetch + blob
        fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error('Error al descargar');
            return response.blob();
          })
          .then((blob) => {
            const link = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            link.href = objectUrl;
            link.download = respuesta.archivo.nombreOriginal;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
          })
          .catch((err) => console.error('Error al descargar archivo', err))
          .finally(() => this.descargando.delete(articulo.id));
      },
      error: (err) => {
        console.error(`Error al obtener la última versión del artículo ${articulo.id}:`, err);
        this.descargando.delete(articulo.id);
        // Opcional: mostrar un mensaje al usuario (ej. usando un toast)
      },
    });
  }

  abrirModal(articulo: ArticuloDetalle): void {
    this.articuloSeleccionado = articulo;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.articuloSeleccionado = null;
    this.mostrarModal = false;
  }
}
