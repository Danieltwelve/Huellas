import { CommonModule } from '@angular/common';
import { Component, inject, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  ArticuloResumenBackend,
  ArticulosService,
  CertificadoArticuloBackend,
  UsuarioCertificadosBackend,
} from '../../../core/articulos/articulos.service';
import { ModalEliminarCertificado } from './modal-eliminar-certificado/modal-eliminar-certificado';

type TipoCertificado = 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';

type ContextoRequerimiento = 'autor' | 'comite-editorial' | 'revisor';

interface UsuarioConArticulos extends UsuarioCertificadosBackend {
  articulos: ArticuloResumenBackend[];
}

@Component({
  selector: 'app-certificados-editoriales',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalEliminarCertificado],
  templateUrl: './certificados-editoriales.component.html',
  styleUrl: './certificados-editoriales.component.css',
})
export class CertificadosEditorialesComponent {
  private articulosService = inject(ArticulosService);

  articulos: ArticuloResumenBackend[] = [];
  autores: UsuarioConArticulos[] = [];
  comiteEditorial: UsuarioConArticulos[] = [];
  revisores: UsuarioConArticulos[] = [];
  certificados: CertificadoArticuloBackend[] = [];
  loading = true;
  uploading = false;
  error: string | null = null;
  success: string | null = null;

  usuarioIdSeleccionado: number | null = null;
  articuloIdSeleccionado: number | null = null;
  tipo: TipoCertificado = 'evaluacion';
  contextoRequerimiento: ContextoRequerimiento = 'autor';
  etapaReferencia = '';
  titulo = '';
  archivo: File | null = null;
  certificadoEnEdicionId: number | null = null;
  showUploadConfirmModal = false;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  private successTimeout: any;

  @ViewChild(ModalEliminarCertificado) modalEliminarCertificado!: ModalEliminarCertificado;

  ngOnInit(): void {
    this.cargarDatos();
  }

