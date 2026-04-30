import { Component, EventEmitter, OnInit, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolBackend, UsersService } from '../../../../core/users/users.service';

interface CreateUserForm {
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string;
  rol: number;
}

@Component({
  selector: 'app-crear-usuario-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './crear-usuario-modal.html',
  styleUrl: './crear-usuario-modal.css',
})
export class CrearUsuarioModal implements OnInit {
  private usersService = inject(UsersService);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  showSuccessModal = false;
  showConfirmationModal = false;
  showForm = true;
  creatingUser = false;
  requestError = '';
  availableRoles: RolBackend[] = [];

  createForm: CreateUserForm = {
    nombre: '',
    correo: '',
    contrasena: '',
    telefono: '',
    rol: 1,
  };

  ngOnInit(): void {
    this.loadRoles();
  }

  closeCreateModal(): void {
    this.resetForm();
    this.requestError = '';
    this.showConfirmationModal = false;
    this.showSuccessModal = false;
    this.showForm = true;
    this.closed.emit();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.closeCreateModal();
  }

  cancelConfirmation(): void {
    this.showConfirmationModal = false;
    this.showForm = true;
  }

  isValidName(): boolean {
    const name = this.createForm.nombre.trim();
    return name.length > 0 && !/\d/.test(name);
  }

  isValidEmail(): boolean {
    const email = this.createForm.correo.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(): boolean {
    const phone = this.createForm.telefono.trim();
    return /^\d+$/.test(phone);
  }

  isValidPassword(): boolean {
    return this.createForm.contrasena.length >= 6;
  }

  isFormValid(): boolean {
    return (
      this.isValidName() &&
      this.isValidEmail() &&
      this.isValidPhone() &&
      this.isValidPassword() &&
      this.createForm.rol > 0
    );
  }

  getSelectedRoleName(): string {
    const roleName = this.availableRoles.find((role) => role.id === this.createForm.rol)?.rol ?? '';
    return this.getRoleLabel(roleName);
  }

  private loadRoles(): void {
    this.usersService.getRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
        if (roles.length > 0) {
          const selectedExists = roles.some((role) => role.id === this.createForm.rol);
          this.createForm.rol = selectedExists ? this.createForm.rol : roles[0].id;
        }
      },
      error: () => {
        this.requestError = 'No fue posible cargar los roles disponibles.';
      },
    });
  }

  private getRoleLabel(role: string): string {
    if (role.trim().toLowerCase() === 'comite-editorial') {
      return 'Comité editorial';
    }

    return role
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      return;
    }
    this.showForm = false;
    this.showConfirmationModal = true;
  }

  confirmCreation(): void {
    if (this.creatingUser) return;

    this.creatingUser = true;
    this.requestError = '';

    this.usersService
      .createAdmin({
        nombre: this.createForm.nombre.trim(),
        correo: this.createForm.correo.trim(),
        contraseña: this.createForm.contrasena,
        telefono: this.createForm.telefono.trim(),
        rolId: this.createForm.rol,
      })
      .subscribe({
        next: () => {
          this.creatingUser = false;
          this.showConfirmationModal = false;
          this.showSuccessModal = true;
          this.created.emit();
        },
        error: (error) => {
          this.creatingUser = false;
          this.showConfirmationModal = false;
          this.showForm = true;

          const backendMessage = Array.isArray(error?.error?.message)
            ? error.error.message.join(', ')
            : error?.error?.message;

          this.requestError =
            backendMessage || 'No se pudo crear el usuario. Verifica los datos e intenta de nuevo.';
        },
      });
  }

  private resetForm(): void {
    this.createForm = {
      nombre: '',
      correo: '',
      contrasena: '',
      telefono: '',
      rol: this.availableRoles[0]?.id ?? 1,
    };
  }
}
