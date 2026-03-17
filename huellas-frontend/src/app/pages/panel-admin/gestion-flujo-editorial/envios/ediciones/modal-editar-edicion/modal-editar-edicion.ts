import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EdicionesRevistaService,
  UpdateEdicionRevistaPayload,
} from '../../../../../../core/ediciones-revista/ediciones.revista.service';

interface OpenEditarEdicionData {
  edicionId: number;
  edicionTexto: string;
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  estadoId: number;
}

interface EditarEdicionForm {
  titulo: string;
  volumen: number | null;
  numero: number | null;
  anio: number | null;
  estadoId: number | null;
}

type ResultadoTipo = 'success' | 'error';

@Component({
  selector: 'app-modal-editar-edicion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './modal-editar-edicion.html',
  styleUrl: './modal-editar-edicion.scss',
})
export class ModalEditarEdicion {
  private readonly edicionesRevistaService = inject(EdicionesRevistaService);

  @Output() actualizada = new EventEmitter<void>();

  isOpen = false;
  showConfirmModal = false;
  showResultModal = false;
  updatingEdicion = false;

  selectedEdicionId: number | null = null;
  selectedEdicionTexto = '';

  resultType: ResultadoTipo = 'success';
  resultTitle = '';
  resultMessage = '';

  readonly estadoOptions = [
    { id: 1, label: 'ABIERTA' },
    { id: 2, label: 'EN REVISION' },
    { id: 3, label: 'PUBLICADA' },
  ];

  editForm: EditarEdicionForm = {
    titulo: '',
    volumen: null,
    numero: null,
    anio: null,
    estadoId: 1,
  };

  openModal(data: OpenEditarEdicionData): void {
    this.selectedEdicionId = data.edicionId;
    this.selectedEdicionTexto = data.edicionTexto;

    this.editForm = {
      titulo: data.titulo,
      volumen: data.volumen,
      numero: data.numero,
      anio: data.anio,
      estadoId: this.ensureEstadoId(data.estadoId),
    };

    this.isOpen = true;
    this.showConfirmModal = false;
    this.showResultModal = false;
  }

  closeModal(): void {
    if (this.updatingEdicion) {
      return;
    }

    this.isOpen = false;
    this.showConfirmModal = false;
    this.resetResult();
    this.resetSelection();
  }

  onGuardarClick(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.isOpen = false;
    this.showConfirmModal = true;
  }

  closeConfirmModal(keepEditing: boolean): void {
    if (this.updatingEdicion) {
      return;
    }

    this.showConfirmModal = false;

    if (keepEditing) {
      this.isOpen = true;
      return;
    }

    this.resetSelection();
  }

  confirmUpdate(): void {
    if (!this.isFormValid() || this.selectedEdicionId === null || this.updatingEdicion) {
      return;
    }

    this.updatingEdicion = true;

    const payload: UpdateEdicionRevistaPayload = {
      titulo: this.editForm.titulo.trim(),
      volumen: Number(this.editForm.volumen),
      numero: Number(this.editForm.numero),
      anio: Number(this.editForm.anio),
      estadoId: Number(this.editForm.estadoId),
    };

    this.edicionesRevistaService.updateEdicion(this.selectedEdicionId, payload).subscribe({
      next: () => {
        this.updatingEdicion = false;
        this.showConfirmModal = false;
        this.resultType = 'success';
        this.resultTitle = 'Edición actualizada';
        this.resultMessage = 'La operación se realizó exitosamente.';
        this.showResultModal = true;
        this.actualizada.emit();
      },
      error: (error) => {
        this.updatingEdicion = false;
        this.showConfirmModal = false;

        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;

        this.resultType = 'error';
        this.resultTitle = 'No se pudo actualizar';
        this.resultMessage =
          backendMessage || 'La operación no se pudo completar. Intenta nuevamente.';
        this.showResultModal = true;
      },
    });
  }

  closeResultModal(): void {
    this.showResultModal = false;
    this.resetResult();
    this.resetSelection();
  }

  isFormValid(): boolean {
    const tituloValido = this.editForm.titulo.trim().length > 0;
    const volumenValido = this.isValidPositiveInteger(this.editForm.volumen);
    const numeroValido = this.isValidPositiveInteger(this.editForm.numero);
    const anioValido =
      this.editForm.anio !== null &&
      Number.isInteger(this.editForm.anio) &&
      this.editForm.anio >= 1900 &&
      this.editForm.anio <= 2100;
    const estadoValido = this.editForm.estadoId !== null && [1, 2, 3].includes(this.editForm.estadoId);

    return tituloValido && volumenValido && numeroValido && anioValido && estadoValido;
  }

  private isValidPositiveInteger(value: number | null): boolean {
    return value !== null && Number.isInteger(value) && value > 0;
  }

  private ensureEstadoId(estadoId: number): number {
    return [1, 2, 3].includes(estadoId) ? estadoId : 1;
  }

  private resetResult(): void {
    this.resultType = 'success';
    this.resultTitle = '';
    this.resultMessage = '';
  }

  private resetSelection(): void {
    this.selectedEdicionId = null;
    this.selectedEdicionTexto = '';
    this.editForm = {
      titulo: '',
      volumen: null,
      numero: null,
      anio: null,
      estadoId: 1,
    };
  }

}
