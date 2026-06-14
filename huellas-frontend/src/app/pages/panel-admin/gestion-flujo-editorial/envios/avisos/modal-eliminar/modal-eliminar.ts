import { Component, EventEmitter, Output, inject } from '@angular/core';
import { ModalShellComponent } from '../../../../../../core/components/modal-shell/modal-shell.component';
import { AvisosService } from '../../../../../../core/avisos/avisos.service';

@Component({
  selector: 'app-modal-eliminar-aviso',
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: './modal-eliminar.html',
  styleUrl: './modal-eliminar.css',
})
export class ModalEliminarAviso {
  private avisosService = inject(AvisosService);
  @Output() eliminado = new EventEmitter<void>();

  isOpen = false;
  showSuccessModal = false;
  deleting = false;
  requestError = '';

  selectedAvisoId: number | null = null;
  selectedAvisoTitulo = '';

  openModal(avisoId: number, avisoTitulo: string): void {
    this.selectedAvisoId = avisoId;
    this.selectedAvisoTitulo = avisoTitulo;
    this.requestError = '';
    this.isOpen = true;
  }

  closeModal(): void {
    if (this.deleting) return;
    this.isOpen = false;
    this.requestError = '';
    this.resetSelection();
  }

  confirmDelete(): void {
    if (this.deleting || this.selectedAvisoId === null) return;
    this.deleting = true;
    this.requestError = '';

    this.avisosService.deleteAviso(this.selectedAvisoId).subscribe({
      next: () => {
        this.deleting = false;
        this.isOpen = false;
        this.showSuccessModal = true;
        this.eliminado.emit(); // notifica al padre para recargar lista
      },
      error: (err) => {
        this.deleting = false;
        const backendMessage = err?.error?.message || err?.message;
        this.requestError = backendMessage || 'No se pudo eliminar el aviso. Intenta nuevamente.';
      },
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.resetSelection();
  }

  private resetSelection(): void {
    this.selectedAvisoId = null;
    this.selectedAvisoTitulo = '';
  }
}
