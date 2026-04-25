import { Component } from '@angular/core';
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
  imports: [Envios],
  templateUrl: './gestion-flujo-editorial.html',
  styleUrl: './gestion-flujo-editorial.scss',
})
export class GestionFlujoEditorial {
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

  selectTab(tabId: FlujoTabId): void {
    this.activeTab = tabId;
  }

  onGuardar(): void {
    // Solo diseño por ahora.
  }
}
