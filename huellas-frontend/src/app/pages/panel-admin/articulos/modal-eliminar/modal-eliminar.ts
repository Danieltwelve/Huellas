import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticulosService } from '../../../../core/articulos/articulos.service';

@Component({
  selector: 'app-modal-eliminar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-eliminar.html',
  styleUrl: './modal-eliminar.css',
})
export class ModalEliminar {
  private articulosService = inject(ArticulosService);

  @Input() articulo: any;
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<number>();

  eliminando = false;

  confirmarEliminacion(): void {
    if (this.eliminando) return;
    this.eliminando = true;

    this.articulosService.eliminarArticulo(this.articulo.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.confirmar.emit(this.articulo.id);
        this.cerrar.emit();
      },
      error: (err) => {
        this.eliminando = false;
        console.error('Error al eliminar artículo:', err);
      },
    });
  }

  cancelar(): void {
    this.cerrar.emit();
  }
}
