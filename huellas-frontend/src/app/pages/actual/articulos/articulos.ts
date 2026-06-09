import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ArticuloDetalle {
  id: number;
  titulo: string;
  resumen: string;
  autores: Array<{ id: number; nombre: string; correo: string }>;
}

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './articulos.html',
  styleUrls: ['./articulos.css'],
})
export class Articulos {
  @Input() articulos: ArticuloDetalle[] = [];
}
