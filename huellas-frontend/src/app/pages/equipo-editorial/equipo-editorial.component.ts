import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-equipo-editorial',
  templateUrl: './equipo-editorial.component.html',
  styleUrls: ['./equipo-editorial.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class EquipoEditorialComponent {
  equipo = [
    {
      id: 1,
      nombre: 'Omar Armando Pantoja Villota',
      cargo: 'Director editorial',
      especialidad: 'Colombiano',
      descripcion: 'Es Licenciado en Informática, magister y Doctor en Ciencias de la Educación.',
      imagen: '/equipo/Omar.png',
      email: 'omarvillota2@gmail.com'
    },
    {
      id: 2,
      nombre: 'Juan Esteban Toro Valencia',
      cargo: 'Miembro Patrimonial bajo legislación colombiana, miembro independiente bajo estándares Dow Jones',
      especialidad: '',
      descripcion: '',
      imagen: '/equipo/Omar.png',
      email: 'juan.toro@huellas-revista.com'
    },
    {
      id: 3,
      nombre: 'María Angelica Arbeláez Restrepo',
      cargo: 'Miembro independiente',
      especialidad: '',
      descripcion: '',
      imagen: '/equipo/Omar.png',
      email: 'maria.arbelaez@huellas-revista.com'
    },
    {
      id: 4,
      nombre: 'Luis Fernando Restrepo Echavarría',
      cargo: 'Presidente de Junta Directiva-Miembro no independiente bajo legislación colombiana, miembro independiente bajo estándares Dow Jones',
      especialidad: '',
      descripcion: '',
      imagen: '/equipo/Omar.png',
      email: 'luis.restrepo@huellas-revista.com'
    }
  ];
}
