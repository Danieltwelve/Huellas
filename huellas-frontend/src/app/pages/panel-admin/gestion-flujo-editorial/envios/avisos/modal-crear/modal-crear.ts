import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../../../core/components/modal-shell/modal-shell.component';
import { AvisosService, CreateAvisoDto } from '../../../../../../core/avisos/avisos.service';

interface CrearAvisoForm {
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: string;
}

@Component({
  selector: 'app-modal-crear-aviso',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  templateUrl: './modal-crear.html',
  styleUrl: './modal-crear.css',
})
export class ModalCrearAviso {
  private avisosService = inject(AvisosService);

  @Output() creado = new EventEmitter<void>();

  isOpen = false;
  showSuccessModal = false;
  creating = false;
  requestError = '';

  createForm: CrearAvisoForm = {
    tipo: '',
    titulo: '',
    mensaje: '',
    fecha: new Date().toISOString().split('T')[0], // fecha actual en formato YYYY-MM-DD
  };

  openModal(): void {
    this.resetForm();
    this.requestError = '';
    this.isOpen = true;
  }

  closeModal(): void {
    if (this.creating) return;
    this.isOpen = false;
  }

  onGuardarClick(): void {
    if (!this.isFormValid() || this.creating) return;

    this.creating = true;
    this.requestError = '';

    const payload: CreateAvisoDto = {
      tipo: this.createForm.tipo.trim(),
      titulo: this.createForm.titulo.trim(),
      mensaje: this.createForm.mensaje.trim(),
      fecha: this.createForm.fecha, // ya en formato YYYY-MM-DD
    };

    this.avisosService.createAviso(payload).subscribe({
      next: () => {
        this.creating = false;
        this.isOpen = false;
        this.showSuccessModal = true;
        this.creado.emit(); // notificar al padre para recargar lista
      },
      error: (err) => {
        this.creating = false;
        const backendMessage = err?.error?.message || err?.message;
        this.requestError = backendMessage || 'No se pudo crear el aviso. Intenta de nuevo.';
      },
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.resetForm();
  }

  isFormValid(): boolean {
    return (
      this.createForm.tipo.trim().length > 0 &&
      this.createForm.titulo.trim().length > 0 &&
      this.createForm.mensaje.trim().length > 0 &&
      !!this.createForm.fecha
    );
  }

  private resetForm(): void {
    this.createForm = {
      tipo: '',
      titulo: '',
      mensaje: '',
      fecha: new Date().toISOString().split('T')[0],
    };
  }
}
