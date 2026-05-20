import { Component, input } from '@angular/core';

/**
 * Standard page header — title (+ optional subtitle) on the left, action
 * buttons projected from `[actions]` slot on the right.
 *
 *   <app-page-header title="Doctor dashboard" subtitle="Today's overview">
 *     <button actions app-button>New appointment</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="header">
      <div>
        <h1 class="title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  styles: `
    :host { display: block; }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }
    .title    { font-size: 1.5rem; font-weight: 700; color: var(--color-neutral-900); margin: 0; letter-spacing: -0.01em; }
    .subtitle { font-size: 0.85rem; color: var(--color-neutral-500); margin: 4px 0 0; }
    .actions  { display: flex; gap: 10px; flex-wrap: wrap; }
  `
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
