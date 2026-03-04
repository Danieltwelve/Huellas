import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AuthService,
  Credentials,
  RegisterUserAttributes,
} from '../../core/auth/auth.service';

interface RegisterFormModel {
  nombre: FormControl<string | null>;
  apellido: FormControl<string | null>;
  correo: FormControl<string | null>;
  contraseña: FormControl<string | null>;
  confirmarContraseña: FormControl<string | null>;
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

  registerForm = new FormGroup<RegisterFormModel>({
    nombre: new FormControl<string>('', { nonNullable: true }),
    apellido: new FormControl<string>('', { nonNullable: true }),
    correo: new FormControl<string>('', { nonNullable: true }),
    contraseña: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
    confirmarContraseña: new FormControl<string>('', { nonNullable: true }),
  });

  private authService = inject(AuthService);

  async signUp(): Promise<void> {
    if (!this.registerForm.valid) return;

    const credentials: Credentials = {
      correo: this.registerForm.value.correo!,
      contraseña: this.registerForm.value.contraseña!,
    };

    const registerAttributes: RegisterUserAttributes = {
      nombre: this.registerForm.value.nombre!,
      apellido: this.registerForm.value.apellido!,
      correo: this.registerForm.value.correo!,
    };

    try {
      await this.authService.signUpWithEmailAndPassword(
        credentials,
        registerAttributes,
      );
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during registration:', error);
    }
  }
}
