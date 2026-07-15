import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ArticuloResumenDetalle,
  ArticulosService,
} from '../../../../core/articulos/articulos.service';
import { UsersService } from '../../../../core/users/users.service';
import { Observable } from 'rxjs';

interface Autor {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-modal-editar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-editar.html',
  styleUrl: './modal-editar.css',
})
export class ModalEditar implements OnChanges {
  private articulosService = inject(ArticulosService);
  private usersService = inject(UsersService);

  @Input() articulo: any;
  @Output() cerrar = new EventEmitter<void>();
  @Output() cambioAutores = new EventEmitter<void>();

  codigo: string = '';
  titulo: string = '';
  resumen: string = '';
  palabrasClave: string = '';
  loadingDetalles = false;

  detallesArticulo: ArticuloResumenDetalle | null = null;

  // Copia de los datos originales para comparar cambios
  autoresIniciales: Autor[] = [];
  autoresActuales: Autor[] = [];
  autoresDisponibles: Autor[] = [];
  autoresDisponiblesFiltrados: Autor[] = [];
  searchTerm = '';
  showConfirmModal = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articulo'] && this.articulo?.id) {
      this.cargarDatosIniciales();
    }
  }

  private cargarDatosIniciales(): void {
    // Cargar detalles del artículo
    this.loadingDetalles = true;
    this.articulosService.getArticuloResumen(this.articulo.id).subscribe({
      next: (data) => {
        this.detallesArticulo = data;
        this.codigo = data.codigo;
        this.titulo = data.titulo;
        this.resumen = data.resumen;
        this.palabrasClave = data.palabrasClave.join(', ');
        this.loadingDetalles = false;
      },
      error: () => {
        this.detallesArticulo = null;
        this.loadingDetalles = false;
      },
    });

    // Cargar autores
    this.articulosService.getAutoresDeArticulo(this.articulo.id).subscribe({
      next: (data) => {
        this.autoresIniciales = data || [];
        this.autoresActuales = [...this.autoresIniciales];
        this.cargarAutoresDisponibles();
      },
      error: () => {
        this.autoresIniciales = [];
        this.autoresActuales = [];
        this.cargarAutoresDisponibles();
      },
    });
  }

  private cargarAutoresDisponibles(): void {
    this.usersService.getAutoresLista().subscribe({
      next: (todos) => {
        const idsActuales = new Set(this.autoresActuales.map((a) => a.id));
        this.autoresDisponibles = (todos || []).filter((autor) => !idsActuales.has(autor.id));
        this.filtrarAutoresDisponibles();
      },
      error: () => {
        this.autoresDisponibles = [];
        this.autoresDisponiblesFiltrados = [];
      },
    });
  }

  filtrarAutoresDisponibles(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.autoresDisponiblesFiltrados = [...this.autoresDisponibles];
    } else {
      this.autoresDisponiblesFiltrados = this.autoresDisponibles.filter((autor) =>
        autor.nombre.toLowerCase().includes(term),
      );
    }
  }

  // Operaciones locales (sin backend)
  agregarAutorLocal(autorId: number): void {
    if (this.autoresActuales.length >= 3) {
      alert('Máximo 3 autores por artículo.');
      return;
    }
    const autor = this.autoresDisponibles.find((a) => a.id === autorId);
    if (autor) {
      this.autoresActuales.push(autor);
      // Actualizar disponibles (eliminar el autor agregado)
      this.autoresDisponibles = this.autoresDisponibles.filter((a) => a.id !== autorId);
      this.filtrarAutoresDisponibles();
      this.searchTerm = '';
    }
  }

  removerAutorLocal(autorId: number): void {
    if (this.autoresActuales.length <= 1) {
      alert('El artículo debe tener al menos un autor.');
      return;
    }
    const autorRemovido = this.autoresActuales.find((a) => a.id === autorId);
    if (autorRemovido) {
      this.autoresActuales = this.autoresActuales.filter((a) => a.id !== autorId);
      // Devolver a disponibles
      this.autoresDisponibles.push(autorRemovido);
      this.autoresDisponibles.sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.filtrarAutoresDisponibles();
    }
  }

  hayCambios(): boolean {
    return this.hayCambiosCampos() || this.hayCambiosAutores();
  }

  confirmarGuardado(): void {
    this.showConfirmModal = false;

    if (!this.hayCambios() && !this.hayCambiosCampos()) {
      this.cerrar.emit();
      return;
    }

    // 1. Preparar datos del artículo
    const payloadArticulo: any = {};
    if (this.codigo !== this.detallesArticulo?.codigo) {
      payloadArticulo.codigo = this.codigo;
    }
    if (this.titulo !== this.detallesArticulo?.titulo) {
      payloadArticulo.titulo = this.titulo;
    }
    if (this.resumen !== this.detallesArticulo?.resumen) {
      payloadArticulo.resumen = this.resumen;
    }
    if (this.palabrasClave !== this.detallesArticulo?.palabrasClave.join(', ')) {
      payloadArticulo.palabrasClave = this.palabrasClave;
    }

    // 2. Calcular cambios de autores (igual que antes)
    const idsActuales = new Set(this.autoresActuales.map((a) => a.id));
    const idsIniciales = new Set(this.autoresIniciales.map((a) => a.id));
    const idsAgregar = [...idsActuales].filter((id) => !idsIniciales.has(id));
    const idsEliminar = [...idsIniciales].filter((id) => !idsActuales.has(id));

    const promises: Observable<any>[] = [];

    // Llamada para actualizar campos del artículo (si hay cambios)
    if (Object.keys(payloadArticulo).length > 0) {
      promises.push(this.articulosService.actualizarArticulo(this.articulo.id, payloadArticulo));
    }

    // Operaciones de autores (agregar/remover)
    idsAgregar.forEach((id) => {
      promises.push(this.articulosService.agregarAutorArticulo(this.articulo.id, id));
    });
    idsEliminar.forEach((id) => {
      promises.push(this.articulosService.removerAutorArticulo(this.articulo.id, id));
    });

    if (promises.length === 0) {
      this.cerrar.emit();
      return;
    }

    // Ejecutar todas las peticiones en paralelo
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(promises).subscribe({
        next: () => {
          this.cambioAutores.emit();
          this.cerrar.emit();
        },
        error: (err) => {
          // Manejar errores (mostrar mensaje específico si el código está duplicado)
          const mensaje = err?.error?.message || 'Ocurrió un error al guardar los cambios.';
          alert(mensaje);
        },
      });
    });
  }

  guardarCambios(): void {
    if (!this.hayCambios()) {
      this.cerrar.emit();
      return;
    }
    this.showConfirmModal = true;
  }

  cancelarConfirmacion(): void {
    this.showConfirmModal = false;
  }

  cancelar(): void {
    this.cerrar.emit();
  }

  hayCambiosCampos(): boolean {
    if (!this.detallesArticulo) return false;
    return (
      this.codigo !== this.detallesArticulo.codigo ||
      this.titulo !== this.detallesArticulo.titulo ||
      this.resumen !== this.detallesArticulo.resumen ||
      this.palabrasClave !== this.detallesArticulo.palabrasClave.join(', ')
    );
  }

  hayCambiosAutores(): boolean {
    if (this.autoresActuales.length !== this.autoresIniciales.length) return true;
    const idsActuales = new Set(this.autoresActuales.map((a) => a.id));
    const idsIniciales = new Set(this.autoresIniciales.map((a) => a.id));
    for (const id of idsActuales) if (!idsIniciales.has(id)) return true;
    for (const id of idsIniciales) if (!idsActuales.has(id)) return true;
    return false;
  }
}
