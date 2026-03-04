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

  correo = '';
  contrasena = '';

  async loginWithEmailAndPassword(): Promise<void> {
    try {
      const credentials: Credentials = {
        correo: this.correo,
        contraseña: this.contrasena,
      };

      await this.authService.logInWithEmailAndPassword(credentials);
      await this.router.navigate(['/']);
    } catch (error) {
      alert('Hubo un problema al iniciar sesión con correo y contraseña.');
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
      const user = await this.authService.loginWithGoogle();
    } catch (error) {
      alert('Hubo un problema al iniciar sesión.');
    }
  }
}
