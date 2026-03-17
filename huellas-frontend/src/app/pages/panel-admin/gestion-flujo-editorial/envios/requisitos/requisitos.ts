import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-requisitos',
  standalone: true,
  imports: [],
  templateUrl: './requisitos.html',
  styleUrl: './requisitos.scss',
})
export class Requisitos {
  @Output() guardar = new EventEmitter<void>();

  onGuardar(): void {
    this.guardar.emit();
  }
}
