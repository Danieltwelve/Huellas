import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private usersService = inject(UsersService);

  nombre = '';
  telefono = '';
  mensaje = '';
  showConfirmModal = false;

  ngOnInit(): void {
    this.usersService.getPerfilUsuario().subscribe({
      next: (perfil) => {
        this.nombre = perfil.nombre ?? '';
        this.telefono = perfil.telefono ?? '';
      },
      error: (error) => {
        console.error('No se pudo cargar el perfil del usuario.', error);
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
          this.mensaje = 'Perfil actualizado correctamente.';
          this.closeConfirmModal();
        },
        error: (error) => {
          console.error('No se pudo actualizar el perfil del usuario.', error);
        },
      });
  }
}
