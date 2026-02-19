import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const claimsGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredClaim = route.data?.['requiredClaim'] as string | undefined;
  const allowedRoles = (route.data?.['allowedRoles'] as string[] | undefined) ?? [];

  return authService.claims$.pipe(
    map(() => {
      const hasRequiredClaim = requiredClaim ? authService.hasClaim(requiredClaim as never) : true;
      const hasRequiredRole = allowedRoles.length ? authService.hasAnyRole(allowedRoles) : true;

      if (hasRequiredClaim && hasRequiredRole) {
        return true;
      }

      return router.createUrlTree(['/login']);
    }),
  );
};
