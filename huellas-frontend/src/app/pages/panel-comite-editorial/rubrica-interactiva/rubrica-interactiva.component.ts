import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RubricaItem {
  id: string;
  descripcion: string;
  cumple: boolean | null; // true = Sí, false = No, null = Sin seleccionar
}

export interface RubricaCategoria {
  id: string;
  nombre: string;
  items: RubricaItem[];
  sugerencias: string;
}

export interface ResultadoRubrica {
  completo: boolean;
  observacionCompilada: string;
  respuestas: { id: string; cumple: boolean | null }[];
  observacionesGenerales: string;
}

@Component({
  selector: 'app-rubrica-interactiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rubrica-interactiva.component.html',
  styleUrl: './rubrica-interactiva.component.css',
})
export class RubricaInteractivaComponent implements OnInit {
  @Input() nombreEvaluador = '';
  @Input() articuloTitulo = '';
  @Output() rubricaCompleta = new EventEmitter<ResultadoRubrica>();

  observacionesGenerales = '';
  confirmada = false;

  categorias: RubricaCategoria[] = [
    {
      id: 'pertinencia_originalidad',
      nombre: 'PERTINENCIA Y ORIGINALIDAD',
      sugerencias: '',
      items: [
        {
          id: 'pertinencia_1',
          descripcion: '¿El tema del artículo es relevante para la revista y su comunidad científica, aporta un enfoque novedoso o un avance significativo en el área y presenta una justificación clara y bien argumentada?',
          cumple: null,
        },
      ],
    },
    {
      id: 'estructura_organizacion',
      nombre: 'ESTRUCTURA Y ORGANIZACIÓN',
      sugerencias: '',
      items: [
        {
          id: 'estructura_1',
          descripcion: 'Cumple con las secciones fundamentales de un artículo científico: título, resumen, introducción, metodología, resultados, discusión, conclusiones y bibliografía.',
          cumple: null,
        },
      ],
    },
    {
      id: 'resumen_palabras',
      nombre: 'RESUMEN Y PALABRAS CLAVE',
      sugerencias: '',
      items: [
        {
          id: 'resumen_1',
          descripcion: 'Resume con claridad el objetivo, metodología, resultados y conclusiones.',
          cumple: null,
        },
        {
          id: 'resumen_2',
          descripcion: 'Es conciso y refleja adecuadamente el contenido del artículo.',
          cumple: null,
        },
        {
          id: 'resumen_3',
          descripcion: 'Contiene palabras clave representativas y pertinentes.',
          cumple: null,
        },
      ],
    },
    {
      id: 'marco_teorico',
      nombre: 'MARCO TEÓRICO EN LA INTRODUCCIÓN',
      sugerencias: '',
      items: [
        {
          id: 'marco_1',
          descripcion: 'La introducción presenta una fundamentación teórica sólida y actualizada.',
          cumple: null,
        },
        {
          id: 'marco_2',
          descripcion: 'Demuestra un conocimiento adecuado en el área.',
          cumple: null,
        },
        {
          id: 'marco_3',
          descripcion: 'Relaciona de manera pertinente los conceptos y teorías con el problema investigado.',
          cumple: null,
        },
      ],
    },
    {
      id: 'metodologia',
      nombre: 'METODOLOGÍA EN LA INTRODUCCIÓN',
      sugerencias: '',
      items: [
        {
          id: 'metodologia_1',
          descripcion: 'Es clara, detallada y replicable.',
          cumple: null,
        },
        {
          id: 'metodologia_2',
          descripcion: 'Describe adecuadamente el tipo de estudio, población/muestra, técnicas e instrumentos de recolección de datos y análisis.',
          cumple: null,
        },
        {
          id: 'metodologia_3',
          descripcion: 'Justifica la elección de la metodología utilizada.',
          cumple: null,
        },
      ],
    },
    {
      id: 'resultados',
      nombre: 'RESULTADOS',
      sugerencias: '',
      items: [
        {
          id: 'resultados_1',
          descripcion: 'Presenta un alcance general de los resultados de manera clara y comprensible.',
          cumple: null,
        },
        {
          id: 'resultados_2',
          descripcion: 'Explica la relevancia y las implicaciones de los resultados obtenidos.',
          cumple: null,
        },
      ],
    },
    {
      id: 'redaccion_estilo',
      nombre: 'REDACCIÓN Y ESTILO',
      sugerencias: '',
      items: [
        {
          id: 'redaccion_1',
          descripcion: 'La redacción es clara, precisa y académica.',
          cumple: null,
        },
        {
          id: 'redaccion_2',
          descripcion: 'Se mantiene la coherencia y cohesión textual.',
          cumple: null,
        },
        {
          id: 'redaccion_3',
          descripcion: 'Está libre de errores ortográficos, gramaticales y de puntuación.',
          cumple: null,
        },
      ],
    },
  ];

