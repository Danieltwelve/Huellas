import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, Credentials, RegisterUserAttributes } from '../../core/auth/auth.service';

interface RegisterFormModel {
  nombre: FormControl<string | null>;
  correo: FormControl<string | null>;
  contraseña: FormControl<string | null>;
  autorizacionDatos: FormControl<boolean | null>;
}

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [RouterLink, ReactiveFormsModule],
})
export class RegisterComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  isRegistering = false;
  showVerificationModal = false;
  showWrongModal = false;
  wrongModalMessage = 'Hubo un problema al registrarse';
  registerInlineErrorMessage = '';
  showEmailNotVerifiedModal = false;

  registerForm = new FormGroup<RegisterFormModel>({
    nombre: new FormControl<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    correo: new FormControl<string>('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
      updateOn: 'blur',
    }),
    contraseña: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
      updateOn: 'blur',
    }),
    autorizacionDatos: new FormControl<boolean>(false, {
      validators: [Validators.requiredTrue],
      nonNullable: true,
    }),
  });

  async signUp(): Promise<void> {
    if (this.isRegistering) return;

    this.isRegistering = true;
    this.registerInlineErrorMessage = '';
    this.showWrongModal = false;
    this.wrongModalMessage = 'Hubo un problema al registrarse';
    this.showVerificationModal = false;

    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      this.isRegistering = false;
      return;
    }

    const correo = (this.registerForm.value.correo ?? '').trim().toLowerCase();
    const contraseña = this.registerForm.value.contraseña ?? '';

    const credentials: Credentials = { correo, contraseña };

    const registerAttributes: RegisterUserAttributes = {
      nombre: this.registerForm.value.nombre!,
      correo,
    };

    try {
      const status = await this.authService.getEmailStatus(correo);

      if (status.exists && status.emailVerified === true) {
        this.registerInlineErrorMessage = 'Este correo ya se encuentra registrado.';
        this.isRegistering = false;
        this.cdr.detectChanges();
        return;
      }

      if (status.exists && status.emailVerified === false) {
        this.isRegistering = false;
        this.showEmailNotVerifiedModal = true;
        this.cdr.detectChanges();
        return;
      }
    } catch {
      this.wrongModalMessage = 'No se pudo validar el estado del correo. Intenta nuevamente.';
      this.showWrongModal = true;
      this.isRegistering = false;
      return;
    }

    try {
      await this.authService.signUpWithEmailAndPassword(credentials, registerAttributes);
      this.showVerificationModal = true;
    } catch {
      this.wrongModalMessage = 'Hubo un problema al registrarse';
      this.showWrongModal = true;
    } finally {
      this.isRegistering = false;
    }
  }

  async signUpWithMicrosoft() {
    try {
      await this.authService.loginWithMicrosoft();
    } catch (error) {
      console.error('Error con Microsoft:', error);
    }
  }

  async signUpWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error during Google registration:', error);
    }
  }

  closeVerificationModal(): void {
    this.showVerificationModal = false;
    this.cdr.detectChanges();
  }

  continueAfterVerificationNotice(): void {
    this.showVerificationModal = false;
    this.router.navigate(['/login']);
    this.cdr.detectChanges();
  }

  closeWrongModal(): void {
    this.showWrongModal = false;
    this.wrongModalMessage = 'Hubo un problema al registrarse';
    this.cdr.detectChanges();
  }

  closeEmailNotVerifiedModal(): void {
    this.showEmailNotVerifiedModal = false;
    this.cdr.detectChanges();
  }
}
