import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { AuthApi, SKIP_AUTH } from '../auth/auth.api';
import { AuthStore } from '../auth/auth.store';
import { environment } from '../../../environments/environment';

/**
 * Stamps `Authorization: Bearer <access>` on outbound requests and refreshes
 * the token on a 401.
 *
 * Concurrent-request queueing: only ONE /refresh call is in flight at a time.
 * Other 401s that hit during the refresh wait on a subject; when the new
 * access token arrives they all retry. If refresh itself fails, the session
 * is cleared and the user bounces to /auth/login.
 *
 * Requests with `SKIP_AUTH` context (the /signup, /login, /refresh, /logout
 * calls themselves) are passed through unmodified.
 */
let refreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const auth = inject(AuthStore);
  const api = inject(AuthApi);
  const router = inject(Router);

  // Only stamp bearer + handle 401-refresh on requests that target our own
  // API. With apiBaseUrl='' the relative path `/api/...` is what we see;
  // we still match the absolute form too in case it ever flips back.
  const isApi =
    req.url.startsWith('/api') ||
    req.url.startsWith('/actuator') ||
    (environment.apiBaseUrl !== '' && req.url.startsWith(environment.apiBaseUrl));
  if (!isApi) {
    return next(req);
  }

  const token = auth.accessToken();
  const stamped = token ? withBearer(req, token) : req;

  return next(stamped).pipe(
    catchError(err => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !auth.refreshToken()) {
        return throwError(() => err);
      }
      return handle401(stamped, next, auth, api, router);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthStore,
  api: AuthApi,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!refreshing) {
    refreshing = true;
    refreshSubject.next(null);

    const rt = auth.refreshToken()!;
    return api.refresh(rt).pipe(
      switchMap(tokens => {
        auth.setSession(tokens.accessToken, tokens.refreshToken, tokens.accessExpiresIn);
        refreshing = false;
        refreshSubject.next(tokens.accessToken);
        return next(withBearer(req, tokens.accessToken));
      }),
      catchError(err => {
        refreshing = false;
        refreshSubject.next(null);
        auth.clear();
        router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
        return throwError(() => err);
      })
    );
  }

  // A refresh is already in flight — wait for the new token, then retry.
  return refreshSubject.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap(t => next(withBearer(req, t)))
  );
}

function withBearer<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
