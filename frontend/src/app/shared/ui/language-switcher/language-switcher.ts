import { UpperCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { LocaleService } from '../../../core/i18n/locale.service';
import { LANGS } from '../../../core/i18n/translations';

/**
 * Compact FR/EN segmented toggle for the topbar. Reads and writes the
 * app-wide {@link LocaleService} language signal, so switching here re-renders
 * every translated string across the app instantly.
 */
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="seg" role="group" aria-label="Language">
      @for (l of langs; track l.code) {
        <button type="button" class="opt" [class.active]="locale.lang() === l.code"
          (click)="locale.setLang(l.code)" [attr.aria-pressed]="locale.lang() === l.code"
          [title]="l.label">
          {{ l.code | uppercase }}
        </button>
      }
    </div>
  `,
  styles: `
    .seg {
      display: inline-flex; align-items: center; padding: 2px;
      border-radius: 9999px; background: var(--color-neutral-100);
    }
    .opt {
      border: 0; cursor: pointer; background: transparent; padding: 4px 10px;
      font-size: 0.72rem; font-weight: 700; letter-spacing: .03em; border-radius: 9999px;
      color: var(--color-neutral-500); transition: all .12s;
    }
    .opt.active { background: var(--color-neutral-0); color: var(--color-primary-700); box-shadow: var(--shadow-1, 0 1px 2px rgba(0,0,0,.08)); }
  `,
  imports: [UpperCasePipe],
})
export class LanguageSwitcher {
  protected readonly locale = inject(LocaleService);
  protected readonly langs = LANGS;
}
