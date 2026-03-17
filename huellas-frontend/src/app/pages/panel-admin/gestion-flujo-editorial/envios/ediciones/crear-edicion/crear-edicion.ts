import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-crear-edicion',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './crear-edicion.html',
  styleUrl: './crear-edicion.scss',
})
export class CrearEdicion {
  private readonly edicionesRevistaService = inject(EdicionesRevistaService);

  @Output() creada = new EventEmitter<void>();

  isOpen = false;
  showSuccessModal = false;
  creatingEdicion = false;
  requestError = '';
  currentDate = new Date();

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

  onGuardarClick(): void {
    if (!this.isFormValid() || this.creatingEdicion) {
      return;
    }

    this.creatingEdicion = true;
    this.requestError = '';

    const payload: CreateEdicionRevistaPayload = {
      titulo: this.createForm.titulo.trim(),
      volumen: Number(this.createForm.volumen),
      numero: Number(this.createForm.numero),
      anio: Number(this.createForm.anio),
      fechaEstado: this.formatDateForApi(this.currentDate),
    };

    this.edicionesRevistaService.createEdicion(payload).subscribe({
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
          backendMessage ||
          'No se pudo crear la edicion. Verifica los datos e intenta de nuevo.';
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

  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private resetForm(): void {
    this.createForm = {
      titulo: '',
      volumen: null,
      numero: null,
      anio: null,
    };
  }
}
