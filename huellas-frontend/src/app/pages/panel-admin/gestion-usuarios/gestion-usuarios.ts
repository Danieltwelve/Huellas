import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { UsersService } from '../../../core/users/users.service';
import { CrearUsuarioModal } from './crear-usuario-modal/crear-usuario-modal';
import { EditarUsuarioModal } from './editar-usuario-modal/editar-usuario-modal';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../../../core/components/modal-shell/modal-shell.component';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  correoVerificado: string;
  institucion?: string;
  perfil?: string;
  estado: string;
  rol: string;
  estadoClass: string;
  rolClass: string;
}

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, CrearUsuarioModal, EditarUsuarioModal, ModalShellComponent],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})
export class GestionUsuarios implements OnInit {
  private usersService = inject(UsersService);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  searchTerm = '';
  loading = false;
  errorMessage = '';
  currentPage = 1;
  pageSize = 8;
  totalUsersCount = 0;
  activeUsersCount = 0;
  pendingUsersCount = 0;
  roleUsersCountValue = 0;
  totalPages = 1;
  showCreateModal = false;
  showEditModal = false;
  showDeleteConfirmModal = false;
  showRestrictionModal = false;
  deletingUserId: number | null = null;
  restrictionMessage = '';

  users: Usuario[] = [];
  filteredUsers: Usuario[] = [];
  selectedUserToEdit: Usuario | null = null;
  selectedUserToDelete: Usuario | null = null;

  ngOnInit(): void {
    this.loadUsers(1);
  }

  private loadUsers(page = this.currentPage): void {
    this.loading = true;
    this.errorMessage = '';
    this.currentPage = page;

    this.usersService
      .getAll({
        page: this.currentPage,
        limit: this.pageSize,
        search: this.searchTerm.trim() || undefined,
      })
      .subscribe({
        next: (response) => {
          const data = response.items;
          const loggedUserEmail = this.auth.currentUser?.email?.trim().toLowerCase() ?? '';
          const visibleUsers = loggedUserEmail
            ? data.filter((u) => u.correo.toLowerCase() !== loggedUserEmail)
            : data;

          this.users = visibleUsers.map((u) => ({
            id: u.id,
            nombre: u.nombre || 'Sin nombre',
            correo: u.correo || 'Sin correo',
            telefono: u.telefono || '',
            institucion: u.institucion ?? '',
            perfil: u.perfil ?? '',
            correoVerificado: u.correo_verificado ? 'Verificado' : 'Pendiente',
            estado: u.estado_cuenta ? 'Activa' : 'Inactiva',
            rol: u.roles?.map((r) => this.getRoleLabel(r.rol)).join(', ') ?? 'Sin rol',
            estadoClass: u.estado_cuenta ? 'active' : 'inactive',
            rolClass: this.getRoleClass(u.roles?.[0]?.rol ?? ''),
          }));
          this.filteredUsers = [...this.users];
          this.totalUsersCount = response.meta.total;
          this.activeUsersCount = response.meta.activeUsers;
          this.pendingUsersCount = response.meta.pendingUsers;
          this.roleUsersCountValue = response.meta.roleUsersCount;
          this.totalPages = response.meta.totalPages;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'No se pudieron cargar los usuarios. Intenta de nuevo.';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  onSearch(): void {
    this.loadUsers(1);
  }

  onCreateUser(): void {
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  onEditUser(user: Usuario): void {
    this.selectedUserToEdit = { ...user };
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUserToEdit = null;
    this.cdr.detectChanges();
  }

  onUserEdited(): void {
    this.loadUsers(this.currentPage);
  }

  onUserCreated(): void {
    this.loadUsers(this.currentPage);
  }

  previousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.loadUsers(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.loadUsers(this.currentPage + 1);
  }

  onDeleteUser(user: Usuario): void {
    if (this.deletingUserId !== null) {
      return;
    }

    if (user.estado === 'Activa') {
      this.openRestrictionModal(
        `No se puede eliminar a ${user.nombre} porque su cuenta está activa. Primero debes desactivarla desde el panel de edición.`,
      );
      this.cdr.detectChanges();
      return;
    }

    this.selectedUserToDelete = user;
    this.showDeleteConfirmModal = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  cancelDeleteUser(): void {
    if (this.deletingUserId !== null) {
      return;
    }

    this.selectedUserToDelete = null;
    this.showDeleteConfirmModal = false;
    this.cdr.detectChanges();
  }

  closeRestrictionModal(): void {
    this.showRestrictionModal = false;
    this.restrictionMessage = '';
    this.cdr.detectChanges();
  }

  confirmDeleteUser(): void {
    if (!this.selectedUserToDelete || this.deletingUserId !== null) {
      return;
    }

    this.deletingUserId = this.selectedUserToDelete.id;
    this.errorMessage = '';

    this.usersService.deleteUser(this.selectedUserToDelete.id).subscribe({
      next: () => {
        this.selectedUserToDelete = null;
        this.showDeleteConfirmModal = false;
        this.deletingUserId = null;
        this.loadUsers(this.currentPage);
      },
      error: (error) => {
        this.selectedUserToDelete = null;
        this.showDeleteConfirmModal = false;
        this.deletingUserId = null;
        this.openRestrictionModal(
          error?.error?.message || 'No se pudo eliminar el usuario. Intenta de nuevo.',
        );
        this.cdr.detectChanges();
      },
    });
  }

  private openRestrictionModal(message: string): void {
    this.restrictionMessage = message;
    this.showRestrictionModal = true;
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

  private getRoleClass(role: string): string {
    const normalizedRole = role.trim().toLowerCase();

    if (normalizedRole === 'comite-editorial') {
      return 'comite-editorial';
    }

    return normalizedRole.replace(/[_-]+/g, '-');
  }
}
