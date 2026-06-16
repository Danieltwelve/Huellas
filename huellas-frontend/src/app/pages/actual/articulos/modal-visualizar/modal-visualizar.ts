import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticuloDetalle } from '../articulos';

@Component({
  selector: 'app-modal-visualizar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-visualizar.html',
  styleUrl: './modal-visualizar.css',
})
export class ModalVisualizar {
  @Output() cerrar = new EventEmitter<void>();
  @Input() articulo: ArticuloDetalle | null = null;

  get autoresTexto(): string {
    if (!this.articulo?.autores || this.articulo.autores.length === 0) {
      return 'Sin autores';
    }
    return this.articulo.autores.map((autor) => autor.nombre).join(', ');
  }

  get temasTexto(): string {
    if (!this.articulo?.temas || this.articulo.temas.length === 0) {
      return 'Sin temas';
    }
    return this.articulo.temas.join(', ');
  }

  get palabrasClaveTexto(): string {
    return this.articulo?.palabrasClave || 'Sin palabras clave';
  }

  get fechaPublicacionTexto(): string {
    if (!this.articulo?.fechaPublicacion) {
      return 'No disponible';
    }
    const fecha = new Date(this.articulo.fechaPublicacion);
    if (isNaN(fecha.getTime())) return 'No disponible';
    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  get doiTexto(): string {
    return this.articulo?.doi || 'No disponible';
  }

  get issnTexto(): string {
    return this.articulo?.issn || 'No disponible';
  }

  get paginasTexto(): string {
    return this.articulo?.paginas || 'No disponible';
  }

  get resumenTexto(): string {
    return this.articulo?.resumen || 'Sin resumen';
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
