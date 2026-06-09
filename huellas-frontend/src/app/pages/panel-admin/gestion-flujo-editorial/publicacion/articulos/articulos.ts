// articulos.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import {
  ArticuloPublicable,
  ArticulosService,
} from '../../../../../core/articulos/articulos.service';

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './articulos.html',
  styleUrls: ['./articulos.css'],
})
export class Articulos implements OnInit {
  private articulosService = inject(ArticulosService);

  @Input() seleccionadosIds: number[] = [];
  @Output() seleccionCambiada = new EventEmitter<number[]>();

  articulos: ArticuloPublicable[] = [];
  loading = true;
  error = '';

  readonly MAX_SELECCION = 10;

  ngOnInit(): void {
    this.cargarArtículos();
  }

  cargarArtículos(): void {
    this.loading = true;
    this.articulosService.getArticulosEnPublicacion().subscribe({
      next: (articulos) => {
        this.articulos = articulos;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los artículos disponibles.';
        this.loading = false;
      },
    });
  }

  // Getter para obtener los objetos completos de los artículos seleccionados
  get selectedArticulosList(): ArticuloPublicable[] {
    if (!this.articulos.length) return [];
    return this.articulos.filter((art) => this.seleccionadosIds.includes(art.id));
  }

  isSeleccionado(id: number): boolean {
    return this.seleccionadosIds.includes(id);
  }

  get totalSeleccionados(): number {
    return this.seleccionadosIds.length;
  }

  get cuposRestantes(): number {
    return Math.max(0, this.MAX_SELECCION - this.totalSeleccionados);
  }

  toggleArticulo(id: number): void {
    let nuevos = [...this.seleccionadosIds];
    const idx = nuevos.indexOf(id);
    if (idx !== -1) {
      nuevos.splice(idx, 1);
    } else {
      if (nuevos.length < this.MAX_SELECCION) {
        nuevos.push(id);
      } else {
        // Si ya llegó al límite, no hace nada
        return;
      }
    }
    this.seleccionCambiada.emit(nuevos);
  }

  recargarArticulos(): void {
    this.cargarArtículos();
  }

  trackArticulo(_index: number, articulo: ArticuloPublicable): number {
    return articulo.id;
  }
}
