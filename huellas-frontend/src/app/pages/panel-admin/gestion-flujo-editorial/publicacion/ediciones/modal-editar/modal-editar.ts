import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../../../core/components/modal-shell/modal-shell.component';
import {
  EdicionesRevistaService,
  UpdateEdicionRevistaPayload,
} from '../../../../../../core/ediciones-revista/ediciones.revista.service';

export interface OpenEditarEdicionData {
  edicionId: number;
  edicionTexto: string;
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  portadaUrl?: string | null;
  estado_id: number;
}

interface EditarEdicionForm {
  titulo: string;
  volumen: number | null;
  numero: number | null;
  anio: number | null;
}

type ResultadoTipo = 'success' | 'error';

@Component({
  selector: 'app-modal-editar',
  standalone: true,
  imports: [FormsModule, ModalShellComponent],
  templateUrl: './modal-editar.html',
  styleUrl: './modal-editar.css',
})
export class ModalEditar {
  private readonly edicionesRevistaService = inject(EdicionesRevistaService);

  @Output() actualizada = new EventEmitter<void>();

  currentPortadaUrl: string | null = null;
  newPortadaFile: File | null = null;
  previewUrl: string | null = null;
  isDeletingCover = false;

  isOpen = false;
  showConfirmModal = false;
  showResultModal = false;
  updatingEdicion = false;

  selectedEdicionId: number | null = null;
  selectedEdicionTexto = '';

  resultType: ResultadoTipo = 'success';
  resultTitle = '';
  resultMessage = '';

  editForm: EditarEdicionForm = {
    titulo: '',
    volumen: null,
    numero: null,
    anio: null,
  };

  openModal(data: OpenEditarEdicionData): void {
    this.selectedEdicionId = data.edicionId;
    this.selectedEdicionTexto = data.edicionTexto;
    this.currentPortadaUrl = data.portadaUrl || null;

    this.editForm = {
      titulo: data.titulo,
      volumen: data.volumen,
      numero: data.numero,
      anio: data.anio,
    };

    this.newPortadaFile = null;
    this.previewUrl = null;
    this.isOpen = true;
    this.showConfirmModal = false;
    this.showResultModal = false;
  }

  onPortadaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.newPortadaFile = input.files[0];
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.newPortadaFile);
    } else {
      this.newPortadaFile = null;
      this.previewUrl = null;
    }
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

    if (this.newPortadaFile) {
      const formData = new FormData();
      formData.append('titulo', this.editForm.titulo.trim());
      formData.append('volumen', String(this.editForm.volumen));
      formData.append('numero', String(this.editForm.numero));
      formData.append('anio', String(this.editForm.anio));
      formData.append('portada', this.newPortadaFile, this.newPortadaFile.name);
      this.edicionesRevistaService
        .updateEdicionConPortada(this.selectedEdicionId, formData)
        .subscribe({
          next: () => this.handleUpdateSuccess(),
          error: (err) => this.handleUpdateError(err),
        });
    } else {
      // Solo campos de texto
      const payload: UpdateEdicionRevistaPayload = {
        titulo: this.editForm.titulo.trim(),
        volumen: Number(this.editForm.volumen),
        numero: Number(this.editForm.numero),
        anio: Number(this.editForm.anio),
      };
      this.edicionesRevistaService.updateEdicion(this.selectedEdicionId, payload).subscribe({
        next: () => this.handleUpdateSuccess(),
        error: (err) => this.handleUpdateError(err),
      });
    }
  }

  private handleUpdateSuccess(): void {
    this.updatingEdicion = false;
    this.showConfirmModal = false;
    this.resultType = 'success';
    this.resultTitle = 'Edición actualizada';
    this.resultMessage = 'La operación se realizó exitosamente.';
    this.showResultModal = true;
    this.actualizada.emit();
  }

  private handleUpdateError(error: any): void {
    this.updatingEdicion = false;
    this.showConfirmModal = false;
    const backendMessage = Array.isArray(error?.error?.message)
      ? error.error.message.join(', ')
      : error?.error?.message;
    this.resultType = 'error';
    this.resultTitle = 'No se pudo actualizar';
    this.resultMessage = backendMessage || 'La operación no se pudo completar. Intenta nuevamente.';
    this.showResultModal = true;
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
    return tituloValido && volumenValido && numeroValido && anioValido;
  }

  private isValidPositiveInteger(value: number | null): boolean {
    return value !== null && Number.isInteger(value) && value > 0;
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
    };
  }

  removeCover(): void {
    if (!this.selectedEdicionId || this.isDeletingCover) return;
    this.isDeletingCover = true;
    this.edicionesRevistaService.deletePortada(this.selectedEdicionId).subscribe({
      next: () => {
        this.isDeletingCover = false;
        this.closeModal();
        this.actualizada.emit();
      },
      error: (err) => {
        this.isDeletingCover = false;
        const msg = err?.error?.message || 'Error al eliminar la portada.';
        alert(msg);
      },
    });
  }
}
