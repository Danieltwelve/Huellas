import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-perfil-revisor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './perfil-revisor.component.html',
  styleUrls: ['./perfil-revisor.component.css'],
})
export class PerfilRevisorComponent {
  nombre = 'Revisor Academico';
  correo = 'revisor@huellas.edu.co';
  especialidad = 'Investigacion educativa';
  institucion = 'Universidad de Huellas';
  mensaje = '';

  guardarPerfil(): void {
    this.mensaje = 'Cambios de perfil guardados en frontend.';
  }
}
