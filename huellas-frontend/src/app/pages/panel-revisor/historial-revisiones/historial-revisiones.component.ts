import { Component } from '@angular/core';
import { HISTORIAL_REVISIONES_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-historial-revisiones',
  standalone: true,
  templateUrl: './historial-revisiones.component.html',
  styleUrls: ['./historial-revisiones.component.css'],
})
export class HistorialRevisionesComponent {
  historial = HISTORIAL_REVISIONES_MOCK;

  decisionLabel(decision: string): string {
    if (decision === 'aceptar') return 'Aceptar';
    if (decision === 'rechazar') return 'Rechazar';
    return 'Solicitar ajustes';
  }
}
