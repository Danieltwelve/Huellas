import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { switchMap, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

export const claimsGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredClaim = route.data?.['requiredClaim'] as string | undefined;
  const allowedRoles = (route.data?.['allowedRoles'] as string[] | undefined) ?? [];

  return authService.user$.pipe(
    switchMap((user) => {
      // Si no hay usuario, ir a login
      if (!user) {
        return of(router.createUrlTree(['/login']));
      }

      // Usuario existe, esperar a que las claims se carguen
      return authService.claims$.pipe(
        take(1),
        timeout(5000), // Esperar máximo 5 segundos
        switchMap((claims) => {
          const hasRequiredClaim = requiredClaim ? authService.hasClaim(requiredClaim as never) : true;
          const hasRequiredRole = allowedRoles.length ? authService.hasAnyRole(allowedRoles) : true;

          if (hasRequiredClaim && hasRequiredRole) {
            return of(true);
          }

          return of(router.createUrlTree(['/login']));
        }),
        catchError(() => {
          // Si hay timeout u otro error, permitir el acceso de todas formas
          // (el componente puede tomar la decisión)
          return of(true);
        }),
      );
    }),
    take(1),
  );
};
