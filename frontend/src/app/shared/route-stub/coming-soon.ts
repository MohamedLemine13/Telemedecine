import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { EmptyState } from '../ui/empty-state/empty-state';

/**
 * Placeholder for routes whose backend / UI is scheduled for a later phase.
 * Reads `route.data` for `title` and `phase` (e.g. "Phase 3").
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [EmptyState],
  template: `
    <section class="mx-auto max-w-2xl">
      <app-empty-state
        icon="🚧"
        [title]="title()"
        description="This screen is scheduled for a later phase. The route is wired so navigation works end-to-end."
        [tag]="phase()">
      </app-empty-state>
    </section>
  `
})
export class ComingSoon {
  private readonly route = inject(ActivatedRoute);
  readonly title = toSignal(this.route.data.pipe(map(d => (d['title'] as string) ?? 'Coming soon')),
    { initialValue: 'Coming soon' });
  readonly phase = toSignal(this.route.data.pipe(map(d => (d['phase'] as string) ?? '')),
    { initialValue: '' });
}
