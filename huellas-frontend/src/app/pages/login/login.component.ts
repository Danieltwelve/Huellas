import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  isRegisterMode = false;
  email = '';
  password = '';
  fullName = '';
  phoneNumber = '';
  confirmPassword = '';

  switchToLogin(): void {
    this.isRegisterMode = false;
  }

  switchToRegister(): void {
    this.isRegisterMode = true;
  }

  async onGoogleLogin() {
    try {
      const user = await this.authService.loginWithGoogle();
      if (user) {
        this.router.navigate(['/home']);
      }
    } catch (error) {
      alert('Hubo un problema al iniciar sesión.');
    }
  }
}
