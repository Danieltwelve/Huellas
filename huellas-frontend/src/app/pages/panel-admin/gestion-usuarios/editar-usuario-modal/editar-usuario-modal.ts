import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolBackend, UsersService } from '../../../../core/users/users.service';

interface EditUserData {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  institucion?: string;
  perfil?: string;
  estado: string;
  rol: string;
}

interface EditUserForm {
  nombre: string;
  correo: string;
  telefono: string;
  institucion: string;
  perfil: string;
  estado: 'Activa' | 'Inactiva';
  rol: string;
}

@Component({
  selector: 'app-editar-usuario-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editar-usuario-modal.html',
  styleUrl: './editar-usuario-modal.css',
})
export class EditarUsuarioModal implements OnInit, OnChanges {
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);

  @Input() user: EditUserData | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  saving = false;
  showConfirmModal = false;
  showForm = true;
  errorMessage = '';
  verificationMessage = '';
  resendingVerification = false;
  restoringAccess = false;
  availableRoles: RolBackend[] = [];
  private userRoleToAssign: string | null = null;

  editForm: EditUserForm = {
    nombre: '',
    correo: '',
    telefono: '',
    perfil: '',
    institucion: '',
    estado: 'Activa',
    rol: 'autor',
  };

  ngOnInit(): void {
    this.loadRoles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['user']) {
      return;
    }

    this.showForm = true;
    this.showConfirmModal = false;

    if (!this.user) {
      this.resetForm();
      return;
    }

    this.userRoleToAssign = this.user.rol.split(',')[0]?.trim() || null;

    this.editForm = {
      nombre: this.user.nombre,
      correo: this.user.correo,
      telefono: this.user.telefono,
      institucion: this.user.institucion ?? '',
      perfil: this.user.perfil ?? '',
      estado: this.user.estado === 'Inactiva' ? 'Inactiva' : 'Activa',
      rol: this.editForm.rol, // valor temporal
    };

    if (this.availableRoles.length > 0) {
      this.assignUserRole();
    }
  }

  private assignUserRole(): void {
    if (!this.userRoleToAssign) {
      this.editForm.rol = this.availableRoles[0]?.rol ?? 'autor';
      this.cdr.detectChanges();
      return;
    }

    const normalizedUserRole = this.normalizeRoleName(this.userRoleToAssign);
    const foundRole = this.availableRoles.find(
      (r) => this.normalizeRoleName(r.rol) === normalizedUserRole,
    );

    if (foundRole) {
      this.editForm.rol = foundRole.rol;
    } else {
      this.editForm.rol = this.availableRoles[0]?.rol ?? 'autor';
    }

    this.cdr.detectChanges();
  }

  private normalizeRoleName(role: string): string {
    return role
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  closeModal(): void {
    this.showForm = true;
    this.showConfirmModal = false;
    this.verificationMessage = '';

    this.closed.emit();
    this.cdr.detectChanges();
  }

  onSave(): void {
    this.showForm = false;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  cancelConfirmation(): void {
    this.showConfirmModal = false;

    this.showForm = true;
    this.cdr.detectChanges();
  }

  resendVerificationEmail(): void {
    if (!this.user || this.resendingVerification) {
      return;
    }

    this.resendingVerification = true;
    this.verificationMessage = '';

    this.usersService.resendVerificationEmail(this.user.id).subscribe({
      next: () => {
        this.resendingVerification = false;
        this.verificationMessage = 'Se reenvió el correo de verificación correctamente.';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.resendingVerification = false;
        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;

        this.verificationMessage =
          backendMessage || 'No se pudo reenviar el correo de verificación.';
        this.cdr.detectChanges();
      },
    });
  }

  restoreAccess(): void {
    if (!this.user || this.restoringAccess) {
      return;
    }

    this.restoringAccess = true;
    this.verificationMessage = '';

    this.usersService.restoreAccess(this.user.id).subscribe({
      next: () => {
        this.restoringAccess = false;
        this.verificationMessage =
          'Acceso restablecido. Se envió un correo para definir nueva contraseña.';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.restoringAccess = false;
        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;

        this.verificationMessage =
          backendMessage || 'No se pudo restablecer el acceso del usuario.';
        this.cdr.detectChanges();
      },
    });
  }

  confirmUpdate(): void {
    if (!this.user || this.saving) return;

    const selectedRole = this.availableRoles.find((role) => role.rol === this.editForm.rol);

    if (!selectedRole) {
      this.errorMessage = 'Selecciona un rol válido.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const correoNormalizado = this.editForm.correo.trim().toLowerCase();

    if (!this.isValidEmail(correoNormalizado)) {
      this.saving = false;
      this.showConfirmModal = false;
      this.showForm = true;
      this.errorMessage = 'Ingresa un correo válido.';
      return;
    }

    const estadoCuenta = this.editForm.estado === 'Activa';

    const payload = {
      nombre: this.editForm.nombre,
      correo: correoNormalizado,
      telefono: this.editForm.telefono,
      institucion: this.editForm.institucion,
      perfil: this.editForm.perfil,
      estado_cuenta: estadoCuenta,
      roles: [{ id: selectedRole.id, rol: selectedRole.rol }],
    };

    this.usersService.updateUser(this.user.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.updated.emit();
        this.closeModal();
      },
      error: (error) => {
        this.saving = false;
        this.showConfirmModal = false;
        this.showForm = true;
        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;

        this.errorMessage = backendMessage || 'Error al actualizar el usuario.';
        this.cdr.detectChanges();
      },
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  getRoleLabel(role: string): string {
    if (role.trim().toLowerCase() === 'comite-editorial') {
      return 'Comité editorial';
    }

    if (role.trim().toLowerCase() === 'admin') {
      return 'Administrador';
    }

    return role
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private loadRoles(): void {
    this.usersService.getRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
        this.assignUserRole();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar los roles disponibles.';
        this.cdr.detectChanges();
      },
    });
  }

  get isRevisor(): boolean {
    return this.user?.rol?.toLowerCase().includes('revisor') ?? false;
  }

  private resetForm(): void {
    this.editForm = {
      nombre: '',
      correo: '',
      telefono: '',
      institucion: '',
      perfil: '',
      estado: 'Activa',
      rol: 'autor',
    };
    this.userRoleToAssign = null;
    this.errorMessage = '';
  }
}
