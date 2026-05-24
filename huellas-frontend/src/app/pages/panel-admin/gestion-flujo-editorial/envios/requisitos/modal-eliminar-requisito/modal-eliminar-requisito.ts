import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequisitosRevistaService } from '../../../../../../core/requisitos-revista/requisitos-revista.service';
import { ModalShellComponent } from '../../../../../../core/components/modal-shell/modal-shell.component';

@Component({
  selector: 'app-modal-eliminar-requisito',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
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

  openModal(id: number, texto: string): void {
    this.requisitoId = id;
    this.requisitoTexto = texto;
    this.isVisible = true;
    this.isSuccessVisible = false;
  }

  closeModal(): void {
    this.isVisible = false;
    this.requisitoId = null;
    this.requisitoTexto = '';
  }

  closeSuccessModal(): void {
    this.isSuccessVisible = false;
  }

  confirmar(): void {
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
        },
      });
    }
  }
}