  private normalizeDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    try {
      const s = typeof value === 'string' ? value : value.toString();
      const hasTZ = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(s);
      return new Date(hasTZ ? s : `${s}Z`);
    } catch {
      return new Date(value as any);
    }
  }

  getFecha(certificado: CertificadoArticuloBackend): Date | null {
    const anyC = certificado as any;
    if (anyC && anyC.fechaSubidaDate) {
      return anyC.fechaSubidaDate instanceof Date
        ? anyC.fechaSubidaDate
        : this.normalizeDate(anyC.fechaSubidaDate);
    }
    return this.normalizeDate(anyC?.fechaSubida);
  }

  private cargarDatos(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      articulos: this.articulosService.getResumenArticulos(),
      autores: this.articulosService.getAutoresCertificados(),
      comiteEditorial: this.articulosService.getComiteEditorialCertificados(),
      revisores: this.articulosService.getRevisoresCertificados(),
      certificados: this.articulosService.listarCertificados(),
    }).subscribe({
      next: ({ articulos, autores, comiteEditorial, revisores, certificados }) => {
        this.articulos = articulos;
        this.certificados = certificados.map(
          (c) =>
            ({
              ...c,
              fechaSubidaDate: this.normalizeDate((c as any).fechaSubida),
            }) as any,
        );

        if (articulos.length === 0) {
          this.autores = [];
          this.comiteEditorial = [];
          this.revisores = [];
          this.loading = false;
          return;
        }

        forkJoin(
          articulos.map((articulo) => this.articulosService.getArticuloFlujo(articulo.id)),
        ).subscribe({
          next: (detalles) => {
            const articulosPorId = new Map(articulos.map((articulo) => [articulo.id, articulo]));

            this.autores = autores
              .map((usuario) => ({
                ...usuario,
                articulos: detalles
                  .filter((detalle) => detalle.autores.some((autor) => autor.id === usuario.id))
                  .map((detalle) => articulosPorId.get(detalle.id))
                  .filter((articulo): articulo is ArticuloResumenBackend => Boolean(articulo)),
              }))
              .filter((usuario) => usuario.articulos.length > 0);

            this.comiteEditorial = comiteEditorial
              .map((usuario) => ({
                ...usuario,
                articulos: detalles
                  .filter((detalle) => detalle.comiteEditorial?.id === usuario.id)
                  .map((detalle) => articulosPorId.get(detalle.id))
                  .filter((articulo): articulo is ArticuloResumenBackend => Boolean(articulo)),
              }))
              .filter((usuario) => usuario.articulos.length > 0);

            this.revisores = revisores
              .map((usuario) => ({
                ...usuario,
                articulos: detalles
                  .filter((detalle) => detalle.revisor?.usuarioId === usuario.id)
                  .map((detalle) => articulosPorId.get(detalle.id))
                  .filter((articulo): articulo is ArticuloResumenBackend => Boolean(articulo)),
              }))
              .filter((usuario) => usuario.articulos.length > 0);

            this.loading = false;
          },
          error: () => {
            this.error = 'No se pudieron cruzar los artículos con autores, comité editorial y revisores.';
            this.loading = false;
          },
        });
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos necesarios para certificados.';
        this.articulos = [];
        this.autores = [];
        this.comiteEditorial = [];
        this.revisores = [];
        this.certificados = [];
        this.loading = false;
      },
    });
  }

  get usuariosDisponibles(): UsuarioConArticulos[] {
    if (this.contextoRequerimiento === 'autor') {
      return this.autores;
    } else if (this.contextoRequerimiento === 'comite-editorial') {
      return this.comiteEditorial;
    } else {
      return this.revisores;
    }
  }

  get usuarioSeleccionado(): UsuarioConArticulos | null {
    return (
      this.usuariosDisponibles.find((usuario) => usuario.id === this.usuarioIdSeleccionado) ?? null
    );
  }

  get articulosDisponibles(): ArticuloResumenBackend[] {
    return this.usuarioSeleccionado?.articulos ?? [];
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.error = null;
    this.success = null;

    if (!file) {
      this.archivo = null;
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      this.error = 'El archivo supera el tamaño máximo de 10 MB.';
      // limpiar input
      input.value = '';
      this.archivo = null;
      return;
    }

    if (file.type !== 'application/pdf') {
      this.error = 'Solo se permiten archivos PDF.';
      input.value = '';
      this.archivo = null;
      return;
    }

    this.archivo = file;
  }

  onContextoChange(): void {
    this.usuarioIdSeleccionado = null;
    this.articuloIdSeleccionado = null;
  }

  onUsuarioChange(): void {
    this.articuloIdSeleccionado = null;
  }

  removeArchivo(): void {
    this.archivo = null;
    this.error = null;
    this.success = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  subirCertificado(): void {
    this.error = null;
    this.success = null;

    if (!this.usuarioIdSeleccionado) {
      this.error = 'Debes seleccionar un destinatario para el certificado.';
      return;
    }

    if (!this.articuloIdSeleccionado) {
      this.error = 'Debes seleccionar un artículo.';
      return;
    }

    if (!this.archivo) {
      this.error = 'Debes adjuntar un archivo PDF.';
      return;
    }

    if (this.contextoRequerimiento !== 'revisor' && !this.etapaReferencia.trim()) {
      this.error = 'Debes indicar la etapa de referencia.';
      return;
    }

    this.showUploadConfirmModal = true;
  }

  cancelarConfirmacionSubida(): void {
    this.showUploadConfirmModal = false;
  }

  confirmarSubidaCertificado(): void {
    this.error = null;
    this.success = null;

    if (
      !this.usuarioIdSeleccionado ||
      !this.articuloIdSeleccionado ||
      !this.archivo ||
      (this.contextoRequerimiento !== 'revisor' && !this.etapaReferencia.trim())
    ) {
      this.showUploadConfirmModal = false;
      this.error = 'Completa los campos requeridos antes de subir el certificado.';
      return;
    }

    this.uploading = true;
    this.showUploadConfirmModal = false;

    this.articulosService
      .subirCertificado(this.articuloIdSeleccionado, {
        tipo: this.tipo,
        titulo: this.titulo,
        contextoRequerimiento: this.contextoRequerimiento,
        etapaReferencia: this.etapaReferencia,
        archivo: this.archivo,
      })
      .subscribe({
        next: () => {
          this.showSuccess('Certificado cargado correctamente.');
          this.archivo = null;
          this.titulo = '';
          this.etapaReferencia = '';
          this.contextoRequerimiento = 'autor';
          this.usuarioIdSeleccionado = null;
          this.articuloIdSeleccionado = null;
          this.uploading = false;
          this.cargarDatos();
        },
        error: (err) => {
          this.uploading = false;
          this.error = err?.error?.message ?? 'No se pudo subir el certificado.';
        },
      });
  }

  iniciarEdicion(certificado: CertificadoArticuloBackend): void {
    this.certificadoEnEdicionId = certificado.id;
    this.tipo = certificado.tipo;
    this.titulo = certificado.titulo;
    this.contextoRequerimiento = certificado.contextoRequerimiento as ContextoRequerimiento;
    this.etapaReferencia = certificado.etapaReferencia ?? '';
    this.usuarioIdSeleccionado = null;
    this.articuloIdSeleccionado = certificado.articuloId;
    this.clearSuccess();
    this.error = null;
  }

  cancelarEdicion(): void {
    this.certificadoEnEdicionId = null;
    this.titulo = '';
    this.etapaReferencia = '';
    this.contextoRequerimiento = 'autor';
    this.usuarioIdSeleccionado = null;
    this.articuloIdSeleccionado = null;
  }

  get articuloSeleccionadoDisplay(): string {
    if (!this.articuloIdSeleccionado) {
      return '-';
    }

    const encontrado = this.articulosDisponibles.find((a) => a.id === this.articuloIdSeleccionado);
    return encontrado ? `${encontrado.codigo} - ${encontrado.titulo}` : '-';
  }

  get usuarioSeleccionadoDisplay(): string {
    return this.usuarioSeleccionado
      ? `${this.usuarioSeleccionado.nombre} (${this.usuarioSeleccionado.articulos.length})`
      : '-';
  }

  get totalCertificados(): number {
    return this.certificados.length;
  }

  get totalAutores(): number {
    return this.autores.length;
  }

  get totalComiteEditorial(): number {
    return this.comiteEditorial.length;
  }

  get totalRevisores(): number {
    return this.revisores.length;
  }

  get contextoLabel(): string {
    if (this.contextoRequerimiento === 'autor') {
      return 'Autor';
    } else if (this.contextoRequerimiento === 'comite-editorial') {
      return 'Comité editorial';
    } else {
      return 'Revisor por pares';
    }
  }

  formatearTipo(tipo: TipoCertificado): string {
    const etiquetas: Record<TipoCertificado, string> = {
      evaluacion: 'Evaluación',
      publicacion: 'Publicación',
      aceptacion: 'Aceptación',
      envio: 'Envío',
      revision: 'Revisión',
      otro: 'Otro',
    };

    return etiquetas[tipo] ?? tipo;
  }

  formatearContexto(contexto: ContextoRequerimiento | 'editorial'): string {
    if (contexto === 'autor') {
      return 'Autor';
    }

    if (contexto === 'comite-editorial') {
      return 'Comité editorial';
    }

    if (contexto === 'revisor') {
      return 'Revisor por pares';
    }

    return 'Editorial';
  }

  guardarEdicion(): void {
    this.error = null;
    this.clearSuccess();

    if (!this.certificadoEnEdicionId) {
      return;
    }

    if (this.contextoRequerimiento !== 'revisor' && !this.etapaReferencia.trim()) {
      this.error = 'Debes indicar la etapa de referencia.';
      return;
    }

    this.articulosService
      .actualizarCertificado(this.certificadoEnEdicionId, {
        tipo: this.tipo,
        titulo: this.titulo,
        contextoRequerimiento: this.contextoRequerimiento,
        etapaReferencia: this.etapaReferencia,
      })
      .subscribe({
        next: () => {
          this.showSuccess('Certificado actualizado correctamente.');
          this.cancelarEdicion();
          this.cargarDatos();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo actualizar el certificado.';
        },
      });
  }

  private showSuccess(message: string): void {
    this.success = message;
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    this.successTimeout = setTimeout(() => {
      this.success = null;
      this.successTimeout = null;
    }, 6000);
  }

  clearSuccess(): void {
    this.success = null;
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
      this.successTimeout = null;
    }
  }

  descargar(certificado: CertificadoArticuloBackend): void {
    this.articulosService.descargarCertificado(certificado.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = certificado.archivoNombreOriginal || `certificado-${certificado.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = 'No se pudo descargar el certificado seleccionado.';
      },
    });
  }

  abrirModalEliminar(certificado: CertificadoArticuloBackend): void {
    this.modalEliminarCertificado.openModal(certificado);
  }

  onCertificadoEliminado(): void {
    this.cargarDatos(); // recarga la lista
  }
}
