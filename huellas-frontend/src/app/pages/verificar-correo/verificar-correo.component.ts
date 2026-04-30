import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { applyActionCode } from 'firebase/auth';

@Component({
  selector: 'app-verificar-correo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verificar-correo.component.html',
  styleUrl: './verificar-correo.component.css',
})
export class VerificarCorreoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);

  loading = true;
  success = false;
  message = 'Verificando tu correo...';

  constructor() {
    void this.handleVerification();
  }

  private async handleVerification(): Promise<void> {
    const oobCode = this.route.snapshot.queryParamMap.get('oobCode');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (!oobCode || mode !== 'verifyEmail') {
      this.loading = false;
      this.success = false;
      this.message = 'El enlace de verificación no es válido.';
      return;
    }

    try {
      await applyActionCode(this.auth, oobCode);
      if (this.auth.currentUser) {
        await this.auth.currentUser.reload();
      }

      this.loading = false;
      this.success = true;
      this.message = 'Tu correo fue verificado correctamente. Ya puedes iniciar sesión.';
    } catch {
      this.loading = false;
      this.success = false;
      this.message =
        'No fue posible verificar el correo. El enlace puede estar vencido o ya fue usado.';
    }
  }
}
