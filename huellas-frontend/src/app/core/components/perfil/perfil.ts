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
  mensaje = '';
  showConfirmModal = false;

  ngOnInit(): void {
    this.usersService.getPerfilUsuario().subscribe({
      next: (perfil) => {
        this.userId = perfil.id;
        this.nombre = perfil.nombre ?? '';
        this.telefono = perfil.telefono ?? '';
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
      })
      .subscribe({
        next: (perfil) => {
          this.nombre = perfil.nombre ?? '';
          this.telefono = perfil.telefono ?? '';
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
