import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../core/articulos/articulos.service';
import {
  ArticuloAutor,
  ArticulosAutorService,
} from '../../../core/articulos/articulos-autor.service';
import { normalizarNombreArchivo } from '../../../core/utils/filename.utils';

interface EtapaEditorial {
  id: number;
  nombre: string;
  fecha: string;
  descripcion: string;
  detalle: string;
  objetivos: string[];
  puntosClave: string[];
  resultadoEsperado: string;
  estado: 'completada' | 'actual' | 'pendiente';
}

interface EventoTimeline {
  fecha: string;
  titulo: string;
  descripcion: string;
  archivos: Array<{ nombre: string; path: string }>;
}

@Component({
  selector: 'app-timeline-editorial',
  standalone: true,
  templateUrl: './timeline-editorial.component.html',
  styleUrls: ['./timeline-editorial.component.css']
})
export class TimelineEditorialComponent implements OnInit {
  private readonly articulosAutorService = inject(ArticulosAutorService);
  private readonly articulosService = inject(ArticulosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  articulos: ArticuloAutor[] = [];
  articuloSeleccionadoId: number | null = null;
  selectorOpen = false;
  searchTerm = '';
  historialFiltro: 'todos' | 'observaciones' | 'certificados' | 'turnitin' = 'todos';
  flujo: ArticuloFlujo | null = null;
  cargandoLista = true;
  cargandoFlujo = false;
  error: string | null = null;
  etapaDetalleModal: EtapaEditorial | null = null;
  @ViewChild('stageDialog') stageDialog?: ElementRef<HTMLDialogElement>;

  private readonly ordenEtapas: number[] = [1, 6, 3, 4, 9, 8, 5];

  private readonly etapasBase: Array<{
    id: number;
    nombre: string;
    descripcion: string;
    detalle: string;
    objetivos: string[];
    puntosClave: string[];
    resultadoEsperado: string;
  }> = [
    {
      id: 1,
      nombre: 'Revision preliminar',
      descripcion: 'Validacion editorial inicial del envio',
      detalle:
        'El equipo editorial revisa que el artículo cumpla con los requisitos minimos de forma, alcance y documentación antes de continuar con el flujo.',
      objetivos: [
        'Verificar que el envio corresponda a la convocatoria y categoria correcta.',
        'Confirmar que el archivo y los metadatos esten completos.',
      ],
      puntosClave: ['Formato general', 'Datos del autor', 'Cumplimiento de normas básicas'],
      resultadoEsperado: 'Aceptación inicial del articulo para continuar al comite editorial.',
    },
    {
      id: 6,
      nombre: 'Comité editorial',
      descripcion: 'Evaluación y decision del comite editorial',
      detalle:
        'El comité define si el artículo avanza, requiere ajustes o se descarta, tomando en cuenta pertinencia, alcance tematico y valor editorial.',
      objetivos: [
        'Evaluar la pertinencia editorial del articulo.',
        'Definir la ruta siguiente dentro del proceso.',
      ],
      puntosClave: ['Pertinencia temática', 'Coherencia editorial', 'Decisión de avance'],
      resultadoEsperado: 'Una decisión formal del comité con ruta de seguimiento.',
    },
    {
      id: 3,
      nombre: 'Turnitin',
      descripcion: 'Validación de originalidad y similitud',
      detalle:
        'Se ejecuta la verificación de similitud para identificar coincidencias, citas mal configuradas y posibles alertas de originalidad.',
      objetivos: [
        'Validar el porcentaje de similitud del artículo.',
        'Registrar observaciones si el informe requiere correcciones.',
      ],
      puntosClave: ['Similitud total', 'Citas y referencias', 'Soporte de informe'],
      resultadoEsperado: 'Un reporte de originalidad asociado al articulo.',
    },
    {
      id: 4,
      nombre: 'Revisión por pares',
      descripcion: 'Evaluación por revisores académicos',
      detalle:
        'El artículo pasa a revisión experta para valorar rigor metodologico, aporte academico, claridad argumentativa y calidad de resultados.',
      objetivos: [
        'Obtener concepto de revisores especializados.',
        'Identificar ajustes de fondo y forma antes de la decisión final.',
      ],
      puntosClave: ['Rigor metodologico', 'Aporte académico', 'Observaciones de pares'],
      resultadoEsperado: 'Conceptos de revision que orientan la siguiente decisión editorial.',
    },
    {
      id: 9,
      nombre: 'Revisión final',
      descripcion: 'Revisión integral previa a la publicación',
      detalle:
        'Antes de publicar, se hace una ultima lectura integral para detectar detalles pendientes de estilo, consistencia o formato.',
      objetivos: [
        'Verificar que no existan pendientes editoriales.',
        'Asegurar consistencia final antes de la salida.',
      ],
      puntosClave: ['Edición final', 'Uniformidad de estilo', 'Ajustes de cierre'],
      resultadoEsperado: 'Aprobación final previa a la publicación.',
    },
    {
      id: 8,
      nombre: 'Certificación',
      descripcion: 'Verificación documental y editorial antes del cierre',
      detalle:
        'Se revisan soportes, versiones finales, autorizaciones y requisitos editoriales para dejar el expediente listo antes del cierre.',
      objetivos: [
        'Confirmar documentos obligatorios y autorizaciones.',
        'Dejar el proceso listo para el cierre documental.',
      ],
      puntosClave: ['Soportes firmados', 'Version final', 'Checklist editorial'],
      resultadoEsperado: 'Expediente certificado para pasar al cierre del flujo.',
    },
    {
      id: 5,
      nombre: 'Publicación',
      descripcion: 'Preparación y salida en volumen activo',
      detalle:
        'La versión final se prepara para su publicación oficial en el volumen activo y queda disponible para consulta pública.',
      objetivos: [
        'Liberar la versión aprobada al volumen activo.',
        'Dejar trazabilidad del cierre editorial.',
      ],
      puntosClave: ['Maquetación final', 'Publicación en volumen', 'Disponibilidad pública'],
      resultadoEsperado: 'Articulo publicado y visible en la plataforma.',
    },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const articuloId = Number(params.get('articuloId'));
      this.cargarArticulos(isNaN(articuloId) ? null : articuloId);
    });
  }

  get articuloSeleccionado(): ArticuloAutor | null {
    return this.articulos.find((articulo) => articulo.id === this.articuloSeleccionadoId) ?? null;
  }

  get filteredArticulos(): ArticuloAutor[] {
    if (!this.searchTerm) {
      return this.articulos;
    }

    const q = this.searchTerm.trim().toLowerCase();
    return this.articulos.filter((a) => {
      return (
        String(a.codigo ?? '').toLowerCase().includes(q) ||
        String(a.titulo ?? '').toLowerCase().includes(q)
      );
    });
  }

  cargarArticulos(articuloIdQuery: number | null): void {
    this.cargandoLista = true;
    this.error = null;

    this.articulosAutorService.getMisArticulos().subscribe({
      next: (articulos) => {
        this.articulos = articulos;
        this.cargandoLista = false;
        this.cdr.detectChanges();

        if (this.articulos.length === 0) {
          this.flujo = null;
          this.articuloSeleccionadoId = null;
          return;
        }

        const articuloValido =
          articuloIdQuery && this.articulos.some((articulo) => articulo.id === articuloIdQuery)
            ? articuloIdQuery
            : this.articulos[0].id;

        this.articuloSeleccionadoId = articuloValido;
        this.cargarFlujo(articuloValido);
      },
      error: (err) => {
        console.error('Error cargando artículos del autor:', err);
        this.error = 'No fue posible cargar tus artículos.';
        this.cargandoLista = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleSelector(): void {
    if (this.cargandoLista || this.articulos.length === 0) {
      return;
    }

    this.selectorOpen = !this.selectorOpen;

    if (this.selectorOpen) {
      // focus the search box when menu opens
      setTimeout(() => {
        const input = document.querySelector('.selector-menu .selector-search') as HTMLInputElement | null;
        input?.focus();
      }, 60);
    } else {
      this.searchTerm = '';
    }
  }

  seleccionarArticulo(articulo: ArticuloAutor): void {
    if (!articulo?.id) {
      this.selectorOpen = false;
      return;
    }

    // always set selected id and reload its flujo so the header updates
    this.articuloSeleccionadoId = articulo.id;
    this.selectorOpen = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { articuloId: articulo.id },
      queryParamsHandling: 'merge',
    });
    this.cargarFlujo(articulo.id);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value ?? '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.selector-card')) {
      this.selectorOpen = false;
    }
  }

  private cargarFlujo(articuloId: number): void {
    this.cargandoFlujo = true;
    this.error = null;
    this.cdr.detectChanges();

    this.articulosService.getArticuloFlujo(articuloId).subscribe({
      next: (flujo) => {
        this.flujo = flujo;
        this.cargandoFlujo = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar el seguimiento del artículo:', err);
        this.error = 'No fue posible cargar el seguimiento del artículo.';
        this.cargandoFlujo = false;
        this.cdr.detectChanges();
      },
    });
  }

  get titulo(): string {
    if (this.flujo) {
      return `${this.flujo.codigo} - ${this.flujo.titulo}`;
    }

    if (this.articuloSeleccionado) {
      return `${this.articuloSeleccionado.codigo} - ${this.articuloSeleccionado.titulo}`;
    }

    return 'Selecciona un artículo para ver su seguimiento';
  }

  get etapas(): EtapaEditorial[] {
    if (!this.flujo) {
      return [];
    }

    const etapaActualId = this.flujo.etapaActual?.id ?? 1;
    const indiceEtapaActual = this.ordenEtapas.indexOf(etapaActualId);
    const historialPorEtapa = new Map<number, string>();

    for (const historial of this.flujo.historialEtapas ?? []) {
      if (!historialPorEtapa.has(historial.etapaId)) {
        historialPorEtapa.set(historial.etapaId, historial.fechaInicio);
      }
    }

    return this.etapasBase.map((etapa) => {
      const indiceEtapa = this.ordenEtapas.indexOf(etapa.id);
      const estado: 'completada' | 'actual' | 'pendiente' =
        indiceEtapa !== -1 && indiceEtapaActual !== -1 && indiceEtapa < indiceEtapaActual
          ? 'completada'
          : etapa.id === etapaActualId
            ? 'actual'
            : 'pendiente';

      const fechaRegistrada = historialPorEtapa.get(etapa.id);

      return {
        id: etapa.id,
        nombre: etapa.nombre,
        descripcion: etapa.descripcion,
        detalle: etapa.detalle,
        objetivos: etapa.objetivos,
        puntosClave: etapa.puntosClave,
        resultadoEsperado: etapa.resultadoEsperado,
        estado,
        fecha: fechaRegistrada ? this.formatearFechaCorta(fechaRegistrada) : 'Por definir',
      };
    });
  }

  abrirDetalleEtapa(etapa: EtapaEditorial): void {
    if (etapa.estado === 'pendiente') {
      return;
    }

    this.etapaDetalleModal = etapa;
    queueMicrotask(() => {
      const dialog = this.stageDialog?.nativeElement;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    });
  }

  cerrarDetalleEtapa(): void {
    this.etapaDetalleModal = null;
    const dialog = this.stageDialog?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.etapaDetalleModal) {
      this.cerrarDetalleEtapa();
    }
  }

  setHistorialFiltro(filtro: 'todos' | 'observaciones' | 'certificados' | 'turnitin'): void {
    this.historialFiltro = filtro;
  }

  get historial(): EventoTimeline[] {
    if (!this.flujo?.observaciones?.length) {
      return [];
    }

    return [...this.flujo.observaciones]
      .sort((a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime())
      .map((obs: ObservacionBackend) => ({
        fecha: this.formatearFechaLarga(obs.fechaSubida),
        titulo: (obs.asunto || 'Observacion editorial')
          .replace(/revisi[oó]n por pares:\s*ajustes/gi, 'Revisión por pares: ACEPTAR')
          .replace(/revisi[oó]n por pares completada:\s*ajustes/gi, 'Revisión por pares completada: APROBADO'),
        descripcion: this.formatearComentario(obs.comentarios) || 'Sin comentarios adicionales.',
        archivos: obs.archivos.map((archivo) => ({
          nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
          path: archivo.archivoPath,
        })),
      }));
  }

  get historialFiltrado(): EventoTimeline[] {
    const historial = this.historial;

    if (this.historialFiltro === 'todos') {
      return historial;
    }

    return historial.filter((evento) => this.obtenerCategoriaHistorial(evento) === this.historialFiltro);
  }

  get progreso(): number {
    const etapas = this.etapas;
    if (!etapas || etapas.length === 0) {
      return 0;
    }

    const completadas = etapas.filter((etapa) => etapa.estado === 'completada').length;
    return Math.round((completadas / etapas.length) * 100);
  }

  get siguientePaso(): EtapaEditorial | null {
    return this.etapas.find((etapa) => etapa.estado === 'actual') ?? null;
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';

    if (!filename) {
      return;
    }

    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = normalizarNombreArchivo(nombreOriginal);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar archivo:', err);
      },
    });
  }

  private formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Por definir';
    }

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatearFechaLarga(fechaIso: string): string {
    const valor = (fechaIso ?? '').trim();
    if (!valor) {
      return 'Sin fecha';
    }

    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatearComentario(comentario?: string | null): string {
    if (!comentario) {
      return '';
    }

    // Cortar el comentario si contiene la sección de la rúbrica detallada (1. Sobre...)
    let resumen = comentario;
    const indexSobre = comentario.search(/(?:\r?\n)?\d+\.\s+Sobre/i);
    if (indexSobre !== -1) {
      resumen = comentario.substring(0, indexSobre);
    } else {
      const indexSobreSinNumero = comentario.search(/(?:\r?\n)?Sobre la redacción/i);
      if (indexSobreSinNumero !== -1) {
        resumen = comentario.substring(0, indexSobreSinNumero);
      }
    }

    // Formatear líneas introduciendo saltos de línea antes de campos clave si vienen pegados
    resumen = resumen
      .replace(/\s*(Calificación:)/gi, '\n$1')
      .replace(/\s*(Recomendación:)/gi, '\n$1')
      .replace(/\s*(Comentarios:)/gi, '\n$1')
      .replace(/\s*(Jurado evaluador:)/gi, '\n$1')
      .replace(/\s*(Artículo:)/gi, '\n$1')
      .replace(/\s*(Recomendación seleccionada:)/gi, '\n$1')
      .replace(/\s*(Se aprueba para publicación:)/gi, '\n$1')
      .replace(/\s*(Criterios aprobados:)/gi, '\n$1')
      .replace(/\s*(Criterios rechazados:)/gi, '\n$1')
      .trim();

    // Mapear Ajustes -> Aceptar/Aprobado para visualización consistente
    resumen = resumen
      .replace(/Recomendación:\s*AJUSTES/gi, 'Recomendación: ACEPTAR')
      .replace(/Recomendación seleccionada:\s*ajustes/gi, 'Recomendación seleccionada: ACEPTAR')
      .replace(/Decisión:\s*AJUSTES/gi, 'Decisión: ACEPTAR')
      .replace(/Decisión final:\s*AJUSTES/gi, 'Decisión final: ACEPTAR');

    return resumen;
  }

  private normalizarBusqueda(texto: string): string {
    return (texto ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private obtenerCategoriaHistorial(evento: EventoTimeline): 'observaciones' | 'certificados' | 'turnitin' {
    const texto = this.normalizarBusqueda(
      [evento.titulo, evento.descripcion, ...evento.archivos.map((archivo) => archivo.nombre)].join(' '),
    );

    if (texto.includes('turnitin') || texto.includes('similitud')) {
      return 'turnitin';
    }

    if (texto.includes('certificado') || texto.includes('certificacion')) {
      return 'certificados';
    }

    return 'observaciones';
  }
}

