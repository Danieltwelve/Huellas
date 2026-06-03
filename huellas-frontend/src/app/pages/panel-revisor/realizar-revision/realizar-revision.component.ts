import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';
import {
  ArticuloRevisorDto,
  RevisoresService,
} from '../../../core/revisores/revisores.service';
import { ArticulosService } from '../../../core/articulos/articulos.service';

type RespuestaRubrica = 'si' | 'no' | null;

interface CriterioRubrica {
  texto: string;
  respuesta: RespuestaRubrica;
  sugerencias: string;
}

interface SeccionRubrica {
  numero: number;
  titulo: string;
  criterios: CriterioRubrica[];
}

function crearRubricaOficial(): SeccionRubrica[] {
  return [
    {
      numero: 1,
      titulo: 'Sobre la redacción y composición gramatical general',
      criterios: [
        {
          texto: 'Sobre la redacción y composición gramatical general',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            'El escrito está libre de errores ortográficos (se centra en los interlineados, el estilo de la tipografía, la jerarquización de títulos, sangrías, comillas, uso de citas, márgenes, espacios en blanco...)',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            'El texto está redactado en forma impersonal. Las palabras clave, el resumen, la introducción y el contenido son coherentes',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 2,
      titulo: 'Sobre el título',
      criterios: [
        {
          texto:
            '¿El título del trabajo es claro, preciso, conciso y permite la identificación del tema?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿El título indica la(s) variable(s) y/o aspecto(s) principal(es)?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 3,
      titulo: 'Sobre el resumen',
      criterios: [
        {
          texto:
            '¿El resumen de artículos originales evidencia la estructura del artículo: finalidad, metodología, resultados y recomendaciones?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto: '¿El resumen describe el(los) objetivo(s)?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿El resumen es informativo, expositivo y funciona como texto autónomo?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿Está redactado en tercera persona y su extensión es de mínimo 150 y máximo 300 palabras?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 4,
      titulo: 'Sobre las palabras clave',
      criterios: [
        {
          texto: '¿Las palabras claves identifican el área del conocimiento?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto: '¿Las palabras claves responden al tema tratado?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 5,
      titulo: 'Sobre la introducción',
      criterios: [
        {
          texto:
            '¿La introducción señala las implicaciones (impacto científico o social) del estudio?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿La introducción identifica el propósito central del autor y/o de la investigación?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿La introducción hace referencia a los antecedentes de la investigación?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿La introducción enuncia los objetivos de la investigación?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 6,
      titulo: 'Sobre el marco teórico',
      criterios: [
        {
          texto:
            '¿Comprende la revisión bibliográfica que justifica la investigación o el estudio realizado?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿Se comentan resultados de estudios que validan la relevancia y necesidad del trabajo de investigación o la reflexión realizada (categorías de presentación de artículos de la Revista Huellas)?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 7,
      titulo: 'Sobre la discusión',
      criterios: [
        {
          texto:
            '¿El artículo tiene coherencia interna (el resumen, la introducción, los objetivos, la metodología y los resultados presentados se complementan e integran adecuadamente)?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿El artículo cuenta con una base conceptual de fondo que soporte la argumentación?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿La argumentación es sólida, libre de contradicciones, comprensible lógica y psicológicamente?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿La base conceptual utilizada por el autor para argumentar su artículo es seria, de actualidad y autoridad en su área de conocimiento?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 8,
      titulo: 'Sobre las conclusiones',
      criterios: [
        {
          texto:
            '¿Las conclusiones presentadas representan un avance en la verificación, discusión, aplicación y/o posibilidades de aplicación mediante diseños teóricos, pruebas o mecanismos de intervención / práctica sobre la temática trabajada?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿El autor formula recomendaciones, precisa el alcance de los objetivos logrados, diferencia y delimita frente a los resultados de otras investigaciones?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            'Artículos de reflexión: ¿El autor analiza probables líneas adicionales de investigación y comentan las limitaciones y alcances que tiene la posición tomada?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿El autor se compromete con los resultados, la validez, confiabilidad, y veracidad tanto de proceso como de los resultados sobre el tema de investigación?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
    {
      numero: 9,
      titulo: 'Sobre el manejo de las fuentes bibliográficas',
      criterios: [
        {
          texto: '¿Es posible verificar la existencia de las fuentes?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿El escrito cita artículos de revistas indexadas y libros de investigación?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿Todas las fuentes que se listan al final, aparecen citadas en el texto?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿Todas las fuentes citadas en el texto, se listan al final del escrito?',
          respuesta: null,
          sugerencias: '',
        },
        {
          texto:
            '¿Las referencias se detallan con precisión según las Normas APA 7?',
          respuesta: null,
          sugerencias: '',
        },
      ],
    },
  ];
}

@Component({
  selector: 'app-realizar-revision',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './realizar-revision.component.html',
  styleUrls: ['./realizar-revision.component.css'],
})
export class RealizarRevisionComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);
  private readonly articulosService = inject(ArticulosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rubrica = crearRubricaOficial();
  readonly seccionesAbiertas: Record<number, boolean> = this.rubrica.reduce(
    (acumulado, seccion) => ({ ...acumulado, [seccion.numero]: true }),
    {},
  );
  articulos: ArticuloRevisorDto[] = ARTICULOS_ASIGNADOS_MOCK;
  revisionRegistradaIds = new Set<number>();
  articuloSeleccionadoId: number | null = null;
  cargandoRevision = true;
  juradoEvaluador = '';
  apruebaPublicacion: 'si' | 'no' | null = null;
  calificacion = 1;
  recomendacion: 'aceptar' | 'rechazar' = 'rechazar';
  comentarios = '';
  archivoRevision: File | null = null;
  nombreArchivoRevision = '';
  mensaje = '';
  guardandoRevision = false;
  errorRevision = '';
  mostrandoConfirmacion = false;

  async ngOnInit(): Promise<void> {
    try {
      const [perfil, data, historial] = await Promise.all([
        firstValueFrom(this.revisoresService.getPerfilRevisor()),
        firstValueFrom(this.revisoresService.getArticulosAsignadosRevisor()),
        firstValueFrom(this.revisoresService.getHistorialRevisionRevisor()),
      ]);

      this.juradoEvaluador = perfil.nombre || '';
      this.articulos = data;
      this.revisionRegistradaIds = new Set(historial.map((item) => item.articuloId));

      const queryId = Number(this.route.snapshot.queryParamMap.get('articuloId'));
      this.articuloSeleccionadoId = data.find((item) => item.id === queryId)?.id ?? data[0]?.id ?? null;
    } catch {
      this.articulos = ARTICULOS_ASIGNADOS_MOCK;
      this.articuloSeleccionadoId = this.articulos[0]?.id ?? null;
    } finally {
      this.cargandoRevision = false;
    }
  }

  get articuloSeleccionado() {
    return this.articulos.find((item) => item.id === this.articuloSeleccionadoId) ?? null;
  }

  get isRevisionEnviada(): boolean {
    const articulo = this.articuloSeleccionado;
    if (!articulo) {
      return false;
    }

    return articulo.estado === 'evaluado' || this.revisionRegistradaIds.has(articulo.id);
  }

  get rubricaCompleta(): boolean {
    return this.rubrica.every((seccion) =>
      seccion.criterios.every((criterio) => criterio.respuesta !== null),
    );
  }

  get criteriosPendientesCount(): number {
    return this.obtenerCriteriosRubrica().filter((criterio) => criterio.respuesta === null).length;
  }

  criterioEstaPendiente(criterio: CriterioRubrica): boolean {
    return criterio.respuesta === null;
  }

  toggleSeccion(numero: number): void {
    this.seccionesAbiertas[numero] = !this.seccionesAbiertas[numero];
  }

  estaSeccionAbierta(numero: number): boolean {
    return this.seccionesAbiertas[numero] ?? true;
  }

  private obtenerCriteriosRubrica(): CriterioRubrica[] {
    return this.rubrica.flatMap((seccion) => seccion.criterios);
  }

  get calificacionRubrica(): number {
    const criterios = this.obtenerCriteriosRubrica();
    const total = criterios.length;
    if (!total) {
      return 1;
    }

    const respuestasSi = criterios.filter((criterio) => criterio.respuesta === 'si').length;
    return Math.max(1, Math.min(5, Math.round((respuestasSi / total) * 5)));
  }

  get recomendacionRubrica(): 'aceptar' | 'rechazar' {
    return this.apruebaPublicacion === 'si' ? 'aceptar' : 'rechazar';
  }

  get resumenRubrica(): string {
    const criterios = this.obtenerCriteriosRubrica();
    const aprobados = criterios.filter((criterio) => criterio.respuesta === 'si').length;
    const rechazados = criterios.filter((criterio) => criterio.respuesta === 'no').length;

    const lineas: string[] = [];

    lineas.push(`Jurado evaluador: ${this.juradoEvaluador || 'Sin registrar'}`);
    if (this.articuloSeleccionado) {
      lineas.push(`Artículo: ${this.articuloSeleccionado.codigo} - ${this.articuloSeleccionado.titulo}`);
    }
    lineas.push(`Criterios aprobados: ${aprobados}/${criterios.length}`);
    lineas.push(`Criterios rechazados: ${rechazados}/${criterios.length}`);
    lineas.push(`Decisión final: ${this.recomendacionRubrica.toUpperCase()}`);
    lineas.push(`Se aprueba para publicación: ${this.apruebaPublicacion === 'si' ? 'Sí' : 'No'}`);

    return lineas.join('\n');
  }

  establecerRespuesta(criterio: CriterioRubrica, respuesta: 'si' | 'no'): void {
    criterio.respuesta = respuesta;
  }

  async enviarRevision(): Promise<void> {
    if (this.isRevisionEnviada) {
      this.errorRevision = 'La revisión ya fue registrada para este artículo. No es posible volver a evaluar.';
      return;
    }
    if (!this.articuloSeleccionado) {
      this.errorRevision = 'Selecciona un artículo para enviar la revisión.';
      return;
    }

    if (!this.rubricaCompleta) {
      this.errorRevision = 'Completa toda la rúbrica antes de enviar la revisión.';
      return;
    }

    if (this.apruebaPublicacion === null) {
      this.errorRevision = 'Debes indicar si el artículo se aprueba para publicación (Sí o No).';
      return;
    }
    this.mostrandoConfirmacion = true;
  }

  cerrarConfirmacion(): void {
    this.mostrandoConfirmacion = false;
  }

  async confirmarEnvio(): Promise<void> {
    if (!this.articuloSeleccionado) {
      return;
    }

    this.guardandoRevision = true;
    this.errorRevision = '';
    this.mensaje = '';
    this.mostrandoConfirmacion = false;

    try {
      // La decisión final sólo puede ser aceptar o rechazar, derivada de apruebaPublicacion
      const recomendacionToSend: 'aceptar' | 'rechazar' = this.apruebaPublicacion === 'si' ? 'aceptar' : 'rechazar';
      this.recomendacion = recomendacionToSend;

      const resultado = await firstValueFrom(
        this.revisoresService.enviarRevisionRevisor(this.articuloSeleccionado.id, {
          recomendacion: recomendacionToSend,
          calificacion: this.calificacionRubrica,
          comentarios: this.resumenRubrica,
          archivo: this.archivoRevision,
        }),
      );

      this.mensaje = `${resultado.message} Artículo ${this.articuloSeleccionado.codigo} revisado con recomendación ${resultado.recomendacion.toUpperCase()}.`;

      // Si el revisor marcó que se aprueba para publicación, crear observación y mover etapa a PUBLICACIÓN (id:5)
      if (this.apruebaPublicacion === 'si') {
        try {
          await firstValueFrom(
            this.articulosService.agregarObservacion(this.articuloSeleccionado.id, {
              asunto: 'Artículo aprobado para publicación',
              comentarios: `El revisor ha aprobado el artículo para publicación. Resumen:\n\n${this.resumenRubrica}`,
              etapaId: 5,
            }),
          );
        } catch (obsError) {
          console.warn('No fue posible crear una observación informativa después de la aprobación:', obsError);
        }

        try {
          await firstValueFrom(this.articulosService.moverEtapa(this.articuloSeleccionado.id, 5));
          this.mensaje += ' El artículo fue enviado al monitor/comité para la siguiente etapa (PUBLICACIÓN).';
        } catch (moveError) {
          console.warn('Error moviendo el artículo a PUBLICACIÓN:', moveError);
          this.mensaje += ' Pero no fue posible mover el artículo automáticamente a la etapa PUBLICACIÓN.';
        }
      }
      this.rubrica.forEach((seccion) => {
        seccion.criterios.forEach((criterio) => {
          criterio.respuesta = null;
          criterio.sugerencias = '';
        });
      });
      this.calificacion = 1;
      this.recomendacion = 'rechazar';
      this.apruebaPublicacion = null;
      this.comentarios = '';
      this.archivoRevision = null;
      this.nombreArchivoRevision = '';

      // Marcar localmente el artículo como evaluado para bloquear re-evaluación en todos los paneles
      if (this.articuloSeleccionado) {
        const id = this.articuloSeleccionado.id;
        this.articulos = this.articulos.map((a) => (a.id === id ? { ...a, estado: 'evaluado' } : a));
      }
      // Navegar al listado para forzar recarga del panel y reflejar el estado actualizado
      try {
        this.router.navigate(['/panel-revisor/articulos-asignados']);
      } catch (navError) {
        // no-op
      }
    } catch (error: any) {
      console.error('Error enviando revisión del revisor', error);
      const backendMessage = error?.error?.message || error?.message || null;
      if (backendMessage) {
        this.errorRevision = backendMessage;
      } else {
        this.errorRevision = 'No se pudo enviar la revisión. Verifica que el artículo siga asignado a tu cuenta.';
      }
    } finally {
      this.guardandoRevision = false;
    }
  }

  volverAtras(): void {
    this.router.navigate(['/panel-revisor/articulos-asignados']);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const archivo = input?.files?.[0] ?? null;

    this.archivoRevision = archivo;
    this.nombreArchivoRevision = archivo?.name ?? '';
  }
}
