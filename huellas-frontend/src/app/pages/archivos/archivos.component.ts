import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-archivos',
  templateUrl: './archivos.component.html',
  styleUrls: ['./archivos.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ArchivosComponent {
  archivos = [
    {
      year: 2024,
      ediciones: [
        { numero: 1, titulo: 'Edición Vol. 1 - 2024', articulos: 8, fecha: 'Enero' },
        { numero: 2, titulo: 'Edición Vol. 2 - 2024', articulos: 10, fecha: 'Abril' },
        { numero: 3, titulo: 'Edición Vol. 3 - 2024', articulos: 9, fecha: 'Julio' }
      ]
    },
    {
      year: 2023,
      ediciones: [
        { numero: 1, titulo: 'Edición Vol. 1 - 2023', articulos: 7, fecha: 'Enero' },
        { numero: 2, titulo: 'Edición Vol. 2 - 2023', articulos: 9, fecha: 'Abril' },
        { numero: 3, titulo: 'Edición Vol. 3 - 2023', articulos: 8, fecha: 'Julio' }
      ]
    },
    {
      year: 2022,
      ediciones: [
        { numero: 1, titulo: 'Edición Vol. 1 - 2022', articulos: 6, fecha: 'Enero' },
        { numero: 2, titulo: 'Edición Vol. 2 - 2022', articulos: 8, fecha: 'Abril' }
      ]
    }
  ];
}
