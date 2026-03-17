import { Component } from '@angular/core';
import { Envios } from './envios/envios';

type FlujoTabId =
  | 'envio'
  | 'revision-preliminar'
  | 'revision-pares'
  | 'correccion-estilo'
  | 'publicacion';

interface FlujoTab {
  id: FlujoTabId;
  label: string;
}

@Component({
  selector: 'app-gestion-flujo-editorial',
  standalone: true,
  imports: [Envios],
  templateUrl: './gestion-flujo-editorial.html',
  styleUrl: './gestion-flujo-editorial.scss',
})
export class GestionFlujoEditorial {
  readonly tabs: FlujoTab[] = [
    { id: 'envio', label: 'Envíos' },
    { id: 'revision-preliminar', label: 'Revisión Preliminar' },
    { id: 'revision-pares', label: 'Revisión por pares' },
    { id: 'correccion-estilo', label: 'Corrección de estilo' },
    { id: 'publicacion', label: 'Publicación' },
  ];

  activeTab: FlujoTabId = 'envio';

  selectTab(tabId: FlujoTabId): void {
    this.activeTab = tabId;
  }

  onGuardar(): void {
    // Solo diseño por ahora.
  }
}
