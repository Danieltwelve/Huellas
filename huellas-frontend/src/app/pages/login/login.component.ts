import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, Credentials } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  showVerificationModal = false;
  showWrongModal = false;

  correo = '';
  contrasena = '';

  get isFormValid(): boolean {
    return this.correo.trim().length > 0 && this.contrasena.trim().length > 0;
  }

  async loginWithEmailAndPassword(): Promise<void> {
    try {
      const credentials: Credentials = {
        correo: this.correo.trim(),
        contraseña: this.contrasena,
      };

      await this.authService.logInWithEmailAndPassword(credentials);
      await this.router.navigate(['/']);
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
        this.showVerificationModal = true;
      } else {
        this.showWrongModal = true;
      }
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/']);
    } catch (error) {
      alert('Hubo un problema al cerrar sesión.');
    }
  }

  async onGoogleLogin() {
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/']);
    } catch (error) {
      alert('Hubo un problema al iniciar sesión.');
    }
  }

  async onMicrosoftLogin() {
    try {
      await this.authService.loginWithMicrosoft();
      this.router.navigate(['/']);
    } catch (error) {
      alert('Hubo un problema al iniciar sesión.');
    }
  }

  closeVerificationModal(): void {
    this.showVerificationModal = false;
  }

  closeWrongModal(): void {
    this.showWrongModal = false;
  }
}
