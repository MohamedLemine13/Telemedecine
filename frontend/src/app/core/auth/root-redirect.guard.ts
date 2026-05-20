import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

/**
 * Resolves "/" to the right space based on who's signed in.
 *
 *  - Not signed in  → /auth/login
 *  - PATIENT        → /patient/dashboard
 *  - DOCTOR         → /doctor/dashboard
 *  - ADMIN          → /admin/dashboard
 *
 * Multi-role users land on the first match in the order above (delegated
 * to AuthStore.homePath()).
 */
export const rootRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }
  return router.parseUrl(auth.homePath());
};
