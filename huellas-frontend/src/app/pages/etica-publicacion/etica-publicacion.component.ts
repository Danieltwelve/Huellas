import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-etica-publicacion',
  templateUrl: './etica-publicacion.component.html',
  styleUrls: ['./etica-publicacion.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class EticaPublicacionComponent {
  principios = [
    {
      titulo: 'Honestidad Intelectual',
      descripcion: 'Presentar resultados verdaderos sin manipulación de datos'
    },
    {
      titulo: 'Originalidad',
      descripcion: 'Publicar trabajos inéditos y dar crédito a fuentes previas'
    },
    {
      titulo: 'Transparencia',
      descripcion: 'Revelar conflictos de interés y fuentes de financiamiento'
    },
    {
      titulo: 'Responsabilidad',
      descripcion: 'Responder por la calidad y veracidad del trabajo presentado'
    }
  ];
}
