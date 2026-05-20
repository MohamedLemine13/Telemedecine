import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

/**
 * Blocks access to a route until the user is authenticated.
 * Captures the originally requested URL into `returnUrl` so login can bounce back.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
