import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Permite entrar solo a usuarios no autenticados.
 * Si ya hay sesión iniciada, redirige al home.
 */
export const redirectIfAuthenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map((user) => {
      if (user) {
        return router.createUrlTree(['/']);
      }

      return true;
    }),
  );
};
