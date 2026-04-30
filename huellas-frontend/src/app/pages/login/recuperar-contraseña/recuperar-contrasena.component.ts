import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SuccessModalComponent } from './modal/success-modal.component';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SuccessModalComponent],
  templateUrl: './recuperar-contrasena.component.html',
  styleUrls: ['./recuperar-contrasena.component.css']
})
export class RecuperarContrasenaComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  correo = '';
  enviando = false;
  mensajeError = '';
  showSuccessModal = false;

  get correoValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo);
  }

  async enviarCorreo() {
    if (!this.correoValido || this.enviando) return;

    this.enviando = true;
    this.mensajeError = '';

    try {
      await this.authService.sendPasswordResetEmail(this.correo);
      this.showSuccessModal = true;
    } catch (error: any) {
        console.error('Error al enviar correo de recuperación:', error);
      if (error.code === 'auth/user-not-found') {
          this.mensajeError = 'No existe una cuenta asociada a este correo.';
      } else {
          this.mensajeError = 'Ocurrió un error al enviar el correo. Intenta nuevamente.';
      }
    } finally {
      this.enviando = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/login']);
  }
}
