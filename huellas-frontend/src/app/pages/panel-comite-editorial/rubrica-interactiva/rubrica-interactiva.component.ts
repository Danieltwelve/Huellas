import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface CriterioRubrica {
  id: number;
  nombre: string;
  descripcion: string;
  puntajeMaximo: number;
  puntajeOtorgado: number;
  observaciones: string;
}

interface ResultadoRubrica {
  criterios: CriterioRubrica[];
  puntajeTotalOtorgado: number;
  puntajeTotalPosible: number;
  porcentajeAlcanzado: number;
  recomendacion: 'aceptar' | 'rechazar' | 'pendiente';
}

@Component({
  selector: 'app-rubrica-interactiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rubrica-interactiva.component.html',
  styleUrl: './rubrica-interactiva.component.css',
})
export class RubricaInteractivaComponent implements OnInit {
  @Input() articuloTitulo = '';
  @Output() rubricaCompleta = new EventEmitter<ResultadoRubrica>();

  criterios: CriterioRubrica[] = [
    {
      id: 1,
      nombre: 'Originalidad y aporte científico',
      descripcion: 'El artículo presenta un aporte original y significativo a la disciplina',
      puntajeMaximo: 20,
      puntajeOtorgado: 0,
      observaciones: '',
    },
    {
      id: 2,
      nombre: 'Coherencia metodológica',
      descripcion: 'Los métodos utilizados son apropiados y están bien explicados',
      puntajeMaximo: 20,
      puntajeOtorgado: 0,
      observaciones: '',
    },
    {
      id: 3,
      nombre: 'Rigor en resultados y discusión',
      descripcion: 'Los resultados son claros y la discusión es profunda y coherente',
      puntajeMaximo: 20,
      puntajeOtorgado: 0,
      observaciones: '',
    },
    {
      id: 4,
      nombre: 'Cumplimiento de normas editoriales',
      descripcion: 'El artículo cumple con normas de formato, citación y estilo',
      puntajeMaximo: 20,
      puntajeOtorgado: 0,
      observaciones: '',
    },
    {
      id: 5,
      nombre: 'Pertinencia temática para la revista',
      descripcion: 'El tema es relevante y alineado con el scope de la revista',
      puntajeMaximo: 20,
      puntajeOtorgado: 0,
      observaciones: '',
    },
  ];

  get resultado(): ResultadoRubrica {
    const puntajeTotalOtorgado = this.criterios.reduce((sum, c) => sum + c.puntajeOtorgado, 0);
    const puntajeTotalPosible = this.criterios.reduce((sum, c) => sum + c.puntajeMaximo, 0);
    const porcentajeAlcanzado = Math.round((puntajeTotalOtorgado / puntajeTotalPosible) * 100);

    let recomendacion: 'aceptar' | 'rechazar' | 'pendiente' = 'pendiente';
    if (porcentajeAlcanzado >= 70) {
      recomendacion = 'aceptar';
    } else if (porcentajeAlcanzado < 50) {
      recomendacion = 'rechazar';
    }

    return {
      criterios: this.criterios,
      puntajeTotalOtorgado,
      puntajeTotalPosible,
      porcentajeAlcanzado,
      recomendacion,
    };
  }

  ngOnInit(): void {}

  actualizarPuntaje(criterioId: number, nuevoValor: number): void {
    const criterio = this.criterios.find((c) => c.id === criterioId);
    if (criterio) {
      criterio.puntajeOtorgado = Math.max(0, Math.min(nuevoValor, criterio.puntajeMaximo));
    }
  }

  actualizarObservacion(criterioId: number, observacion: string): void {
    const criterio = this.criterios.find((c) => c.id === criterioId);
    if (criterio) {
      criterio.observaciones = observacion;
    }
  }

  getColorBarra(porcentaje: number): string {
    if (porcentaje >= 70) return 'success';
    if (porcentaje >= 50) return 'warning';
    return 'danger';
  }

  getRecomendacionTexto(): string {
    const { recomendacion, porcentajeAlcanzado } = this.resultado;

    if (recomendacion === 'aceptar') {
      return `✓ Artículo APROBADO (${porcentajeAlcanzado}%)`;
    } else if (recomendacion === 'rechazar') {
      return `✗ Artículo RECHAZADO (${porcentajeAlcanzado}%)`;
    } else {
      return `? Evaluar más criterios (${porcentajeAlcanzado}%)`;
    }
  }

  completarEvaluacion(): void {
    this.rubricaCompleta.emit(this.resultado);
  }

  reiniciar(): void {
    this.criterios.forEach((c) => {
      c.puntajeOtorgado = 0;
      c.observaciones = '';
    });
  }
}
