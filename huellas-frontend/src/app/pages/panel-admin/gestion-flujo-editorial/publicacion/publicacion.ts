import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EdicionesRevistaService,
  EdicionRevistaBackend,
} from '../../../../core/ediciones-revista/ediciones.revista.service';
import { Ediciones } from './ediciones/ediciones';
import { Articulos } from './articulos/articulos';
import { UsersService } from '../../../../core/users/users.service';

@Component({
  selector: 'app-publicacion',
  standalone: true,
  imports: [CommonModule, FormsModule, Ediciones, Articulos],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class Publicacion implements OnInit {
  private edicionesService = inject(EdicionesRevistaService);
  private usersService = inject(UsersService);

  activeTab: 'estandar' | 'rapida' = 'estandar';

  errorPublicacion: string | null = null;
  ediciones: EdicionRevistaBackend[] = [];
  edicionesPublicadas: Array<any> = [];
  loading = true;
  loadingPublicadas = true;
  error: string | null = null;
  success: string | null = null;
  publishing = false;

  edicionIdSeleccionada: number | null = null;
  selectedArticuloIds: number[] = [];

  // Archivos de la edición estándar
  portadaEstandarFile: File | null = null;
  pdfEstandarFile: File | null = null;
  portadaPreviewUrl: string | null = null;

  // Modales de Confirmación y Éxito
  showConfirmEstandarModal = false;
  showConfirmRapidaModal = false;
  showSuccessRapidaModal = false;
  ultimaEdicionRapidaCount = 10;

  // Campos para Publicación Rápida
  edicionRapida = {
    titulo: '',
    volumen: null as number | null,
    numero: null as number | null,
    anio: new Date().getFullYear() as number | null,
  };
  portadaFile: File | null = null;
  pdfCompletoFile: File | null = null;
  articulosRapidos: Array<{ titulo: string; autor_id: string; otros_autores: string; paginas: string; doi: string; file: File | null }> = [];
  autores: Array<{ id: number; nombre: string }> = [];

  @ViewChild(Articulos) articulosComponent!: Articulos;
  @ViewChild(Ediciones) edicionesComponent!: Ediciones;

  ngOnInit(): void {
    this.cargarEdiciones();
    this.cargarAutores();
    
    // Inicializar con 10 artículos
    for (let i = 0; i < 10; i++) {
      this.agregarArticuloRapido();
    }
  }

  public cargarEdiciones(): void {
    this.loading = true;
    this.edicionesService.getEdiciones().subscribe({
      next: ({ data }) => {
        this.ediciones = (data ?? []).filter((edicion) => edicion.estado_id?.id !== 2);
        this.loading = false;
      },
      error: () => {
        this.ediciones = [];
        this.loading = false;
        this.error = 'No se pudieron cargar las ediciones.';
      },
    });
  }

  cargarAutores(): void {
    this.usersService.getAutoresLista().subscribe({
      next: (lista) => {
        this.autores = lista;
      },
      error: () => {
        this.autores = [];
      },
    });
  }

  limpiarFormulario(): void {
    this.edicionIdSeleccionada = null;
    this.selectedArticuloIds = [];
    this.portadaEstandarFile = null;
    this.pdfEstandarFile = null;
    this.portadaPreviewUrl = null;
    this.error = null;
    this.success = null;
  }

  onPortadaEstandarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.portadaEstandarFile = file;
    // Generar preview en el browser sin subir al servidor
    const reader = new FileReader();
    reader.onload = (e) => { this.portadaPreviewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  onPdfEstandarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.pdfEstandarFile = file;
  }

  /** Objeto completo de la edición seleccionada actualmente */
  get edicionSeleccionadaDetalle(): EdicionRevistaBackend | null {
    if (!this.edicionIdSeleccionada) return null;
    return this.ediciones.find((e) => e.id === this.edicionIdSeleccionada) ?? null;
  }

  /** Mensaje que explica por qué el botón está deshabilitado */
  get tooltipPublicar(): string {
    const faltantes: string[] = [];
    if (this.selectedArticuloIds.length !== 10)
      faltantes.push(`${10 - this.selectedArticuloIds.length} artículo(s) más`);
    if (!this.edicionIdSeleccionada) faltantes.push('una edición');
    if (faltantes.length === 0) return 'Publicar edición';
    return `Falta seleccionar: ${faltantes.join(' y ')}.`;
  }

  onSeleccionArticulosCambia(nuevosIds: number[]): void {
    this.selectedArticuloIds = nuevosIds;
    this.error = null;
    this.errorPublicacion = null;
  }

  onEdicionCambia(): void {
    this.errorPublicacion = null;
    this.error = null;
  }

  get puedePublicar(): boolean {
    return (
      !this.publishing &&
      this.selectedArticuloIds.length === 10 &&
      this.edicionIdSeleccionada != null
    );
  }

  abrirModalCrear(): void {
    this.edicionesComponent?.abrirModalCrear();
  }

  publicarEdicion(): void {
    this.error = null;
    this.errorPublicacion = null;
    this.success = null;

    if (this.selectedArticuloIds.length !== 10) {
      this.errorPublicacion = `Debes seleccionar exactamente 10 artículos. Actualmente tienes ${this.selectedArticuloIds.length}.`;
      return;
    }

    if (!this.edicionIdSeleccionada) {
      this.errorPublicacion = 'Selecciona una edición antes de publicar.';
      return;
    }

    // Mostrar modal de confirmación en lugar de publicar inmediatamente
    this.showConfirmEstandarModal = true;
  }

  confirmarPublicarEstandar(): void {
    this.showConfirmEstandarModal = false;
    this.publishing = true;

    const payload = { edicionId: this.edicionIdSeleccionada!, articuloIds: this.selectedArticuloIds };

    this.edicionesService.publicarEdicion(payload).subscribe({
      next: (res) => {
        const edicionId = this.edicionIdSeleccionada!;
        const tieneArchivos = this.portadaEstandarFile || this.pdfEstandarFile;

        const finalizar = (msg: string) => {
          this.success = msg;
          this.publishing = false;
          this.limpiarFormulario();
          this.cargarEdiciones();
          this.articulosComponent?.recargarArticulos();
          this.edicionesComponent?.cargarEdiciones();
        };

        if (tieneArchivos) {
          // Subir archivos (portada / PDF) a la edición recién publicada
          const fd = new FormData();
          if (this.portadaEstandarFile) fd.append('portada', this.portadaEstandarFile);
          if (this.pdfEstandarFile) fd.append('pdfCompleto', this.pdfEstandarFile);
          this.edicionesService.updateEdicionConPortada(edicionId, fd).subscribe({
            next: () => finalizar(res?.message ?? 'Edición publicada y archivos subidos correctamente.'),
            error: () => finalizar((res?.message ?? 'Edición publicada.') + ' (No se pudieron subir los archivos)'),
          });
        } else {
          finalizar(res?.message ?? 'Edición publicada correctamente.');
        }
      },
      error: (err) => {
        this.error = err?.message ?? 'Error al publicar edición.';
        this.publishing = false;
      },
    });
  }

  onDespublicada(event: { success: boolean; message: string }): void {
    if (event.success) {
      this.success = event.message;
      this.articulosComponent?.recargarArticulos();
      this.edicionesComponent?.cargarEdiciones();
      this.cargarEdiciones();
    } else {
      this.error = event.message;
    }
    setTimeout(() => {
      if (this.success === event.message) this.success = null;
      if (this.error === event.message) this.error = null;
    }, 5000);
  }

  trackEdicion(_index: number, edicion: { id: number }): number | null {
    return edicion?.id ?? null;
  }

  // Métodos de Publicación Rápida
  agregarArticuloRapido(): void {
    this.articulosRapidos.push({ titulo: '', autor_id: '', otros_autores: '', paginas: '', doi: '', file: null });
  }

  eliminarArticuloRapido(index: number): void {
    this.articulosRapidos.splice(index, 1);
  }

  onPortadaSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.portadaFile = file;
    }
  }

  onPdfCompletoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.pdfCompletoFile = file;
    }
  }

  onArticuloFileSelected(event: any, index: number): void {
    const file = event.target.files?.[0];
    if (file) {
      this.articulosRapidos[index].file = file;
    }
  }

  get formRapidoValido(): boolean {
    if (
      !this.edicionRapida.titulo ||
      !this.edicionRapida.volumen ||
      !this.edicionRapida.numero ||
      !this.edicionRapida.anio
    ) {
      return false;
    }
    if (!this.pdfCompletoFile) {
      return false;
    }
    if (this.articulosRapidos.length < 10) {
      return false;
    }
    for (const art of this.articulosRapidos) {
      if (!art.titulo || !art.paginas || !art.file) {
        return false;
      }
    }
    return true;
  }

  publicarRapido(): void {
    if (!this.formRapidoValido) return;

    // Mostrar modal de confirmación en lugar de publicar inmediatamente
    this.showConfirmRapidaModal = true;
  }

  confirmarPublicarRapido(): void {
    this.showConfirmRapidaModal = false;
    this.error = null;
    this.success = null;
    this.publishing = true;

    const fd = new FormData();
    fd.append('titulo', this.edicionRapida.titulo);
    fd.append('volumen', String(this.edicionRapida.volumen));
    fd.append('numero', String(this.edicionRapida.numero));
    fd.append('anio', String(this.edicionRapida.anio));

    if (this.portadaFile) {
      fd.append('portada', this.portadaFile);
    }
    fd.append('pdfCompleto', this.pdfCompletoFile!);

    const articulosMapeados = this.articulosRapidos.map((art) => ({
      titulo: art.titulo,
      autor_id: art.autor_id || null,
      otros_autores: art.otros_autores || null,
      paginas: art.paginas || null,
      doi: art.doi || null,
    }));
    fd.append('articulos', JSON.stringify(articulosMapeados));

    this.articulosRapidos.forEach((art) => {
      if (art.file) {
        fd.append('archivosArticulos', art.file, art.file.name);
      }
    });

    this.edicionesService.publicarEdicionRapida(fd).subscribe({
      next: (res) => {
        this.success = res?.message ?? 'Edición y artículos publicados exitosamente.';
        this.publishing = false;
        this.ultimaEdicionRapidaCount = this.articulosRapidos.length;
        this.showSuccessRapidaModal = true;
        
        // Resetear formulario rápido
        this.edicionRapida = {
          titulo: '',
          volumen: null,
          numero: null,
          anio: new Date().getFullYear(),
        };
        this.portadaFile = null;
        this.pdfCompletoFile = null;
        this.articulosRapidos = [];
        for (let i = 0; i < 10; i++) {
          this.agregarArticuloRapido();
        }

        this.cargarEdiciones();
        this.articulosComponent?.recargarArticulos();
        this.edicionesComponent?.cargarEdiciones();
      },
      error: (err) => {
        this.error = err?.error?.message ?? err?.message ?? 'Ocurrió un error al publicar la edición.';
        this.publishing = false;
      },
    });
  }
}
