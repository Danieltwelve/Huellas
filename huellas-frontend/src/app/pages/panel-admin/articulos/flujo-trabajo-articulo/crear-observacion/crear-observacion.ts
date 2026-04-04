import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { ObservacionesAdminService } from '../../../../../core/observaciones/observaciones-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { firstValueFrom } from 'rxjs';

interface ArchivoSeleccionado {
  id: string;
  nombre: string;
  tamano: number;
  archivo: File;
}

@Component({
  selector: 'app-crear-observacion',
  imports: [CommonModule],
  templateUrl: './crear-observacion.html',
  styleUrl: './crear-observacion.scss',
})
export class CrearObservacion implements OnInit, OnDestroy {
  private readonly observacionesAdminService = inject(ObservacionesAdminService);
  private readonly authService = inject(AuthService);

  @Input() articuloId: number | null = null;
  @Input() etapaActualId: number | null = null;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('asuntoInput') asuntoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('comentariosInput') comentariosInputRef!: ElementRef<HTMLTextAreaElement>;
  @Output() closed = new EventEmitter<void>();

  private bodyOverflowOriginal = '';

  readonly tamanoMaximoTotal = 20 * 1024 * 1024;
  archivosSeleccionados: ArchivoSeleccionado[] = [];
  totalTamanoActual = 0;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;
  enviando = false;
  enDragOver = false;
  mostrarModalConfirmacion = false;

  ngOnInit(): void {
    this.bodyOverflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.bodyOverflowOriginal;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.mostrarModalConfirmacion) {
      this.cancelarConfirmacionEnvio();
      return;
    }

    this.cerrarModal();
  }

  cerrarModal(): void {
    this.closed.emit();
  }

  solicitarConfirmacionEnvio(): void {
    const asunto = this.asuntoInputRef?.nativeElement.value.trim() ?? '';

    if (!asunto) {
      this.mensajeError = 'El asunto es obligatorio para registrar la observación.';
      this.asuntoInputRef?.nativeElement.focus();
      return;
    }

    this.mensajeError = null;
    this.mostrarModalConfirmacion = true;
  }

  cancelarConfirmacionEnvio(): void {
    this.mostrarModalConfirmacion = false;
  }

  async confirmarYEnviarObservacion(): Promise<void> {
    this.mostrarModalConfirmacion = false;
    await this.enviarObservacion();
  }

  private async enviarObservacion(): Promise<void> {
    if (!this.articuloId) {
      this.mensajeError = 'No se encontró el artículo al que se quiere añadir la observación.';
      return;
    }

    const asunto = this.asuntoInputRef?.nativeElement.value.trim() ?? '';
    const comentarios = this.comentariosInputRef?.nativeElement.value.trim() ?? '';

    if (!asunto) {
      this.mensajeError = 'El asunto es obligatorio para registrar la observación.';
      return;
    }

    const usuarioId = await this.obtenerUsuarioActualId();
    if (!usuarioId) {
      this.mensajeError =
        'No se pudo identificar el usuario autenticado para registrar la observación.';
      return;
    }

    this.enviando = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    try {
      await new Promise<void>((resolve, reject) => {
        this.observacionesAdminService
          .crearObservacion(
            {
              articulo_id: this.articuloId!,
              usuario_id: usuarioId,
              etapa_id: this.etapaActualId ?? undefined,
              asunto: asunto || undefined,
              comentarios: comentarios || undefined,
            },
            this.archivosSeleccionados.map((archivo) => archivo.archivo),
          )
          .subscribe({
            next: () => resolve(),
            error: (error: unknown) => reject(error),
          });
      });

      this.mensajeExito = 'La observación se registró correctamente.';
      this.limpiarFormulario();
      this.closed.emit();
    } catch (error: any) {
      console.error('Error al registrar observación:', error);
      let mensajeError = 'No fue posible registrar la observación.';
      if (error.error?.message === 'Error en la validacion de los datos' && error.error?.errors) {
        // errors es un array de objetos con las restricciones
        const errores = error.error.errors;
        // Convertir a string legible
        mensajeError = Object.values(errores[0]).join(', ');
      } else if (error.error?.message) {
        mensajeError = error.error.message;
      }
    } finally {
      this.enviando = false;
    }
  }

  abrirSelectorArchivos(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.agregarArchivos(input.files);

    // Permite volver a seleccionar el mismo archivo en el siguiente intento.
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.enDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.enDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.enDragOver = false;
    this.agregarArchivos(event.dataTransfer?.files ?? null);
  }

  eliminarArchivo(idArchivo: string): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter(
      (archivo) => archivo.id !== idArchivo,
    );
    this.recalcularTamanoTotal();
    this.mensajeError = null;
  }

  formatearTamano(tamanoBytes: number): string {
    const mb = tamanoBytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  }

  get totalTamanoLabel(): string {
    return this.formatearTamano(this.totalTamanoActual);
  }

  private agregarArchivos(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) {
      return;
    }

    this.mensajeError = null;
    const archivosNuevos = Array.from(fileList);
    const extensionesPermitidas = ['pdf', 'docx'];

    for (const file of archivosNuevos) {
      // Obtener la extensión del archivo
      const extension = file.name.split('.').pop()?.toLowerCase();

      // Validar extensión
      if (!extension || !extensionesPermitidas.includes(extension)) {
        this.mensajeError = `Solo se permiten archivos PDF y DOCX. Extensión no válida: ${file.name}`;
        continue;
      }

      const totalPropuesto = this.totalTamanoActual + file.size;

      if (totalPropuesto > this.tamanoMaximoTotal) {
        this.mensajeError = `No puedes superar 20MB en total. Tamano actual: ${this.totalTamanoLabel}.`;
        continue;
      }

      this.archivosSeleccionados.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        nombre: file.name,
        tamano: file.size,
        archivo: file,
      });

      this.totalTamanoActual = totalPropuesto;
    }
  }

  private recalcularTamanoTotal(): void {
    this.totalTamanoActual = this.archivosSeleccionados.reduce(
      (acumulado, archivo) => acumulado + archivo.tamano,
      0,
    );
  }

  private limpiarFormulario(): void {
    this.archivosSeleccionados = [];
    this.totalTamanoActual = 0;
    this.mensajeError = null;

    if (this.asuntoInputRef) {
      this.asuntoInputRef.nativeElement.value = '';
    }

    if (this.comentariosInputRef) {
      this.comentariosInputRef.nativeElement.value = '';
    }

    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  private async obtenerUsuarioActualId(): Promise<number | null> {
    const claims = await firstValueFrom(this.authService.claims$);
    const externalUid = claims?.externalSystemUid;

    if (typeof externalUid !== 'string') {
      return null;
    }

    const match = externalUid.match(/(\d+)$/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
