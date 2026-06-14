import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  EdicionesRevistaService,
  EdicionRevistaBackend,
} from '../../../../../core/ediciones-revista/ediciones.revista.service';
import { ArticulosService } from '../../../../../core/articulos/articulos.service';

@Component({
  selector: 'app-publicacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class Publicacion implements OnInit {
  @Input() articuloId: number | null = null;
  @Input() etapaActualTerminada = false;
  @Input() doiInicial = '';
  @Input() issnInicial = '';
  @Input() paginasInicial = '';
  @Input() edicionIdInicial: number | null = null;
  @Output() publicacionCompletada = new EventEmitter<void>();

  private edicionesService = inject(EdicionesRevistaService);
  private articulosService = inject(ArticulosService);

  edicionesList: EdicionRevistaBackend[] = [];
  edicionSeleccionadaId: number | null = null;
  doiPublicacion = '';
  issnPublicacion = '';
  paginasPublicacion = '';
  guardandoMetadata = false;

  ngOnInit(): void {
    this.cargarEdiciones();
    this.edicionSeleccionadaId = this.edicionIdInicial;
    this.doiPublicacion = this.doiInicial;
    this.issnPublicacion = this.issnInicial;
    this.paginasPublicacion = this.paginasInicial;
  }

  cargarEdiciones(): void {
    this.edicionesService.getEdiciones().subscribe({
      next: (res) => {
        this.edicionesList = res.data ?? [];
      },
      error: (err) => {
        console.error('Error al cargar ediciones:', err);
      },
    });
  }

  guardarMetadatosPublicacion(): void {
    if (!this.articuloId) return;
    if (!this.edicionSeleccionadaId) {
      console.warn('Debes seleccionar una edición antes de guardar.');
      return;
    }

    this.guardandoMetadata = true;

    this.articulosService
      .guardarMetadataPublicacion(this.articuloId, {
        edicionId: this.edicionSeleccionadaId,
        doi: this.doiPublicacion.trim() || undefined,
        issn: this.issnPublicacion.trim() || undefined,
        paginas: this.paginasPublicacion.trim() || undefined,
        publicar: false, // Siempre guardar como borrador (no cerrar la etapa)
      })
      .subscribe({
        next: (res) => {
          this.guardandoMetadata = false;
          this.publicacionCompletada.emit(); // Notificar al padre para recargar
        },
        error: (err) => {
          this.guardandoMetadata = false;
          console.error('Error al procesar metadatos', err);
        },
      });
  }
}
