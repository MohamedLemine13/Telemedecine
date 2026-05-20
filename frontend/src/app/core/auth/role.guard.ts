import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore, RoleShort } from './auth.store';

/**
 * Higher-order guard factory: `roleGuard('PATIENT')` etc.
 * Redirects to `/forbidden` when the active user lacks the role.
 */
export function roleGuard(required: RoleShort): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);

    if (auth.hasRole(required)) {
      return true;
    }
    return router.createUrlTree(['/forbidden']);
  };
}
