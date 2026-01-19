import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-indexacion',
  templateUrl: './indexacion.component.html',
  styleUrls: ['./indexacion.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class IndexacionComponent {
  indice = [
    { nombre: 'SCOPUS', estado: 'Indexada', enlace: 'https://www.scopus.com' },
    { nombre: 'Web of Science', estado: 'En evaluación', enlace: '#' },
    { nombre: 'Redalyc', estado: 'Indexada', enlace: 'https://www.redalyc.org' },
    { nombre: 'SciELO', estado: 'Indexada', enlace: 'https://scielo.org' }
  ];
}
