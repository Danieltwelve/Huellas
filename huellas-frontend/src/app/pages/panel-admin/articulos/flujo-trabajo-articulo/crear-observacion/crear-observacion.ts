import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

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
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @Output() closed = new EventEmitter<void>();

  private bodyOverflowOriginal = '';

  readonly tamanoMaximoTotal = 20 * 1024 * 1024;
  archivosSeleccionados: ArchivoSeleccionado[] = [];
  totalTamanoActual = 0;
  mensajeError: string | null = null;
  enDragOver = false;

  ngOnInit(): void {
    this.bodyOverflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.bodyOverflowOriginal;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.closed.emit();
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
}
