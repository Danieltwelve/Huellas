import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../../../../core/components/modal-shell/modal-shell.component';
import { ArticulosService, CertificadoArticuloBackend } from '../../../../core/articulos/articulos.service';

@Component({
  selector: 'app-modal-eliminar-certificado',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  templateUrl: './modal-eliminar-certificado.html',
  styleUrl: './modal-eliminar-certificado.css',
})
export class ModalEliminarCertificado {
  private articulosService = inject(ArticulosService);
  @Output() certificadoEliminado = new EventEmitter<void>();

  isOpen = false;
  deleting = false;
  errorMessage = '';
  certificado: CertificadoArticuloBackend | null = null;

  openModal(certificado: CertificadoArticuloBackend): void {
    this.certificado = certificado;
    this.isOpen = true;
    this.errorMessage = '';
    this.deleting = false;
  }

  closeModal(): void {
    if (this.deleting) return;
    this.isOpen = false;
    this.certificado = null;
    this.errorMessage = '';
  }

  confirmDelete(): void {
    if (!this.certificado || this.deleting) return;
    this.deleting = true;
    this.errorMessage = '';

    this.articulosService.eliminarCertificado(this.certificado.id).subscribe({
      next: () => {
        this.deleting = false;
        this.isOpen = false;
        this.certificadoEliminado.emit();
        this.certificado = null;
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage =
          err?.error?.message || 'No se pudo eliminar el certificado. Intente de nuevo.';
      },
    });
  }
}
