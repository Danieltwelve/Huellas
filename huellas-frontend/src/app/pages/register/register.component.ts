import { Component, inject } from '@angular/core';
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
  showVerificationModal = false;
  showWrongModal = false;

  registerForm = new FormGroup<RegisterFormModel>({
    nombre: new FormControl<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    correo: new FormControl<string>('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    contraseña: new FormControl('', [Validators.required, Validators.minLength(6)]),
    autorizacionDatos: new FormControl<boolean>(false, {
      validators: [Validators.requiredTrue],
      nonNullable: true,
    }),
  });

  async signUp(): Promise<void> {
    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const credentials: Credentials = {
      correo: this.registerForm.value.correo!,
      contraseña: this.registerForm.value.contraseña!,
    };

    const registerAttributes: RegisterUserAttributes = {
      nombre: this.registerForm.value.nombre!,
      correo: this.registerForm.value.correo!,
    };

    try {
      await this.authService.signUpWithEmailAndPassword(credentials, registerAttributes);
      this.showVerificationModal = true;
    } catch (error) {
      this.showWrongModal = true;
    }
  }

  continueAfterVerificationNotice(): void {
    this.showVerificationModal = false;
    this.router.navigate(['/login']);
  }

  async signUpWithMicrosoft() {
    try {
      await this.authService.loginWithMicrosoft();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error con Microsoft:', error);
    }
  }

  async signUpWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during Google registration:', error);
    }
  }

  closeVerificationModal(): void {
    this.showVerificationModal = false;
  }

  closeWrongModal(): void {
    this.showWrongModal = false;
  }
}
