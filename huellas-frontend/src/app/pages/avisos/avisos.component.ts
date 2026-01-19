import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avisos',
  templateUrl: './avisos.component.html',
  styleUrls: ['./avisos.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class AvisosComponent {
  avisos = [
    {
      id: 1,
      titulo: 'Convocatoria para Edición Especial 2025',
      fecha: '15 Febrero 2024',
      tipo: 'importante',
      contenido: 'Se abre convocatoria para la edición especial de 2025 sobre "Sostenibilidad e Innovación"'
    },
    {
      id: 2,
      titulo: 'Cambios en el Proceso de Revisión',
      fecha: '10 Febrero 2024',
      tipo: 'actualización',
      contenido: 'A partir de marzo implementaremos un nuevo sistema de revisión por pares de tres fases'
    },
    {
      id: 3,
      titulo: 'Próximo Evento Científico',
      fecha: '5 Febrero 2024',
      tipo: 'evento',
      contenido: 'Únete a nuestra mesa redonda virtual sobre "Futuro de la Investigación Académica"'
    },
    {
      id: 4,
      titulo: 'Indexación en nueva Base de Datos',
      fecha: '1 Febrero 2024',
      tipo: 'actualización',
      contenido: 'HUELLAS ahora está indexada en la base de datos SCOPUS'
    }
  ];
}
