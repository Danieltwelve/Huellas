import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface DocumentoRubrica {
  titulo: string;
  formato: string;
  tipo: 'metodologia' | 'redaccion' | 'pertinencia' | 'etica';
  version: string;
  fechaActualizacion: string;
  descripcion: string;
  archivo: string;
}

type FiltroRubrica = 'todas' | 'metodologia' | 'redaccion' | 'pertinencia' | 'etica';

@Component({
  selector: 'app-rubricas-comite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rubricas-comite.component.html',
  styleUrl: './rubricas-comite.component.css',
})
export class RubricasComiteComponent {
  filtroActual: FiltroRubrica = 'todas';

  readonly documentos: DocumentoRubrica[] = [
    {
      titulo: 'Rúbrica de evaluación - Comité Editorial',
      formato: 'Word',
      tipo: 'metodologia',
      version: 'v1.0',
      fechaActualizacion: '17/06/2026',
      descripcion: 'Formato oficial para la evaluación del Comité Editorial.',
      archivo: '/rubrica-comite-editorial.docx',
    },
  ];

  setFiltro(tipo: FiltroRubrica): void {
    this.filtroActual = tipo;
  }

  get documentosFiltrados(): DocumentoRubrica[] {
    if (this.filtroActual === 'todas') {
      return this.documentos;
    }

    return this.documentos.filter((doc) => doc.tipo === this.filtroActual);
  }

  getEtiquetaTipo(tipo: DocumentoRubrica['tipo']): string {
    if (tipo === 'metodologia') {
      return 'Metodología';
    }

    if (tipo === 'redaccion') {
      return 'Redacción';
    }

    if (tipo === 'pertinencia') {
      return 'Pertinencia';
    }

    return 'Ética';
  }
}
