import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Self-healing for stale deployments.
 *
 * When the frontend image is rebuilt, lazy chunks get new content-hashed
 * filenames and the old ones are deleted. A browser still holding a cached
 * `index.html` from the previous build will request a chunk hash that no longer
 * exists — nginx answers the SPA fallback (`index.html`, `text/html`) and the
 * dynamic `import()` blows up with "failed to fetch dynamically imported module"
 * / "disallowed MIME type". The fix is simply to reload once so the browser
 * fetches the fresh `index.html` (served `no-store`) and the current chunk map.
 *
 * We reload at most once per stale-load episode, guarded by a sessionStorage
 * flag, so we never get stuck in a refresh loop if the failure is something
 * else (e.g. the backend being down).
 */
const RELOAD_FLAG = 'telemed.chunkReloadAt';
const RELOAD_COOLDOWN_MS = 15_000;

function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? '');
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [^ ]+ failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /disallowed MIME type/i.test(msg)
  );
}

function reloadOnce(): void {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? '0');
  if (Date.now() - last < RELOAD_COOLDOWN_MS) {
    return; // already reloaded very recently — avoid a loop
  }
  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  // Bypass the bfcache so the new index.html + chunk manifest is fetched.
  window.location.reload();
}

@Injectable()
export class ChunkReloadErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (isChunkLoadError(error)) {
      reloadOnce();
      return;
    }
    console.error(error);
  }
}

/**
 * Catch dynamic-import failures that surface as unhandled promise rejections
 * (the router's lazy `loadComponent` path), which don't always reach the
 * Angular ErrorHandler. Registered once at bootstrap.
 */
export function registerChunkReloadListener(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      reloadOnce();
    }
  });
}
