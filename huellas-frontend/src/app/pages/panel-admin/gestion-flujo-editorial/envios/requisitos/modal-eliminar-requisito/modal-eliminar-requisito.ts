import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequisitosRevistaService } from '../../../../../../core/requisitos-revista/requisitos-revista.service';

@Component({
  selector: 'app-modal-eliminar-requisito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-eliminar-requisito.html',
  styleUrl: './modal-eliminar-requisito.css',
})
export class ModalEliminarRequisito {
  @Output() requisitoEliminado = new EventEmitter<void>();

  private requisitosService = inject(RequisitosRevistaService);

  isVisible = false;
  isSuccessVisible = false;
  requisitoId: number | null = null;
  requisitoTexto: string = '';

  openModal(id: number, texto: string) {
    this.requisitoId = id;
    this.requisitoTexto = texto;
    this.isVisible = true;
    this.isSuccessVisible = false;
  }

  closeModal() {
    this.isVisible = false;
    this.requisitoId = null;
    this.requisitoTexto = '';
  }

  closeSuccessModal() {
    this.isSuccessVisible = false;
  }

  confirmar() {
    if (this.requisitoId) {
      this.requisitosService.delete(this.requisitoId).subscribe({
        next: () => {
          this.requisitoEliminado.emit();
          this.closeModal();
          this.isSuccessVisible = true;
        },
        error: (err) => {
          console.error('Error al eliminar requisito', err);
          this.closeModal();
        }
      });
    }
  }
}
