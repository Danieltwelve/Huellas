import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  ArticuloResumenBackend,
  ArticulosService,
} from '../../../core/articulos/articulos.service';
import { Router } from '@angular/router';

interface ArticuloListado {
  id: number;
  codigo: string;
  titulo: string;
  etapaActual: string;
  fechaAceptacion: string;
  tiempoProceso: string;
  claseEtapa: string;
}

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './articulos.html',
  styleUrl: './articulos.scss',
})
export class Articulos implements OnInit {
  private articulosService = inject(ArticulosService);
  private router = inject(Router);

  searchTerm = '';

  articulos: ArticuloListado[] = [];
  filteredArticulos: ArticuloListado[] = [];

  ngOnInit(): void {
    this.articulosService.getResumenArticulos().subscribe({
      next: (response) => {
        this.articulos = response.map((articulo) => this.mapArticulo(articulo));
        this.applySearch();
      },
      error: (error) => {
        this.articulos = [];
        this.filteredArticulos = [];
        console.error('Error al cargar el resumen de articulos:', error);
      },
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applySearch();
  }

  private applySearch(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      this.filteredArticulos = [...this.articulos];
      return;
    }

    this.filteredArticulos = this.articulos.filter((articulo) => {
      const searchableText = [
        articulo.codigo,
        articulo.titulo,
        articulo.etapaActual,
        articulo.fechaAceptacion,
        articulo.tiempoProceso,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedTerm);
    });
  }

  private mapArticulo(articulo: ArticuloResumenBackend): ArticuloListado {
    const etapaActual = articulo.etapa_nombre?.trim() || 'Desconocida';
    const fecha = this.parseFecha(articulo.fecha_inicio);

    return {
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapaActual,
      fechaAceptacion: this.formatFecha(fecha),
      tiempoProceso: this.calcularTiempoProceso(fecha),
      claseEtapa: this.getClaseEtapa(etapaActual),
    };
  }

  private parseFecha(fechaIso: string | null): Date | null {
    if (!fechaIso) {
      return null;
    }

    const fecha = new Date(fechaIso);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private formatFecha(fecha: Date | null): string {
    if (!fecha) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  }

  private calcularTiempoProceso(fecha: Date | null): string {
    if (!fecha) {
      return '-';
    }

    const diferenciaMs = Date.now() - fecha.getTime();
    const dias = Math.max(0, Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)));
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }

  private getClaseEtapa(etapa: string): string {
    const etapaNormalizada = etapa
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (etapaNormalizada.includes('revision preliminar')) {
      return 'stage--revision-preliminar';
    }

    if (etapaNormalizada.includes('recepcion')) {
      return 'stage--recepcion';
    }

    if (etapaNormalizada.includes('turniting') || etapaNormalizada.includes('turnitin')) {
      return 'stage--turniting';
    }

    if (etapaNormalizada.includes('revision por pares')) {
      return 'stage--revision-pares';
    }

    if (etapaNormalizada.includes('publicacion')) {
      return 'stage--publicacion';
    }

    return '';
  }

  verArticulo(id: number): void {
    this.router.navigate(['/flujo-trabajo-articulo', id]);
  }
}
