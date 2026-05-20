import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Tags every outbound request with a fresh UUID so backend logs can be
 * correlated end-to-end. Backend echoes the value in the same header
 * (see MDC setup in logback-spring.xml).
 */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  const id = (globalThis.crypto?.randomUUID?.() ?? fallbackId());
  return next(req.clone({ setHeaders: { 'X-Request-Id': id } }));
};

function fallbackId(): string {
  return 'req-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
