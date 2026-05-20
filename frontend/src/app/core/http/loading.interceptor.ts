import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

/**
 * Tracks in-flight requests so a global progress indicator can subscribe to
 * `LoadingService.isLoading`. Skipped for requests that opt out via the
 * `X-Skip-Loading` header.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly isLoading = this.count.asReadonly();

  begin(): void {
    this.count.update(n => n + 1);
  }

  end(): void {
    this.count.update(n => Math.max(0, n - 1));
  }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('X-Skip-Loading')) {
    return next(req);
  }
  const loading = inject(LoadingService);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};
