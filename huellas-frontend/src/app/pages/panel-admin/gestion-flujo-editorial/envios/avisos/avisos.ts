import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvisosService, Aviso } from '../../../../../core/avisos/avisos.service';
import { ModalCrearAviso } from './modal-crear/modal-crear';
import { ModalEliminarAviso } from './modal-eliminar/modal-eliminar';
import { ModalEditarAviso, OpenEditarAvisoData } from './modal-editar/modal-editar';

@Component({
  selector: 'app-avisos',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalCrearAviso, ModalEliminarAviso, ModalEditarAviso],
  templateUrl: './avisos.html',
  styleUrl: './avisos.css',
})
export class Avisos implements OnInit {
  private avisosService = inject(AvisosService);

  terminoBusqueda = '';
  avisos: Aviso[] = [];
  loading = false;
  error: string | null = null;

  @ViewChild(ModalCrearAviso) modalCrear!: ModalCrearAviso;
  @ViewChild(ModalEliminarAviso) modalEliminar!: ModalEliminarAviso;
  @ViewChild(ModalEditarAviso) modalEditar!: ModalEditarAviso;

  ngOnInit(): void {
    this.cargarAvisos();
  }

  cargarAvisos(): void {
    this.loading = true;
    this.error = null;
    this.avisosService.getAvisos().subscribe({
      next: (data) => {
        this.avisos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar avisos:', err);
        this.error = 'No se pudieron cargar los avisos.';
        this.loading = false;
      },
    });
  }

  get avisosFiltrados(): Aviso[] {
    if (!this.terminoBusqueda.trim() || this.loading) {
      return this.avisos;
    }
    const busqueda = this.terminoBusqueda.toLowerCase();
    return this.avisos.filter(
      (a) =>
        a.tipo.toLowerCase().includes(busqueda) ||
        a.titulo.toLowerCase().includes(busqueda) ||
        a.mensaje.toLowerCase().includes(busqueda) ||
        a.fecha.toLowerCase().includes(busqueda),
    );
  }

  getBadgeClass(tipo: string): string {
    switch (tipo.toLowerCase()) {
      case 'importante':
        return 'badge-importante';
      case 'evento':
        return 'badge-evento';
      case 'actualización':
        return 'badge-actualizacion';
      default:
        return '';
    }
  }

  abrirModalCrear(): void {
    this.modalCrear.openModal();
  }

  recargarAvisos(): void {
    this.cargarAvisos();
  }

  editarAviso(aviso: Aviso): void {
    const data: OpenEditarAvisoData = {
      id: aviso.id,
      titulo: aviso.titulo,
      tipo: aviso.tipo,
      mensaje: aviso.mensaje,
      fecha: aviso.fecha.split('T')[0], // asegurar formato YYYY-MM-DD
    };
    this.modalEditar.openModal(data);
  }

  eliminarAviso(aviso: Aviso): void {
    this.modalEliminar.openModal(aviso.id, aviso.titulo);
  }

  trackById(index: number, item: Aviso): number {
    return item.id;
  }
}
