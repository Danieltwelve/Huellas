import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../../../core/components/modal-shell/modal-shell.component';
import {
  CreateEdicionRevistaPayload,
  EdicionesRevistaService,
} from '../../../../../../core/ediciones-revista/ediciones.revista.service';

interface CrearEdicionForm {
  titulo: string;
  volumen: number | null;
  numero: number | null;
  anio: number | null;
}

@Component({
  selector: 'app-modal-crear',
  standalone: true,
  imports: [DatePipe, FormsModule, ModalShellComponent],
  templateUrl: './modal-crear.html',
  styleUrl: './modal-crear.css',
})
export class ModalCrear {
  private readonly edicionesRevistaService = inject(EdicionesRevistaService);

  @Output() creada = new EventEmitter<void>();

  isOpen = false;
  showSuccessModal = false;
  creatingEdicion = false;
  requestError = '';
  currentDate = new Date();

  portadaFile: File | null = null;

  createForm: CrearEdicionForm = {
    titulo: '',
    volumen: null,
    numero: null,
    anio: null,
  };

  openModal(): void {
    this.requestError = '';
    this.isOpen = true;
  }

  closeModal(): void {
    if (this.creatingEdicion) {
      return;
    }
    this.resetForm();
    this.requestError = '';
    this.isOpen = false;
  }

  onPortadaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.portadaFile = input.files[0];
    } else {
      this.portadaFile = null;
    }
  }

  onGuardarClick(): void {
    if (!this.isFormValid() || this.creatingEdicion) {
      return;
    }

    this.creatingEdicion = true;
    this.requestError = '';

    // Crear FormData
    const formData = new FormData();
    formData.append('titulo', this.createForm.titulo.trim());
    formData.append('volumen', String(this.createForm.volumen));
    formData.append('numero', String(this.createForm.numero));
    formData.append('anio', String(this.createForm.anio));

    if (this.portadaFile) {
      formData.append('portada', this.portadaFile, this.portadaFile.name);
    }

    this.edicionesRevistaService.createEdicionConPortada(formData).subscribe({
      next: () => {
        this.creatingEdicion = false;
        this.isOpen = false;
        this.showSuccessModal = true;
        this.creada.emit();
      },
      error: (error) => {
        this.creatingEdicion = false;
        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;
        this.requestError =
          backendMessage || 'No se pudo crear la edición. Verifica los datos e intenta de nuevo.';
      },
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.resetForm();
  }

  isFormValid(): boolean {
    const tituloValido = this.createForm.titulo.trim().length > 0;
    const volumenValido = this.isValidPositiveInteger(this.createForm.volumen);
    const numeroValido = this.isValidPositiveInteger(this.createForm.numero);
    const anioValido =
      this.createForm.anio !== null &&
      Number.isInteger(this.createForm.anio) &&
      this.createForm.anio >= 1900 &&
      this.createForm.anio <= 2100;
    return tituloValido && volumenValido && numeroValido && anioValido;
  }

  private isValidPositiveInteger(value: number | null): boolean {
    return value !== null && Number.isInteger(value) && value > 0;
  }

  private resetForm(): void {
    this.createForm = {
      titulo: '',
      volumen: null,
      numero: null,
      anio: null,
    };
    this.portadaFile = null;
  }

  removerPortada(): void {
    this.portadaFile = null;
    const fileInput = document.getElementById('portada-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
}
