import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { DoctorApi, DoctorProfileDto } from './doctor.api';

/**
 * Forces a doctor to fill in their public profile before using the rest of the
 * practice space. A profile counts as "complete" once it has a first and last
 * name (created lazily by the backend on first `GET /me`). Until then every
 * doctor route bounces to `/doctor/profile`. The profile and settings pages are
 * exempt so the doctor can actually complete the form.
 */
export function doctorProfileComplete(p: DoctorProfileDto | null | undefined): boolean {
  return !!p && !!p.firstName?.trim() && !!p.lastName?.trim();
}

export const doctorProfileGuard: CanActivateFn = (_route, state): Observable<boolean | UrlTree> => {
  const api = inject(DoctorApi);
  const router = inject(Router);

  // Always allow the pages needed to complete onboarding.
  if (state.url.startsWith('/doctor/profile') || state.url.startsWith('/doctor/settings')) {
    return of(true);
  }

  return api.getMine().pipe(
    map(profile => doctorProfileComplete(profile) ? true : router.parseUrl('/doctor/profile')),
    // If the profile lookup fails, don't lock the doctor out — let them through.
    catchError(() => of(true))
  );
};