  ngOnInit(): void {}

  get totalItems(): number {
    return this.categorias.reduce((acc, cat) => acc + cat.items.length, 0);
  }

  get itemsRespondidos(): number {
    return this.categorias.reduce(
      (acc, cat) => acc + cat.items.filter((item) => item.cumple !== null).length,
      0
    );
  }

  get todoContestado(): boolean {
    return this.itemsRespondidos === this.totalItems;
  }

  alCambiarSeleccion(): void {
    // Si cambia algún valor, desconfirmamos para obligar a que se vuelva a dar click en Confirmar
    this.confirmada = false;
    this.emitirEstado(false);
  }

  completarEvaluacion(): void {
    if (!this.todoContestado) return;
    this.confirmada = true;
    this.emitirEstado(true);
  }

  reiniciar(): void {
    this.categorias.forEach((cat) => {
      cat.sugerencias = '';
      cat.items.forEach((item) => {
        item.cumple = null;
      });
    });
    this.observacionesGenerales = '';
    this.confirmada = false;
    this.emitirEstado(false);
  }

  private emitirEstado(isConfirmado: boolean): void {
    const respuestas = this.categorias.flatMap((cat) =>
      cat.items.map((item) => ({ id: item.id, cumple: item.cumple }))
    );

    const resultado: ResultadoRubrica = {
      completo: isConfirmado && this.todoContestado,
      observacionCompilada: this.generarReporteCompilado(),
      respuestas,
      observacionesGenerales: this.observacionesGenerales,
    };

    this.rubricaCompleta.emit(resultado);
  }

  private generarReporteCompilado(): string {
    let report = `==================================================\n`;
    report += `    RÚBRICA DE EVALUACIÓN - COMITÉ EDITORIAL\n`;
    report += `==================================================\n\n`;
    report += `Nombre del evaluador: ${this.nombreEvaluador || 'No especificado'}\n`;
    report += `Artículo: ${this.articuloTitulo || 'No especificado'}\n`;
    report += `Fecha de evaluación: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    report += `--------------------------------------------------\n`;
    report += `CRITERIOS DE EVALUACIÓN:\n`;
    report += `--------------------------------------------------\n\n`;

    this.categorias.forEach((cat, indexCat) => {
      report += `${indexCat + 1}. ${cat.nombre}\n`;
      cat.items.forEach((item) => {
        const checkChar =
          item.cumple === true
            ? '[X] Sí  [ ] No'
            : item.cumple === false
            ? '[ ] Sí  [X] No'
            : '[ ] Sí  [ ] No';
        report += `   - ${item.descripcion}\n`;
        report += `     Cumple: ${checkChar}\n`;
      });
      if (cat.sugerencias && cat.sugerencias.trim()) {
        report += `   Sugerencias: ${cat.sugerencias.trim()}\n`;
      } else {
        report += `   Sugerencias: Sin observaciones adicionales\n`;
      }
      report += `\n`;
    });

    report += `==================================================\n`;
    report += `OBSERVACIONES GENERALES:\n`;
    report += `==================================================\n`;
    report += `${this.observacionesGenerales || 'Ninguna'}\n`;

    return report;
  }
}
