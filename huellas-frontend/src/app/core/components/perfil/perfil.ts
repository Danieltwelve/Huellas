import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private usersService = inject(UsersService);

  userId = 0;
  nombre = '';
  telefono = '';
  profesion = '';
  programa = '';
  tienePosgrado = false;
  posgradoTipo = '';
  posgradoDetalle = '';
  estudiantePosgrado = false;
  edad: number | null = null;
  mensaje = '';
  showConfirmModal = false;

  ngOnInit(): void {
    this.usersService.getPerfilUsuario().subscribe({
      next: (perfil) => {
        this.userId = perfil.id;
        this.nombre = perfil.nombre ?? '';
        this.telefono = perfil.telefono ?? '';
        this.profesion = perfil.profesion ?? '';
        this.programa = perfil.programa ?? '';
        this.tienePosgrado = perfil.tienePosgrado ?? false;
        this.posgradoTipo = perfil.posgradoTipo ?? '';
        this.posgradoDetalle = perfil.posgradoDetalle ?? '';
        this.estudiantePosgrado = perfil.estudiantePosgrado ?? false;
        this.edad = perfil.edad ?? null;
      },
      error: (error) => {
        console.error('No se pudo cargar el perfil.', error);
        this.mensaje = 'Error al cargar los datos.';
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
    this.usersService
      .updatePerfilUsuario({
        nombre: this.nombre,
        telefono: this.telefono,
        profesion: this.profesion,
        programa: this.programa,
        tienePosgrado: this.tienePosgrado,
        posgradoTipo: (this.tienePosgrado || this.estudiantePosgrado) ? this.posgradoTipo : '',
        posgradoDetalle: (this.tienePosgrado || this.estudiantePosgrado) ? this.posgradoDetalle : '',
        estudiantePosgrado: this.estudiantePosgrado,
        edad: this.edad,
      })
      .subscribe({
        next: (perfil) => {
          this.nombre = perfil.nombre ?? '';
          this.telefono = perfil.telefono ?? '';
          this.profesion = perfil.profesion ?? '';
          this.programa = perfil.programa ?? '';
          this.tienePosgrado = perfil.tienePosgrado ?? false;
          this.posgradoTipo = perfil.posgradoTipo ?? '';
          this.posgradoDetalle = perfil.posgradoDetalle ?? '';
          this.estudiantePosgrado = perfil.estudiantePosgrado ?? false;
          this.edad = perfil.edad ?? null;
          this.closeConfirmModal();
          this.mensaje = 'Perfil actualizado correctamente.';
        },
        error: (error) => {
          this.closeConfirmModal();
          this.mensaje = error?.error?.message || 'Error al actualizar el perfil.';
        },
      });
  }
}
