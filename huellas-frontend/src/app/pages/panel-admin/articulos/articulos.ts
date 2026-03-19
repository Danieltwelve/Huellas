import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface ArticuloListado {
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
export class Articulos {
  searchTerm = '';

  readonly articulos: ArticuloListado[] = [
    {
      codigo: 'FERH 226',
      titulo: 'HACIA UNA EDUCACION AMBIENTAL SIGNIFICATIVA ARTICULACION DE LA NEURODIDACTICA Y EL DESARROLLO DE LA INTELIGENCIA NATURALISTA.',
      etapaActual: 'REVISION PRELIMINAR',
      fechaAceptacion: '02/10/2026',
      tiempoProceso: '50 dias',
      claseEtapa: 'stage--revision-preliminar',
    },
    {
      codigo: 'FERH 226',
      titulo: 'HACIA UNA EDUCACION AMBIENTAL SIGNIFICATIVA ARTICULACION DE LA NEURODIDACTICA Y EL DESARROLLO DE LA INTELIGENCIA NATURALISTA.',
      etapaActual: 'RECEPCION',
      fechaAceptacion: '02/8/2025',
      tiempoProceso: '10 dias',
      claseEtapa: 'stage--recepcion',
    },
    {
      codigo: 'FERH 226',
      titulo: 'HACIA UNA EDUCACION AMBIENTAL SIGNIFICATIVA ARTICULACION DE LA NEURODIDACTICA Y EL DESARROLLO DE LA INTELIGENCIA NATURALISTA.',
      etapaActual: 'TURNITING',
      fechaAceptacion: '02/9/2024',
      tiempoProceso: '80 dias',
      claseEtapa: 'stage--turniting',
    },
    {
      codigo: 'FERH 226',
      titulo: 'HACIA UNA EDUCACION AMBIENTAL SIGNIFICATIVA ARTICULACION DE LA NEURODIDACTICA Y EL DESARROLLO DE LA INTELIGENCIA NATURALISTA.',
      etapaActual: 'REVISION POR PARES',
      fechaAceptacion: '02/10/2023',
      tiempoProceso: '180 dias',
      claseEtapa: 'stage--revision-pares',
    },
    {
      codigo: 'FERH 226',
      titulo: 'HACIA UNA EDUCACION AMBIENTAL SIGNIFICATIVA ARTICULACION DE LA NEURODIDACTICA Y EL DESARROLLO DE LA INTELIGENCIA NATURALISTA.',
      etapaActual: 'PUBLICACION',
      fechaAceptacion: '02/10/2025',
      tiempoProceso: '30 dias',
      claseEtapa: 'stage--publicacion',
    },
  ];

  filteredArticulos: ArticuloListado[] = [...this.articulos];

  onSearch(term: string): void {
    this.searchTerm = term;

    const normalizedTerm = term.trim().toLowerCase();

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
}
