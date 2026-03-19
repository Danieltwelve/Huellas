import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  showVerificationModal = false;
  showWrongModal = false;
  wrongModalMessage = 'Hubo un problema al iniciar sesión con correo y contraseña.';
  showMicrosoftLinkModal = false;
  showMicrosoftLinkResultModal = false;
  microsoftLinkResultSuccess = false;
  microsoftLinkResultMessage = '';
  microsoftLinkEmail = '';
  microsoftLinkPassword = '';
  microsoftLinkError = '';
  linkingMicrosoft = false;

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
      this.router.navigate(['/']);
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
        this.showVerificationModal = true;
        this.cdr.detectChanges();
      } else {
        this.wrongModalMessage = 'Hubo un problema al iniciar sesión con correo y contraseña.';
        this.showWrongModal = true;
        this.cdr.detectChanges();
      }
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/']);
    } catch (error) {
      alert('Hubo un problema al cerrar sesión.');
      this.showWrongModal = true;
      this.cdr.detectChanges();
    }
  }

  async onGoogleLogin() {
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/']);
    } catch (error) {
      this.showWrongModal = true;
      this.cdr.detectChanges();
    }
  }

  async onMicrosoftLogin() {
    try {
      await this.authService.loginWithMicrosoft();
      this.router.navigate(['/']);
    } catch (error: any) {
      if (error instanceof Error && error.message === 'MICROSOFT_LINK_REQUIRED') {
        this.microsoftLinkEmail = this.authService.getPendingMicrosoftLinkEmail() ?? '';
        this.microsoftLinkPassword = '';
        this.microsoftLinkError = '';
        this.showMicrosoftLinkModal = true;
        this.cdr.detectChanges();
        return;
      }

      this.wrongModalMessage = 'Hubo un problema al iniciar sesión con Microsoft.';
      this.showWrongModal = true;
      this.cdr.detectChanges();
    }
  }

  async submitMicrosoftLink(): Promise<void> {
    const password = this.microsoftLinkPassword.trim();
    if (!password || this.linkingMicrosoft) {
      this.microsoftLinkError = 'Debes ingresar tu contraseña para continuar.';
      return;
    }

    this.linkingMicrosoft = true;
    this.microsoftLinkError = '';

    try {
      await this.authService.linkMicrosoftWithPassword(password);
      this.showMicrosoftLinkModal = false;
      this.microsoftLinkResultSuccess = true;
      this.microsoftLinkResultMessage =
        'Tu cuenta fue vinculada exitosamente. Ya puedes iniciar sesión con Microsoft.';
      this.showMicrosoftLinkResultModal = true;
    } catch (error: any) {
      this.showMicrosoftLinkModal = false;
      this.microsoftLinkResultSuccess = false;
      this.microsoftLinkResultMessage =
        error instanceof Error && error.message === 'MICROSOFT_LINK_INVALID_PASSWORD'
          ? 'No se pudo vincular la cuenta: la contraseña ingresada es incorrecta.'
          : 'No se pudo vincular la cuenta con Microsoft. Intenta nuevamente.';
      this.showMicrosoftLinkResultModal = true;
    } finally {
      this.linkingMicrosoft = false;
    }
  }

  closeMicrosoftLinkModal(): void {
    this.showMicrosoftLinkModal = false;
    this.microsoftLinkPassword = '';
    this.microsoftLinkError = '';
    this.authService.clearPendingMicrosoftLink();
    this.cdr.detectChanges();
  }

  async closeMicrosoftLinkResultModal(): Promise<void> {
    this.showMicrosoftLinkResultModal = false;
    this.cdr.detectChanges();
    if (this.microsoftLinkResultSuccess) {
      await this.router.navigate(['/']);
      return;
    }

    if (this.authService.getPendingMicrosoftLinkEmail()) {
      this.microsoftLinkPassword = '';
      this.microsoftLinkError = '';
      this.showMicrosoftLinkModal = true;
      this.cdr.detectChanges();
    }
  }

  closeVerificationModal(): void {
    this.showVerificationModal = false;
    this.cdr.detectChanges();
  }

  closeWrongModal(): void {
    this.showWrongModal = false;
    this.cdr.detectChanges();
  }
}
