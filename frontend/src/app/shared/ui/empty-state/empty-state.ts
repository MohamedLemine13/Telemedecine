import { Component, input } from '@angular/core';

/**
 * Generic "nothing here yet" surface. Used both for genuine empty lists
 * ("you have no appointments") and for phase placeholders ("coming in Phase 3").
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-neutral-200)] bg-[color:var(--color-neutral-0)] p-10 text-center">
      <p class="mb-2 text-2xl">{{ icon() }}</p>
      <h2 class="text-base font-semibold text-[color:var(--color-neutral-900)]">{{ title() }}</h2>
      @if (description()) {
        <p class="mt-2 text-sm text-[color:var(--color-neutral-500)]">{{ description() }}</p>
      }
      @if (tag()) {
        <span class="mt-3 inline-block rounded-full bg-[color:var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[color:var(--color-primary-700)]">
          {{ tag() }}
        </span>
      }
      <div class="mt-4">
        <ng-content />
      </div>
    </div>
  `
})
export class EmptyState {
  readonly icon = input<string>('✦');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly tag = input<string>('');
}
