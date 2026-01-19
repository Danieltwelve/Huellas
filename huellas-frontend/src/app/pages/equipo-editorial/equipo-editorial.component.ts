import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-equipo-editorial',
  templateUrl: './equipo-editorial.component.html',
  styleUrls: ['./equipo-editorial.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class EquipoEditorialComponent {
  equipo = [
    {
      nombre: 'Dr. Juan Carlos Pérez',
      cargo: 'Editor en Jefe',
      especialidad: 'Ingeniería Ambiental',
      email: 'jperez@huellas-revista.com'
    },
    {
      nombre: 'Dra. María González López',
      cargo: 'Editora Asociada',
      especialidad: 'Sostenibilidad',
      email: 'mgonzalez@huellas-revista.com'
    },
    {
      nombre: 'Dr. Roberto Silva Martínez',
      cargo: 'Editor de Sección Científica',
      especialidad: 'Investigación Ambiental',
      email: 'rsilva@huellas-revista.com'
    },
    {
      nombre: 'Lic. Ana Rodríguez Gómez',
      cargo: 'Coordinadora Editorial',
      especialidad: 'Gestión Editorial',
      email: 'arodriguez@huellas-revista.com'
    }
  ];
}
