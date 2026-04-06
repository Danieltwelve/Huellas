import { Component } from '@angular/core';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';

interface EstadoProrroga {
  [articleId: number]: boolean;
}

@Component({
  selector: 'app-plazo-revision',
  standalone: true,
  templateUrl: './plazo-revision.component.html',
  styleUrls: ['./plazo-revision.component.css'],
})
export class PlazoRevisionComponent {
  articulos = ARTICULOS_ASIGNADOS_MOCK;
  prorrogasSolicitadas: EstadoProrroga = {};
  mensaje = '';

  diasRestantes(fechaLimite: string): number {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    if (isNaN(limite.getTime())) return 0;

    const diffMs = limite.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  tieneProrroga(articuloId: number): boolean {
    return Boolean(this.prorrogasSolicitadas[articuloId]);
  }

  solicitarProrroga(articuloId: number): void {
    if (this.tieneProrroga(articuloId)) {
      this.mensaje = 'Este articulo ya uso su unica prorroga de 15 dias.';
      return;
    }

    this.prorrogasSolicitadas[articuloId] = true;
    this.mensaje = 'Prorroga de 15 dias solicitada correctamente.';
  }
}
