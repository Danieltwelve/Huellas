import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
export class Publicacion implements OnInit, OnChanges {
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
  mostrarModalConfirmacion = false;

  get datosGuardados(): boolean {
    return this.edicionIdInicial !== null || this.etapaActualTerminada;
  }

  // DOI: letras, números y caracteres válidos (puntos, slashes, guiones)
  readonly doiPattern = /^[a-zA-Z0-9.\-/_]+$/;
  // ISSN: letras y números (alfanumérico)
  readonly issnPattern = /^[a-zA-Z0-9]+$/;

  get doiValido(): boolean {
    const v = this.doiPublicacion.trim();
    return v === '' || this.doiPattern.test(v);
  }

  get issnValido(): boolean {
    const v = this.issnPublicacion.trim();
    return v === '' || this.issnPattern.test(v);
  }

  get formularioValido(): boolean {
    return !!this.edicionSeleccionadaId && this.doiValido && this.issnValido;
  }

  ngOnInit(): void {
    this.cargarEdiciones();
    this.sincronizarValoresIniciales();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['edicionIdInicial'] ||
      changes['doiInicial'] ||
      changes['issnInicial'] ||
      changes['paginasInicial'] ||
      changes['etapaActualTerminada']
    ) {
      this.sincronizarValoresIniciales();
    }
  }

  private sincronizarValoresIniciales(): void {
    this.edicionSeleccionadaId = this.edicionIdInicial;
    this.doiPublicacion = this.doiInicial || '';
    this.issnPublicacion = this.issnInicial || '';
    this.paginasPublicacion = this.paginasInicial || '';
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
    this.mostrarModalConfirmacion = true;
  }

  cancelarGuardado(): void {
    this.mostrarModalConfirmacion = false;
  }

  confirmarGuardarMetadatos(): void {
    this.mostrarModalConfirmacion = false;
    this.guardarMetadatosPublicacionDirecto();
  }

  private guardarMetadatosPublicacionDirecto(): void {
    const edicionId = this.edicionSeleccionadaId;
    if (!this.articuloId || !edicionId) return;

    this.guardandoMetadata = true;

    this.articulosService
      .guardarMetadataPublicacion(this.articuloId, {
        edicionId: edicionId,
        doi: this.doiPublicacion.trim() || undefined,
        issn: this.issnPublicacion.trim() || undefined,
        paginas: this.paginasPublicacion.trim() || undefined,
        publicar: false,
      })
      .subscribe({
        next: (_res) => {
          this.guardandoMetadata = false;
          this.publicacionCompletada.emit();
        },
        error: (err) => {
          this.guardandoMetadata = false;
          console.error('Error al procesar metadatos', err);
        },
      });
  }
}
