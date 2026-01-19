import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-desarrollado-por',
  templateUrl: './desarrollado-por.component.html',
  styleUrls: ['./desarrollado-por.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DesarrolladoPorComponent {
  tecnologias = [
    { nombre: 'Angular', descripcion: 'Framework frontend moderno' },
    { nombre: 'TypeScript', descripcion: 'Lenguaje de programación tipado' },
    { nombre: 'Node.js', descripcion: 'Runtime para JavaScript' },
    { nombre: 'PostgreSQL', descripcion: 'Base de datos relacional' }
  ];

  equipo = [
    { nombre: 'Dev Team HUELLAS', rol: 'Desarrollo Full Stack' },
    { nombre: 'UX/UI Design', rol: 'Diseño y Experiencia' }
  ];
}
