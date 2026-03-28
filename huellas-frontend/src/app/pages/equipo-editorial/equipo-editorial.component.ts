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
  coordinador = {
    id: 1,
    nombre: 'Dr. Omar Armando Villota Pantoja',
    cargo: 'Editor Académico',
    institucion: 'Universidad de Nariño',
    facultad: 'Facultad de Educación',
    imagen: '/equipo/Omar.png'
  };

  comiteEditorial = [
    {
      nombre: 'Mg. Claudia Solarte',
      institucion: 'Institución Universitaria CESMAG'
    },
    {
      nombre: 'Mg. Mónica Vallejo Achicanoy',
      institucion: 'Universidad de Nariño'
    },
    {
      nombre: 'Mg. Hernán Rivas Escobar',
      institucion: 'Universidad de Nariño - CORPONARIÑO'
    }
  ];

  comiteCientifico = [
    {
      nombre: 'Dr. Antonio Miñan Espigares',
      institucion: 'Universidad de Granada'
    },
    {
      nombre: 'Dr. Nelson Torres Vega',
      institucion: 'Universidad de Nariño'
    },
    {
      nombre: 'Dra. Raquel Fuentes Vela',
      institucion: 'Universidad del Cauca'
    },
    {
      nombre: 'Dra. Marina Vela Escandón',
      institucion: 'Universidad de la Amazonia'
    },
    {
      nombre: 'Dra. Amanda Juárez',
      institucion: 'Benemerita Escuela Normal Superior de Maestros'
    }
  ];

  monitor = {
    nombre: 'Julieth Katherin Lorza Erazo',
    cargo: 'Monitora Huellas Revista'
  };
}
