import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil, timeout } from 'rxjs';
import { ArticuloFlujo, ArticulosService } from '../../../core/articulos/articulos.service';
import { normalizarNombreArchivo } from '../../../core/utils/filename.utils';
import { RubricaInteractivaComponent } from '../rubrica-interactiva/rubrica-interactiva.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ResumenAutor } from '../../panel-admin/articulos/flujo-trabajo-articulo/resumen-autor/resumen-autor';

interface DocumentoArticulo {
  nombre: string;
  path: string;
}

interface DocumentoRubrica {
  titulo: string;
  descripcion: string;
  archivo: string;
}

type SeccionDetalle = 'rubricas' | 'documentos' | 'decision' | 'rubrica-digital';

@Component({
  selector: 'app-articulo-comite',
  standalone: true,
  imports: [CommonModule, FormsModule, RubricaInteractivaComponent, ResumenAutor],
  templateUrl: './articulo-comite.component.html',
  styleUrl: './articulo-comite.component.css',
})
export class ArticuloComiteComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articulosService = inject(ArticulosService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  articulo: ArticuloFlujo | null = null;
  loading = true;
  error: string | null = null;
  mensajeOk: string | null = null;
  mensajeError: string | null = null;

  nombreUsuario = '';
  rubricaCompletada = false;

  decision: 'aceptar' | 'rechazar' = 'aceptar';
  observacion = '';
  archivoComite: File | null = null;
  nombreArchivoComite = '';
  guardandoEvaluacion = false;
  modalConfirmarDescarte = false;
  modalConfirmarProrrogaComite = false;
  solicitandoProrroga = false;
  mostrarRubricaDigital = false;

  // Modales de éxito y error
  mostrarModalExitoComite = false;
  tituloModalExitoComite = '';
  mensajeExitoComite = '';
  mostrarModalErrorComite = false;
  mensajeErrorComite = '';

  // Campos para información de vencimiento
  diasRestantes: number | null = null;
  estaVencido = false;
  fechaVencimiento: Date | null = null;

  seccionesAbiertas: Record<SeccionDetalle, boolean> = {
    rubricas: false,
    documentos: true,
    decision: true,
    'rubrica-digital': true,
  };

  readonly documentosRubrica: DocumentoRubrica[] = [
    {
      titulo: 'Plantilla de rúbrica de evaluación (PDF)',
      descripcion: 'Formato oficial para evaluación del artículo por criterio.',
      archivo: '/rubricas/plantilla-rubrica-evaluacion.pdf',
    },
    {
      titulo: 'Guía de aplicación de rúbrica (Word)',
      descripcion: 'Instrucciones para diligenciar la rúbrica de evaluación.',
      archivo: '/rubricas/guia-rubrica-evaluacion.doc',
    },
  ];

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.nombreUsuario = user?.displayName || user?.email || 'Miembro del Comité Editorial';
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params['id']);

      if (!id) {
        this.error = 'No se encontró el artículo solicitado.';
        this.loading = false;
        return;
      }

      this.cargarArticulo(id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarArticulo(id: number): void {
    this.loading = true;
    this.error = null;

    this.articulosService
      .getArticuloFlujo(id)
      .pipe(
        timeout(15000),
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (articulo) => {
          this.articulo = articulo;

          // Cargar información de vencimiento desde la data completa del articulo
          // Por ahora usamos una estimación, después se actualizará desde el backend
          this.calcularVencimiento();
        },
        error: (err) => {
          this.error =
            err?.name === 'TimeoutError'
              ? 'La carga del artículo tardó demasiado. Intenta nuevamente.'
              : (err?.error?.message ?? 'No fue posible cargar el artículo.');
        },
      });
  }

  private calcularVencimiento(): void {
    if (!this.articulo) {
      return;
    }

    const fechaAsignacion = this.articulo.fechaAsignacionComite
      ? new Date(this.articulo.fechaAsignacionComite)
      : this.articulo.historialEtapas
            ?.filter((h) => h.etapaId === 6)
            ?.sort(
              (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
            )?.[0]?.fechaInicio
        ? new Date(
            this.articulo.historialEtapas
              .filter((h) => h.etapaId === 6)
              .sort(
                (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
              )[0].fechaInicio,
          )
        : null;

    const fechaVencimiento = this.articulo.fechaVencimientoComite
      ? new Date(this.articulo.fechaVencimientoComite)
      : fechaAsignacion
        ? new Date(fechaAsignacion.getTime() + 30 * 24 * 60 * 60 * 1000)
        : null;

    if (!fechaVencimiento) {
      this.fechaVencimiento = null;
      this.diasRestantes = null;
      this.estaVencido = false;
      return;
    }

    this.fechaVencimiento = fechaVencimiento;
    const ahora = new Date();
    this.diasRestantes = Math.ceil(
      (fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
    );
    this.estaVencido = this.diasRestantes < 0;
  }

  volverListado(): void {
    this.router.navigate(['/panel-comite-editorial/articulos']);
  }

  solicitarProrrogaComite(): void {
    this.modalConfirmarProrrogaComite = true;
  }

  cancelarSolicitudProrrogaComite(): void {
    this.modalConfirmarProrrogaComite = false;
  }

  confirmarSolicitudProrrogaComite(): void {
    if (!this.articulo || this.solicitandoProrroga) return;

    this.solicitandoProrroga = true;
    this.modalConfirmarProrrogaComite = false;

    this.articulosService.solicitarProrrogaComite(this.articulo.id).subscribe({
      next: (res) => {
        this.solicitandoProrroga = false;
        this.mensajeOk = null;
        this.mensajeError = null;
        this.abrirModalExitoComite(
          'Solicitud Enviada',
          res.message || 'La solicitud de prórroga de 5 días ha sido enviada correctamente.',
        );
        this.cargarArticulo(this.articulo!.id);
      },
      error: (err) => {
        this.solicitandoProrroga = false;
        this.mensajeOk = null;
        this.mensajeError = null;
        this.abrirModalErrorComite(
          err?.error?.message || 'No se pudo enviar la solicitud de prórroga.',
        );
      },
    });
  }

  abrirModalExitoComite(titulo: string, mensaje: string): void {
    this.tituloModalExitoComite = titulo;
    this.mensajeExitoComite = mensaje;
    this.mostrarModalExitoComite = true;
  }

  cerrarModalExitoComite(): void {
    this.mostrarModalExitoComite = false;
  }

  abrirModalErrorComite(mensaje: string): void {
    this.mensajeErrorComite = mensaje;
    this.mostrarModalErrorComite = true;
  }

  cerrarModalErrorComite(): void {
    this.mostrarModalErrorComite = false;
  }

  onArchivoComiteSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoComite = file;
    this.nombreArchivoComite = file?.name ?? '';
  }

  private esAsuntoEvaluacionComite(asunto?: string): boolean {
    const texto = (asunto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      texto.includes('evalu') &&
      texto.includes('comite') &&
      !texto.includes('prorroga') &&
      (texto.includes('acept') || texto.includes('rechaz'))
    );
  }

  evaluarArticulo(forzarEnvio = false): void {
    if (!this.articulo || this.guardandoEvaluacion) {
      return;
    }

    if (!this.puedeEvaluarComite) {
      this.mensajeError =
        'Este artículo ya fue evaluado por el comité o ya no está en etapa de comité.';
      this.mensajeOk = null;
      return;
    }

    if (!this.rubricaCompletada) {
      this.mensajeError =
        'Debes diligenciar y confirmar obligatoriamente la Rúbrica de Evaluación Digital antes de emitir tu decisión.';
      this.mensajeOk = null;
      this.modalConfirmarDescarte = false;
      return;
    }

    if (this.decision === 'rechazar' && !this.observacion.trim()) {
      this.mensajeError = 'Debes agregar una observación para rechazar el artículo.';
      this.mensajeOk = null;
      this.modalConfirmarDescarte = false;
      return;
    }

    if (!forzarEnvio) {
      this.modalConfirmarDescarte = true;
      return;
    }

    this.guardandoEvaluacion = true;
    this.mensajeError = null;
    this.mensajeOk = null;

    this.articulosService
      .evaluarComite(this.articulo.id, {
        decision: this.decision,
        observacion: this.observacion.trim() || undefined,
        archivo: this.archivoComite,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardandoEvaluacion = false;
          this.modalConfirmarDescarte = false;
          this.observacion = '';
          this.archivoComite = null;
          this.nombreArchivoComite = '';
          this.mensajeOk = respuesta.message;
          this.mensajeError = null;
          this.abrirModalExitoComite(
            'Evaluación Registrada',
            respuesta.message || 'La decisión y la rúbrica han sido registradas correctamente.',
          );
          if (this.articulo) {
            this.articulo.evaluacionComiteRealizada = true;
          }
        },
        error: (err) => {
          this.guardandoEvaluacion = false;
          this.modalConfirmarDescarte = false;
          this.mensajeOk = null;
          this.mensajeError = err?.error?.message ?? 'No se pudo guardar la evaluación del comité.';
          this.abrirModalErrorComite(
            this.mensajeError || 'No se pudo guardar la evaluación del comité.',
          );
        },
      });
  }

  toggleSeccion(seccion: SeccionDetalle): void {
    this.seccionesAbiertas[seccion] = !this.seccionesAbiertas[seccion];
  }

  alRubricaCompleta(resultado: any): void {
    this.rubricaCompletada = resultado.completo;
    if (resultado.completo) {
      this.observacion = resultado.observacionCompilada;
      this.seccionesAbiertas['decision'] = true;

      // Limpiar mensaje de error si existía
      if (
        this.mensajeError ===
        'Debes diligenciar y confirmar obligatoriamente la Rúbrica de Evaluación Digital antes de emitir tu decisión.'
      ) {
        this.mensajeError = null;
      }
    } else {
      this.observacion = '';
    }
  }

  cancelarDescarte(): void {
    this.modalConfirmarDescarte = false;
  }

  confirmarDescarte(): void {
    this.modalConfirmarDescarte = false;
    this.evaluarArticulo(true);
  }

  descargarDocumentoArticulo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';

    if (!filename) {
      this.mensajeError = 'No se pudo resolver el documento seleccionado.';
      this.mensajeOk = null;
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
      error: () => {
        this.mensajeError = 'No se pudo descargar el documento.';
        this.mensajeOk = null;
      },
    });
  }

  get documentosArticulo(): DocumentoArticulo[] {
    if (!this.articulo) {
      return [];
    }

    const vistos = new Set<string>();

    return (this.articulo.observaciones ?? [])
      .flatMap((obs) =>
        obs.archivos.map((archivo) => ({
          nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
          path: archivo.archivoPath,
        })),
      )
      .filter((archivo) => {
        const extension = archivo.nombre.split('.').pop()?.toLowerCase() ?? '';
        const esDocumentoRubrica = ['pdf', 'doc', 'docx'].includes(extension);

        if (!esDocumentoRubrica || vistos.has(archivo.path)) {
          return false;
        }

        vistos.add(archivo.path);
        return true;
      });
  }

  get estaEnEtapaComite(): boolean {
    return this.articulo?.etapaActual?.id === 6;
  }

  get yaEvaluadoPorComite(): boolean {
    if (this.articulo?.evaluacionComiteRealizada) {
      return true;
    }

    const observaciones = this.articulo?.observaciones ?? [];

    return observaciones.some((obs) => this.esAsuntoEvaluacionComite(obs.asunto));
  }

  get puedeEvaluarComite(): boolean {
    return this.estaEnEtapaComite && !this.yaEvaluadoPorComite;
  }

  get mensajeEstadoEvaluacion(): string {
    if (this.yaEvaluadoPorComite) {
      return 'Este artículo ya fue evaluado por el Comité Editorial. Solo está disponible para consulta.';
    }

    if (!this.estaEnEtapaComite) {
      return 'Este artículo ya avanzó a otra etapa del flujo y no admite una nueva evaluación de comité.';
    }

    return '';
  }
}
