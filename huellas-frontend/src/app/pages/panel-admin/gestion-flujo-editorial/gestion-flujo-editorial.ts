import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticulosService } from '../../../core/articulos/articulos.service';
import { Envios } from './envios/envios';

type FlujoTabId =
  | 'envio'
  | 'revision-preliminar'
  | 'comite-editorial'
  | 'turnitin'
  | 'revision-pares'
  | 'certificacion'
  | 'revision-final'
  | 'publicacion';

interface FlujoTab {
  id: FlujoTabId;
  label: string;
}

@Component({
  selector: 'app-gestion-flujo-editorial',
  standalone: true,
  imports: [CommonModule, Envios],
  templateUrl: './gestion-flujo-editorial.html',
  styleUrl: './gestion-flujo-editorial.css',
})
export class GestionFlujoEditorial implements OnInit {
  private readonly articulosService = inject(ArticulosService);

  readonly tabs: FlujoTab[] = [
    { id: 'envio', label: 'Envíos' },
    { id: 'revision-preliminar', label: 'Revisión Preliminar' },
    { id: 'comite-editorial', label: 'Comité Editorial' },
    { id: 'turnitin', label: 'Turnitin' },
    { id: 'revision-pares', label: 'Revisión por pares' },
    { id: 'certificacion', label: 'Certificación' },
    { id: 'revision-final', label: 'Revisión final' },
    { id: 'publicacion', label: 'Publicación' },
  ];

  activeTab: FlujoTabId = 'envio';
  envioHabilitado = true;
  cargandoEstadoEnvios = true;
  guardandoEstadoEnvios = false;
  mostrarModalConfirmacionEnvios = false;
  estadoEnvioPendiente: boolean | null = null;

  ngOnInit(): void {
    this.cargarEstadoEnvios();
  }

  private cargarEstadoEnvios(): void {
    this.cargandoEstadoEnvios = true;

    this.articulosService.getEstadoEnviosArticulos().subscribe({
      next: (estado) => {
        this.envioHabilitado = estado.habilitado;
        this.cargandoEstadoEnvios = false;
      },
      error: () => {
        this.envioHabilitado = true;
        this.cargandoEstadoEnvios = false;
      },
    });
  }

  alternarEstadoEnvios(): void {
    if (this.guardandoEstadoEnvios) {
      return;
    }

    this.estadoEnvioPendiente = !this.envioHabilitado;
    this.mostrarModalConfirmacionEnvios = true;
  }

  cancelarConfirmacionEnvios(): void {
    this.mostrarModalConfirmacionEnvios = false;
    this.estadoEnvioPendiente = null;
  }

  confirmarEstadoEnvios(): void {
    if (this.guardandoEstadoEnvios || this.estadoEnvioPendiente === null) {
      return;
    }

    this.guardandoEstadoEnvios = true;
    this.mostrarModalConfirmacionEnvios = false;

    this.articulosService.actualizarEstadoEnviosArticulos(this.estadoEnvioPendiente).subscribe({
      next: (estado) => {
        this.envioHabilitado = estado.habilitado;
        this.guardandoEstadoEnvios = false;
        this.estadoEnvioPendiente = null;
      },
      error: () => {
        this.guardandoEstadoEnvios = false;
        this.estadoEnvioPendiente = null;
      },
    });
  }

  selectTab(tabId: FlujoTabId): void {
    this.activeTab = tabId;
  }

  onGuardar(): void {
    // Solo diseño por ahora.
  }
}
