import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-actual',
  templateUrl: './actual.component.html',
  styleUrls: ['./actual.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ActualComponent {
  ediciones = [
    {
      id: 1,
      titulo: 'Edición Vol. 1 - 2024',
      fecha: 'Enero 2024',
      descripcion: 'Primera edición del año con artículos sobre innovación tecnológica',
      autores: 5,
      articulos: 8
    },
    {
      id: 2,
      titulo: 'Edición Vol. 2 - 2024',
      fecha: 'Abril 2024',
      descripcion: 'Segunda edición enfocada en sostenibilidad ambiental',
      autores: 7,
      articulos: 10
    },
    {
      id: 3,
      titulo: 'Edición Vol. 3 - 2024',
      fecha: 'Julio 2024',
      descripcion: 'Tercera edición con investigaciones en inteligencia artificial',
      autores: 6,
      articulos: 9
    }
  ];
}
