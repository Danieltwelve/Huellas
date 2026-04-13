import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { UsersService } from '../../../core/users/users.service';
import { CrearUsuarioModal } from './crear-usuario-modal/crear-usuario-modal';
import { EditarUsuarioModal } from './editar-usuario-modal/editar-usuario-modal';
import { CommonModule } from '@angular/common';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  correoVerificado: string;
  estado: string;
  rol: string;
}

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, CrearUsuarioModal, EditarUsuarioModal],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.scss',
})
export class GestionUsuarios implements OnInit {
  private usersService = inject(UsersService);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  searchTerm = '';
  loading = false;
  errorMessage = '';
  showCreateModal = false;
  showEditModal = false;

  users: Usuario[] = [];
  filteredUsers: Usuario[] = [];
  selectedUserToEdit: Usuario | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.usersService.getAll().subscribe({
      next: (data) => {
        const loggedUserEmail = this.auth.currentUser?.email?.trim().toLowerCase() ?? '';
        const visibleUsers = loggedUserEmail
          ? data.filter((u) => u.correo.toLowerCase() !== loggedUserEmail)
          : data;

        this.users = visibleUsers.map((u) => ({
          id: u.id,
          nombre: u.nombre || 'Sin nombre',
          correo: u.correo || 'Sin correo',
          telefono: u.telefono || '',
          correoVerificado: u.correo_verificado ? 'Verificado' : 'Pendiente',
          estado: u.estado_cuenta ? 'Activa' : 'Inactiva',
          rol: u.roles?.map((r) => this.getRoleLabel(r.rol)).join(', ') ?? 'Sin rol',
        }));
        this.filteredUsers = [...this.users];
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
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filteredUsers = this.users.filter((user) => {
      return (
        user.nombre.toLowerCase().includes(term) ||
        user.correo.toLowerCase().includes(term) ||
        user.telefono.toLowerCase().includes(term) ||
        user.correoVerificado.toLowerCase().includes(term) ||
        user.estado.toLowerCase().includes(term) ||
        user.rol.toLowerCase().includes(term)
      );
    });
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
    this.loadUsers();
  }

  onUserCreated(): void {
    this.loadUsers();
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
}
