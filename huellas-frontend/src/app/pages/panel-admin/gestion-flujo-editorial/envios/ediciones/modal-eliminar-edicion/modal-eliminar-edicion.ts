import { Component, EventEmitter, Output, inject } from '@angular/core';
import { EdicionesRevistaService } from '../../../../../../core/ediciones-revista/ediciones.revista.service';

@Component({
  selector: 'app-modal-eliminar-edicion',
  standalone: true,
  imports: [],
  templateUrl: './modal-eliminar-edicion.html',
  styleUrl: './modal-eliminar-edicion.scss',
})
export class ModalEliminarEdicion {
  private readonly edicionesRevistaService = inject(EdicionesRevistaService);

  @Output() eliminada = new EventEmitter<void>();

  isOpen = false;
  showSuccessModal = false;
  deletingEdicion = false;
  requestError = '';

  selectedEdicionId: number | null = null;
  selectedEdicionTitulo = '';

  openModal(edicionId: number, edicionTitulo: string): void {
    this.selectedEdicionId = edicionId;
    this.selectedEdicionTitulo = edicionTitulo;
    this.requestError = '';
    this.isOpen = true;
  }

  closeModal(): void {
    if (this.deletingEdicion) {
      return;
    }

    this.isOpen = false;
    this.requestError = '';
    this.resetSelection();
  }

  confirmDelete(): void {
    if (this.deletingEdicion || this.selectedEdicionId === null) {
      return;
    }

    this.deletingEdicion = true;
    this.requestError = '';

    this.edicionesRevistaService.deleteEdicion(this.selectedEdicionId).subscribe({
      next: () => {
        this.deletingEdicion = false;
        this.isOpen = false;
        this.showSuccessModal = true;
        this.eliminada.emit();
      },
      error: (error) => {
        this.deletingEdicion = false;

        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;

        this.requestError =
          backendMessage ||
          'No se pudo eliminar la edicion. Intenta nuevamente en unos instantes.';
      },
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.resetSelection();
  }

  private resetSelection(): void {
    this.selectedEdicionId = null;
    this.selectedEdicionTitulo = '';
  }

}
