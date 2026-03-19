import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequisitosRevistaService } from '../../../../../../core/requisitos-revista/requisitos-revista.service';

@Component({
  selector: 'app-modal-crear-requisito',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-crear-requisito.html',
  styleUrl: './modal-crear-requisito.scss',
})
export class ModalCrearRequisito {
  @Output() requisitoCreado = new EventEmitter<void>();

  private requisitosService = inject(RequisitosRevistaService);

  isVisible = false;
  isResultVisible = false;
  requisitoDescripcion = '';
  isSaving = false;
  resultType: 'success' | 'error' = 'success';
  resultTitle = '';
  resultMessage = '';

  openModal() {
    this.isVisible = true;
    this.isResultVisible = false;
    this.requisitoDescripcion = '';
    this.isSaving = false;
  }

  closeModal() {
    if (!this.isSaving) {
      this.isVisible = false;
    }
  }

  closeResultModal() {
    this.isResultVisible = false;
    this.resultTitle = '';
    this.resultMessage = '';
  }

  private openResultModal(type: 'success' | 'error', title: string, message: string) {
    this.resultType = type;
    this.resultTitle = title;
    this.resultMessage = message;
    this.isResultVisible = true;
  }

  guardar() {
    if (!this.requisitoDescripcion.trim() || this.isSaving) return;

    this.isSaving = true;
    this.requisitosService.create(this.requisitoDescripcion).subscribe({
      next: () => {
        this.isSaving = false;
        this.requisitoCreado.emit();
        this.isVisible = false;
        this.openResultModal(
          'success',
          'Requisito creado con éxito',
          'El requisito fue guardado correctamente en el sistema.',
        );
        this.requisitoDescripcion = '';
      },
      error: (err) => {
        console.error('Error al crear requisito', err);
        this.isSaving = false;
        this.isVisible = false;
        this.openResultModal(
          'error',
          'No fue posible crear el requisito',
          'Ocurrió un error al guardar la información. Intenta nuevamente.',
        );
      }
    });
  }
}

