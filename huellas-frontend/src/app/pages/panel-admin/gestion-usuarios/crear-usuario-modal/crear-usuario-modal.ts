import { Component, EventEmitter, OnInit, inject, Output, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolBackend, UsersService } from '../../../../core/users/users.service';

interface CreateUserForm {
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string;
  institucion: string;
  perfil: '';
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
  private cdr = inject(ChangeDetectorRef);

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  showSuccessModal = false;
  showConfirmationModal = false;
  showForm = true;
  creatingUser = false;
  requestError = '';
  availableRoles: RolBackend[] = [];
  revisorRoleId: number | null = null;

  createForm: CreateUserForm = {
    nombre: '',
    correo: '',
    contrasena: '',
    telefono: '',
    institucion: '',
    perfil: '',
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
    return phone === '' || /^\d+$/.test(phone);
  }

  isValidPassword(): boolean {
    return this.createForm.contrasena.length >= 6;
  }

  isFormValid(): boolean {
    return (
      this.isValidName() &&
      this.isValidEmail() &&
      this.isValidPassword() &&
      this.isValidPhone() &&
      this.createForm.rol > 0
    );
  }

  getSelectedRoleName(): string {
    const role = this.availableRoles.find((r) => r.id == this.createForm.rol);
    return role ? this.getRoleLabel(role.rol) : 'Rol no asignado';
  }

  private loadRoles(): void {
    this.usersService.getRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
        const revisor = roles.find((r) => r.rol === 'revisor');
        this.revisorRoleId = revisor ? revisor.id : null;
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

  onRolChange(nuevoRol: number): void {
    this.createForm.rol = nuevoRol;
    this.cdr.markForCheck();
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

    const payload: any = {
      nombre: this.createForm.nombre.trim(),
      correo: this.createForm.correo.trim(),
      contraseña: this.createForm.contrasena,
      telefono: this.createForm.telefono.trim(),
      institucion: this.createForm.institucion.trim(),
      rolId: Number(this.createForm.rol),
    };

    const selectedRole = this.availableRoles.find((r) => r.id === this.createForm.rol);
    if (selectedRole?.rol === 'revisor') {
      payload.perfil = this.createForm.perfil?.trim() || '';
    }

    console.log('Payload final:', payload);
    this.usersService.createAdmin(payload).subscribe({
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
      perfil: '',
      institucion: '',
      rol: this.availableRoles[0]?.id ?? 1,
    };
  }

  get isRevisorSelected(): boolean {
    return this.createForm.rol == this.revisorRoleId;
  }
}
