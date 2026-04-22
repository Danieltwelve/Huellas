import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../core/articulos/articulos.service';
import {
  ArticuloAutor,
  ArticulosAutorService,
  NotificacionAutorBackend,
} from '../../../core/articulos/articulos-autor.service';
import { normalizarNombreArchivo } from '../../../core/utils/filename.utils';

interface EtapaVista {
  id: number;
  titulo: string;
  descripcion: string;
  estado: 'completada' | 'actual' | 'pendiente';
  fecha: string;
}

interface EscenarioAutor {
  tipo: 'alerta' | 'accion' | 'informacion' | 'exito';
  titulo: string;
  detalle: string;
  acciones: string[];
}

@Component({
  selector: 'app-detalle-articulo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-articulo.component.html',
  styleUrls: ['./detalle-articulo.component.css'],
})
export class DetalleArticuloComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly articulosService = inject(ArticulosService);
  private readonly articulosAutorService = inject(ArticulosAutorService);

  loading = true;
  error: string | null = null;

  articulo: ArticuloFlujo | null = null;
  resumenAutor: ArticuloAutor | null = null;
  notificacionesArticulo: NotificacionAutorBackend[] = [];

  archivoCorreccion: File | null = null;
  nombreArchivoCorreccion = '';
  comentariosCorreccion = '';
  enviandoCorreccion = false;
  mensajeCorreccion: string | null = null;
  errorCorreccion: string | null = null;

  private readonly etapasBase: Array<{ id: number; titulo: string; descripcion: string }> = [
    { id: 1, titulo: 'Revisión preliminar', descripcion: 'Validación editorial inicial del envío' },
    { id: 6, titulo: 'Comité Editorial', descripcion: 'Revisión del artículo por un miembro del comité' },
    { id: 3, titulo: 'Turniting', descripcion: 'Validación de originalidad y similitud' },
    { id: 4, titulo: 'Revisión por pares', descripcion: 'Evaluación por revisores académicos' },
    { id: 8, titulo: 'Certificación', descripcion: 'Verificación documental y editorial' },
    { id: 9, titulo: 'Revisión final', descripcion: 'Revisión integral previa a publicación' },
    { id: 5, titulo: 'Publicación', descripcion: 'Preparación y salida en volumen activo' },
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (isNaN(id) || id <= 0) {
        this.error = 'ID de artículo inválido.';
        this.loading = false;
        return;
      }

      this.cargarDetalle(id);
    });
  }

  get etapaActualLabel(): string {
    if (!this.articulo?.etapaActual?.nombre) {
      return 'SIN ETAPA';
    }

    return this.articulo.etapaActual.nombre.toUpperCase();
  }

  get tituloArticulo(): string {
    if (!this.articulo) {
      return 'Cargando artículo...';
    }

    return `${this.articulo.codigo} - ${this.articulo.titulo}`;
  }

  get autoresTexto(): string {
    const autores = this.articulo?.autores ?? [];
    return autores.length ? autores.map((item) => item.nombre).join(', ') : 'Sin autores';
  }

  get temasTexto(): string {
    const temas = this.articulo?.temas ?? [];
    return temas.length ? temas.join(', ') : 'Sin temas';
  }

  get palabrasClaveTexto(): string {
    const palabras = this.articulo?.palabrasClave ?? [];
    return palabras.length ? palabras.join(', ') : 'Sin palabras clave';
  }

  get fechaEnvioTexto(): string {
    if (!this.articulo?.fechaEnvio) {
      return 'Sin fecha registrada';
    }

    const fecha = new Date(this.articulo.fechaEnvio);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha registrada';
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    }).format(fecha);
  }

  get etapas(): EtapaVista[] {
    if (!this.articulo) {
      return [];
    }

    const fechasPorEtapa = new Map<number, string>();
    for (const h of this.articulo.historialEtapas ?? []) {
      if (!fechasPorEtapa.has(h.etapaId)) {
        fechasPorEtapa.set(h.etapaId, h.fechaInicio);
      }
    }

    return this.etapasBase.map((etapa) => {
      const fecha = fechasPorEtapa.get(etapa.id);
      let estado: 'completada' | 'actual' | 'pendiente' = 'pendiente';

      if (this.articulo?.etapaActual?.id === etapa.id) {
        estado = 'actual';
      } else if (fechasPorEtapa.has(etapa.id)) {
        estado = 'completada';
      }

      return {
        id: etapa.id,
        titulo: etapa.titulo,
        descripcion: etapa.descripcion,
        estado,
        fecha: fecha ? this.formatearFechaCorta(fecha) : 'Por definir',
      };
    });
  }

  get historial(): ObservacionBackend[] {
    return [...(this.articulo?.observaciones ?? [])].sort(
      (a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime(),
    );
  }

  get escenarioActual(): EscenarioAutor {
    const etapa = this.normalizar(this.articulo?.etapaActual?.nombre ?? '');
    const texto = this.normalizar(this.notificacionesArticulo.map((n) => `${n.titulo} ${n.detalle}`).join(' '));

    const descartado =
      etapa.includes('descart') ||
      texto.includes('descartado') ||
      texto.includes('rechazado por el comite') ||
      texto.includes('evaluacion de turniting: descartado');

    if (descartado) {
      return {
        tipo: 'alerta',
        titulo: 'Artículo descartado',
        detalle:
          'El artículo fue descartado en el proceso editorial. Revisa las observaciones para conocer el motivo específico.',
        acciones: [
          'Leer la observación del equipo editorial.',
          'Registrar los ajustes para una futura postulación.',
          'Contactar al equipo editorial si necesitas aclaración.',
        ],
      };
    }

    const correccionPendiente = this.resumenAutor?.correccion_pendiente === true;
    if (correccionPendiente || texto.includes('requiere correccion')) {
      return {
        tipo: 'accion',
        titulo: 'Corrección requerida del autor',
        detalle:
          'Debes enviar una nueva versión del manuscrito para continuar el flujo editorial.',
        acciones: [
          'Actualizar el manuscrito según observaciones.',
          'Subir el archivo corregido desde esta página.',
          'Agregar un comentario breve sobre los cambios.',
        ],
      };
    }

    if (etapa.includes('publicac')) {
      return {
        tipo: 'exito',
        titulo: 'Artículo publicado',
        detalle: 'Tu artículo ya completó el flujo editorial y se encuentra publicado.',
        acciones: [
          'Consultar certificados del proceso.',
          'Revisar notificaciones históricas del artículo.',
          'Conservar trazabilidad para próximos envíos.',
        ],
      };
    }

    if (etapa.includes('turniting')) {
      return {
        tipo: 'informacion',
        titulo: 'Evaluación de Turniting en curso',
        detalle:
          'El equipo editorial está validando similitud y originalidad del artículo. El resultado definirá si continúa, requiere corrección o se descarta.',
        acciones: [
          'Monitorear observaciones recientes.',
          'Estar atento a solicitud de corrección.',
          'Preparar versión ajustada en caso de requerimiento.',
        ],
      };
    }

    if (etapa.includes('comite')) {
      return {
        tipo: 'informacion',
        titulo: 'Revisión por Comité Editorial',
        detalle: 'Tu artículo está en decisión del Comité Editorial.',
        acciones: [
          'Revisar notificaciones de avance.',
          'Esperar concepto de comité.',
          'Atender solicitudes adicionales si aparecen.',
        ],
      };
    }

    return {
      tipo: 'informacion',
      titulo: 'Proceso editorial en curso',
      detalle: 'Tu artículo continúa su flujo editorial según la etapa actual.',
      acciones: [
        'Consultar el historial de observaciones.',
        'Verificar notificaciones recientes del artículo.',
        'Mantenerte atento a nuevas solicitudes.',
      ],
    };
  }

  get mostrarFormularioCorreccion(): boolean {
    return this.escenarioActual.tipo === 'accion';
  }

  volverAtras(): void {
    this.location.back();
  }

  onArchivoCorreccionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!archivo) {
      return;
    }

    const extensionValida = /\.(pdf|doc|docx)$/i.test(archivo.name);
    if (!extensionValida) {
      this.errorCorreccion = 'Formato no permitido. Usa PDF, DOC o DOCX.';
      this.archivoCorreccion = null;
      this.nombreArchivoCorreccion = '';
      return;
    }

    this.archivoCorreccion = archivo;
    this.nombreArchivoCorreccion = archivo.name;
    this.errorCorreccion = null;
  }

  enviarCorreccion(): void {
    if (!this.articulo?.id) {
      return;
    }

    if (!this.archivoCorreccion) {
      this.errorCorreccion = 'Debes adjuntar el archivo de corrección.';
      return;
    }

    this.enviandoCorreccion = true;
    this.errorCorreccion = null;
    this.mensajeCorreccion = null;

    this.articulosAutorService
      .enviarCorreccion(
        this.articulo.id,
        this.archivoCorreccion,
        this.comentariosCorreccion.trim() || undefined,
      )
      .subscribe({
        next: () => {
          this.enviandoCorreccion = false;
          this.mensajeCorreccion = 'Corrección enviada correctamente.';
          this.archivoCorreccion = null;
          this.nombreArchivoCorreccion = '';
          this.comentariosCorreccion = '';
          this.cargarDetalle(this.articulo!.id);
        },
        error: (err) => {
          console.error('Error enviando corrección:', err);
          this.enviandoCorreccion = false;
          this.errorCorreccion =
            err?.error?.message ?? 'No fue posible enviar la corrección.';
        },
      });
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';
    if (!filename) {
      return;
    }

    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob) => {
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

  getEscenarioClass(tipo: EscenarioAutor['tipo']): string {
    if (tipo === 'alerta') {
      return 'escenario-alerta';
    }

    if (tipo === 'accion') {
      return 'escenario-accion';
    }

    if (tipo === 'exito') {
      return 'escenario-exito';
    }

    return 'escenario-info';
  }

  formatearFechaHistorial(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    }).format(fecha);
  }


  private cargarDetalle(articuloId: number): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      flujo: this.articulosService.getArticuloFlujo(articuloId),
      notificaciones: this.articulosAutorService.getMisNotificaciones(),
      resumen: this.articulosAutorService.getMisArticulos(),
    }).subscribe({
      next: ({ flujo, notificaciones, resumen }) => {
        this.articulo = flujo;
        this.notificacionesArticulo = notificaciones.filter((item) => item.articuloId === articuloId);
        this.resumenAutor = resumen.find((item) => item.id === articuloId) ?? null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando detalle del artículo:', err);
        this.error = 'No fue posible cargar la información del artículo.';
        this.loading = false;
      },
    });
  }

  private formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Por definir';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
  }

  private normalizar(texto: string): string {
    return (texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
