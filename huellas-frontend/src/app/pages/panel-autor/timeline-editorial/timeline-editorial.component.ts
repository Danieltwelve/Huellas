import { Component } from '@angular/core';

interface EtapaEditorial {
  nombre: string;
  fecha: string;
  descripcion: string;
  estado: 'completada' | 'actual' | 'pendiente';
}

@Component({
  selector: 'app-timeline-editorial',
  standalone: true,
  templateUrl: './timeline-editorial.component.html',
  styleUrls: ['./timeline-editorial.component.css']
})
export class TimelineEditorialComponent {
  readonly titulo = 'Analitica de aprendizaje en entornos rurales';

  readonly etapas: EtapaEditorial[] = [
    { nombre: 'Recepcion', fecha: '06 Mar 2026', descripcion: 'Articulo recibido en plataforma', estado: 'completada' },
    { nombre: 'Antiplagio', fecha: '08 Mar 2026', descripcion: 'Similitud validada por editor', estado: 'completada' },
    { nombre: 'Revision por pares', fecha: '12 Mar 2026', descripcion: 'Evaluadores asignados y en proceso', estado: 'actual' },
    { nombre: 'Edicion', fecha: '17 Mar 2026', descripcion: 'Ajustes de estilo y maquetacion', estado: 'pendiente' },
    { nombre: 'Publicacion', fecha: 'Por definir', descripcion: 'Publicacion en volumen activo', estado: 'pendiente' },
  ];

  readonly historial = [
    {
      fecha: '12 Mar 2026, 08:40',
      titulo: 'Revision por pares iniciada',
      descripcion: 'Se asignaron dos evaluadores externos y se envio la version anonimizada del manuscrito.'
    },
    {
      fecha: '08 Mar 2026, 16:12',
      titulo: 'Antiplagio aprobado',
      descripcion: 'El documento supero la validacion de similitud y continua al comite editorial.'
    },
    {
      fecha: '06 Mar 2026, 09:00',
      titulo: 'Recepcion de articulo',
      descripcion: 'El envio fue registrado correctamente y quedo disponible para validaciones internas.'
    }
  ];

  get progreso(): number {
    const completadas = this.etapas.filter((etapa) => etapa.estado === 'completada').length;
    return Math.round((completadas / this.etapas.length) * 100);
  }

  get siguientePaso(): EtapaEditorial | null {
    return this.etapas.find((etapa) => etapa.estado === 'actual') ?? null;
  }
}
