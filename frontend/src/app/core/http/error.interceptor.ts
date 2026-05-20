import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Pass-through for now. Session clearing on 401 is owned by
 * {@link authInterceptor}: it only clears AFTER an attempted refresh fails,
 * never on a single 401 (which is often expected, e.g. a public endpoint
 * called without a bearer, or an expired-token retry that's about to refresh).
 *
 * Phase 5 will hook a ToastService here for non-fatal user feedback.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(err => throwError(() => err))
  );
};
