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
      titulo: 'Plantilla de rúbrica de evaluación',
      formato: 'PDF',
      tipo: 'metodologia',
      version: 'v2.1',
      fechaActualizacion: '14/04/2026',
      descripcion: 'Documento base para calificación de criterios editoriales.',
      archivo: '/rubricas/plantilla-rubrica-evaluacion.pdf',
    },
    {
      titulo: 'Guía de diligenciamiento de rúbrica',
      formato: 'Word',
      tipo: 'redaccion',
      version: 'v1.4',
      fechaActualizacion: '14/04/2026',
      descripcion: 'Instrucciones de uso y criterios de evaluación para comité.',
      archivo: '/rubricas/guia-rubrica-evaluacion.doc',
    },
    {
      titulo: 'Checklist de pertinencia temática',
      formato: 'PDF',
      tipo: 'pertinencia',
      version: 'v1.0',
      fechaActualizacion: '14/04/2026',
      descripcion: 'Validación de alineación temática y aporte al enfoque de la revista.',
      archivo: '/rubricas/plantilla-rubrica-evaluacion.pdf',
    },
    {
      titulo: 'Formato de revisión ética',
      formato: 'Word',
      tipo: 'etica',
      version: 'v1.2',
      fechaActualizacion: '14/04/2026',
      descripcion: 'Guía de criterios de integridad, citación y conflictos de interés.',
      archivo: '/rubricas/guia-rubrica-evaluacion.doc',
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
