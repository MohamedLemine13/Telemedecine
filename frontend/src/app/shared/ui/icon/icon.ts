import { Component, computed, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';

import { ICONS, IconName } from '../icons';

/**
 * Tiny inline-SVG icon. Pass `name` to pick from {@link ICONS}; the icon
 * inherits stroke colour from the parent's `color` via `currentColor`.
 *
 *   <app-icon name="calendar" class="w-5 h-5 text-[color:var(--color-primary-700)]" />
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()" [attr.height]="size()"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      [innerHTML]="svg()"
      aria-hidden="true">
    </svg>
  `
})
export class Icon {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input<number>(20);

  readonly svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()])
  );
}
