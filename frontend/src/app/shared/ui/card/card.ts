import { Component, input } from '@angular/core';

/**
 * Surface primitive. Use as `<app-card>` and slot header/body/footer
 * via projected content slots.
 *
 *   <app-card>
 *     <div header>Title</div>
 *     <p>Body content</p>
 *     <div footer><button …>Action</button></div>
 *   </app-card>
 */
@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <article
      [class]="
        'rounded-[var(--radius-card)] bg-[color:var(--color-neutral-0)] ' +
        'shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)] ' +
        (padded() ? 'p-5' : '')
      "
    >
      <header class="mb-3 has-[:empty]:hidden">
        <ng-content select="[header]" />
      </header>
      <div>
        <ng-content />
      </div>
      <footer class="mt-4 has-[:empty]:hidden">
        <ng-content select="[footer]" />
      </footer>
    </article>
  `
})
export class Card {
  readonly padded = input<boolean>(true);
}
