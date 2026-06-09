import { Component, EventEmitter, Output } from '@angular/core';
import { Ediciones } from '../publicacion/ediciones/ediciones';
import { Requisitos } from './requisitos/requisitos';

export type EnvioSidebarId = 'requisitos-envio' | 'ediciones';

interface EnvioSidebarItem {
  id: EnvioSidebarId;
  label: string;
}

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [Requisitos, Ediciones],
  templateUrl: './envios.html',
  styleUrl: './envios.css',
})
export class Envios {
  @Output() guardar = new EventEmitter<void>();

  readonly sidebarItems: EnvioSidebarItem[] = [
    { id: 'requisitos-envio', label: 'Requisitos de envío' },
    { id: 'ediciones', label: 'Ediciones' },
  ];

  activeSidebarItem: EnvioSidebarId = 'requisitos-envio';

  selectSidebarItem(itemId: EnvioSidebarId): void {
    this.activeSidebarItem = itemId;
  }

  onGuardar(): void {
    this.guardar.emit();
  }
}
