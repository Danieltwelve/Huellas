import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-configuracion-autor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionAutorComponent {
  resumenSemanal = true;
  alertasCorreo = true;
  vistaCompacta = false;

  onResumenSemanalChange(event: Event): void {
    this.resumenSemanal = (event.target as HTMLInputElement).checked;
  }

  onAlertasCorreoChange(event: Event): void {
    this.alertasCorreo = (event.target as HTMLInputElement).checked;
  }

  onVistaCompactaChange(event: Event): void {
    this.vistaCompacta = (event.target as HTMLInputElement).checked;
  }
}
