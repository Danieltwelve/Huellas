import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface EtapaFlujo {
  id: string;
  titulo: string;
  activa: boolean;
}

interface ArchivoRegistro {
  nombre: string;
  enlaceTexto: string;
}

interface RegistroFlujo {
  fecha: string;
  autor: string;
  asunto: string;
  comentario?: string;
  archivos?: ArchivoRegistro[];
  tipo: 'envio' | 'observacion' | 'inicio';
}

@Component({
  selector: 'app-flujo-trabajo-articulo',
  imports: [CommonModule],
  templateUrl: './flujo-trabajo-articulo.html',
  styleUrl: './flujo-trabajo-articulo.scss',
  standalone: true,
})
export class FlujoTrabajoArticulo {
  private readonly ETAPA_REVISION_PRELIMINAR = 'revision-preliminar';

  readonly tituloArticulo = 'ART-1002 - Desafios de la Inteligencia Artificial';

  readonly etapas: EtapaFlujo[] = [
    { id: 'revision-preliminar', titulo: 'Revision Preliminar', activa: true },
    { id: 'recepcion', titulo: 'Recepcion', activa: false },
    { id: 'revision-pares', titulo: 'Revision por pares', activa: false },
    { id: 'correccion-estilo', titulo: 'Correccion de estilo', activa: false },
    { id: 'publicacion', titulo: 'Publicacion', activa: false },
  ];

  readonly historialRevisionPreliminar: RegistroFlujo[] = [
    {
      fecha: '21 Mar, 2026',
      autor: 'Admin - Lucia Fernandez',
      asunto: 'Envio de Documento',
      archivos: [{ nombre: 'Manuscrito_v1.pdf', enlaceTexto: 'Descargar link' }],
      comentario: 'Adjunto el manuscrito para revision inicial.',
      tipo: 'envio',
    },
    {
      fecha: '21 Mar, 2026',
      autor: 'Admin - Lucia Fernandez',
      asunto: 'Observacion Anadida',
      comentario:
        'El formato APA no esta completamente correcto en las referencias de la pagina 5. Revisar plantilla.',
      tipo: 'observacion',
    },
    {
      fecha: '21 Mar, 2026',
      autor: 'Admin - Lucia Fernandez',
      asunto: 'Revision Preliminar Iniciada',
      comentario:
        'Comenzando la revision preliminar para cumplimiento de requisitos basicos.',
      tipo: 'inicio',
    },
  ];

  get etapaActual(): string {
    return this.etapaSeleccionada?.titulo ?? 'Sin etapa';
  }

  get etiquetaEtapaActual(): string {
    return this.etapaSeleccionada
      ? `EN ${this.etapaSeleccionada.titulo.toUpperCase()}`
      : 'SIN ETAPA';
  }

  get historialVisible(): RegistroFlujo[] {
    if (this.etapaSeleccionada?.id === this.ETAPA_REVISION_PRELIMINAR) {
      return this.historialRevisionPreliminar;
    }

    return [];
  }

  seleccionarEtapa(indice: number): void {
    this.etapas.forEach((etapa, posicion) => {
      etapa.activa = posicion === indice;
    });
  }

  private get etapaSeleccionada(): EtapaFlujo | undefined {
    return this.etapas.find((etapa) => etapa.activa);
  }
}
