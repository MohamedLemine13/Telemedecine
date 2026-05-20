import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

/**
 * Phase-0 placeholder. Renders the current route path + the route's
 * `data.title` (when set). Lets us verify the full lazy route tree resolves
 * end-to-end before features are implemented.
 *
 * Replace per-route with the real feature component in Phase 1+.
 */
@Component({
  selector: 'app-route-stub',
  standalone: true,
  template: `
    <section class="mx-auto max-w-3xl p-8">
      <p class="text-sm uppercase tracking-wide text-[color:var(--color-neutral-500)]">
        Route stub
      </p>
      <h1 class="mt-2 text-3xl font-bold text-[color:var(--color-neutral-900)]">
        {{ title() }}
      </h1>
      <p class="mt-2 font-mono text-sm text-[color:var(--color-neutral-500)]">
        {{ path() }}
      </p>
      <p class="mt-6 text-sm text-[color:var(--color-neutral-500)]">
        This screen is not yet implemented. It will be built in a later phase.
      </p>
    </section>
  `
})
export class RouteStub {
  private readonly route = inject(ActivatedRoute);

  readonly title = toSignal(
    this.route.data.pipe(map(d => (d['title'] as string | undefined) ?? 'Untitled')),
    { initialValue: 'Untitled' }
  );

  readonly path = toSignal(
    this.route.url.pipe(map(segs => '/' + segs.map(s => s.path).join('/'))),
    { initialValue: '' }
  );
}
