import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../../../core/components/modal-shell/modal-shell.component';
import { AvisosService, UpdateAvisoDto } from '../../../../../../core/avisos/avisos.service';

export interface OpenEditarAvisoData {
  id: number;
  titulo: string;
  tipo: string;
  mensaje: string;
  fecha: string; // formato YYYY-MM-DD
}

interface EditarAvisoForm {
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: string;
}

type ResultadoTipo = 'success' | 'error';

@Component({
  selector: 'app-modal-editar-aviso',
  standalone: true,
  imports: [FormsModule, ModalShellComponent],
  templateUrl: './modal-editar.html',
  styleUrl: './modal-editar.css',
})
export class ModalEditarAviso {
  private avisosService = inject(AvisosService);

  @Output() actualizado = new EventEmitter<void>();

  isOpen = false;
  showConfirmModal = false;
  showResultModal = false;
  updating = false;
  requestError = '';

  selectedAvisoId: number | null = null;
  selectedAvisoTitulo = '';

  resultType: ResultadoTipo = 'success';
  resultTitle = '';
  resultMessage = '';

  editForm: EditarAvisoForm = {
    tipo: '',
    titulo: '',
    mensaje: '',
    fecha: '',
  };

  openModal(data: OpenEditarAvisoData): void {
    this.selectedAvisoId = data.id;
    this.selectedAvisoTitulo = data.titulo;
    this.editForm = {
      tipo: data.tipo,
      titulo: data.titulo,
      mensaje: data.mensaje,
      fecha: data.fecha,
    };
    this.isOpen = true;
    this.showConfirmModal = false;
    this.showResultModal = false;
    this.requestError = '';
  }

  closeModal(): void {
    if (this.updating) return;
    this.isOpen = false;
    this.showConfirmModal = false;
    this.resetResult();
    this.resetSelection();
  }

  onGuardarClick(): void {
    if (!this.isFormValid()) return;
    this.isOpen = false;
    this.showConfirmModal = true;
  }

  closeConfirmModal(keepEditing: boolean): void {
    if (this.updating) return;
    this.showConfirmModal = false;
    if (keepEditing) {
      this.isOpen = true;
    } else {
      this.resetSelection();
    }
  }

  confirmUpdate(): void {
    if (!this.isFormValid() || this.selectedAvisoId === null || this.updating) return;
    this.updating = true;

    const payload: UpdateAvisoDto = {
      tipo: this.editForm.tipo.trim(),
      titulo: this.editForm.titulo.trim(),
      mensaje: this.editForm.mensaje.trim(),
      fecha: this.editForm.fecha,
    };

    this.avisosService.updateAviso(this.selectedAvisoId, payload).subscribe({
      next: () => {
        this.updating = false;
        this.showConfirmModal = false;
        this.resultType = 'success';
        this.resultTitle = 'Aviso actualizado';
        this.resultMessage = 'La operación se realizó exitosamente.';
        this.showResultModal = true;
        this.actualizado.emit();
      },
      error: (err) => {
        this.updating = false;
        this.showConfirmModal = false;
        const backendMessage = err?.error?.message || err?.message;
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
    return (
      this.editForm.tipo.trim().length > 0 &&
      this.editForm.titulo.trim().length > 0 &&
      this.editForm.mensaje.trim().length > 0 &&
      !!this.editForm.fecha
    );
  }

  private resetResult(): void {
    this.resultType = 'success';
    this.resultTitle = '';
    this.resultMessage = '';
  }

  private resetSelection(): void {
    this.selectedAvisoId = null;
    this.selectedAvisoTitulo = '';
    this.editForm = {
      tipo: '',
      titulo: '',
      mensaje: '',
      fecha: '',
    };
  }
}
