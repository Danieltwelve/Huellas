import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RevisoresService } from '../../../core/revisores/revisores.service';

@Component({
  selector: 'app-perfil-revisor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './perfil-revisor.component.html',
  styleUrls: ['./perfil-revisor.component.css'],
})
export class PerfilRevisorComponent implements OnInit {
  private revisoresService = inject(RevisoresService);

  nombre = '';
  telefono = '';
  perfilAcademico = '';
  institucion = '';
  mensaje = '';
  showConfirmModal = false;

  ngOnInit(): void {
    this.revisoresService.getPerfilRevisor().subscribe({
      next: (perfil) => {
        this.nombre = perfil.nombre ?? '';
        this.telefono = perfil.telefono ?? '';
        this.perfilAcademico = perfil.perfilAcademico ?? '';
        this.institucion = perfil.institucion ?? '';
      },
      error: (error) => {
        console.error('No se pudo cargar el perfil del revisor.', error);
      },
    });
  }

  openConfirmModal(): void {
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  confirmSave(): void {
    this.mensaje = '';
    this.revisoresService
      .updatePerfilRevisor({
        nombre: this.nombre,
        telefono: this.telefono,
        perfilAcademico: this.perfilAcademico,
        institucion: this.institucion,
      })
      .subscribe({
        next: (perfil) => {
          this.nombre = perfil.nombre ?? '';
          this.telefono = perfil.telefono ?? '';
          this.perfilAcademico = perfil.perfilAcademico ?? '';
          this.institucion = perfil.institucion ?? '';
          this.mensaje = 'Perfil actualizado correctamente.';
          this.closeConfirmModal();
        },
        error: (error) => {
          console.error('No se pudo actualizar el perfil del revisor.', error);
        },
      });
  }
}
