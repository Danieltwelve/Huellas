import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/users/users.service';
import { Router } from '@angular/router';

interface EditUserData {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  estado: string;
  rol: string;
}

interface EditUserForm {
  nombre: string;
  telefono: string;
  estado: 'Activa' | 'Inactiva';
  rol: 'admin' | 'monitor' | 'autor' | 'revisor';
}

@Component({
  selector: 'app-editar-usuario-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editar-usuario-modal.html',
  styleUrl: './editar-usuario-modal.scss',
})
export class EditarUsuarioModal implements OnChanges {
  private usersService = inject(UsersService);

  @Input() user: EditUserData | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  saving = false;
  errorMessage = '';

  editForm: EditUserForm = {
    nombre: '',
    telefono: '',
    estado: 'Activa',
    rol: 'autor',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['user']) {
      return;
    }

    if (!this.user) {
      this.resetForm();
      return;
    }

    this.editForm = {
      nombre: this.user.nombre,
      telefono: this.user.telefono,
      estado: this.user.estado === 'Inactiva' ? 'Inactiva' : 'Activa',
      rol: this.normalizeRole(this.user.rol),
    };
  }

  closeModal(): void {
    this.closed.emit();
  }

  onSave(): void {
    if (!this.user || this.saving) return;

    this.saving = true;
    this.errorMessage = '';

    const roleId = this.getRoleId(this.editForm.rol);
    const estadoCuenta = this.editForm.estado === 'Activa';

    const payload = {
      nombre: this.editForm.nombre,
      correo: this.user.correo,
      telefono: this.editForm.telefono,
      estado_cuenta: estadoCuenta,
      roles: [{ id: roleId, rol: this.editForm.rol }],
    };

    this.usersService.updateUser(this.user.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.updated.emit();
        this.closeModal();
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'Error al actualizar el usuario.';
      },
    });
  }

  private resetForm(): void {
    this.editForm = {
      nombre: '',
      telefono: '',
      estado: 'Activa',
      rol: 'autor',
    };
    this.errorMessage = '';
  }

  private getRoleId(rolName: string): number {
    switch (rolName) {
      case 'admin':
        return 1;
      case 'monitor':
        return 2;
      case 'revisor':
        return 3;
      case 'autor':
        return 4;
      default:
        return 4;
    }
  }

  private normalizeRole(role: string): 'admin' | 'monitor' | 'autor' | 'revisor' {
    const firstRole = role.split(',')[0]?.trim().toLowerCase();

    if (
      firstRole === 'admin' ||
      firstRole === 'monitor' ||
      firstRole === 'autor' ||
      firstRole === 'revisor'
    ) {
      return firstRole;
    }

    return 'autor';
  }
}
