import { Pipe, PipeTransform, inject } from '@angular/core';

import { LocaleService } from './locale.service';

/**
 * `{{ 'nav.dashboard' | t }}` — translates a key for the active language.
 *
 * Marked impure so it re-evaluates when the language signal changes (the key
 * input stays constant, so a pure pipe would never refresh on a switch). The
 * dictionary lookup is a cheap map access, so the per-CD cost is negligible.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(key: string): string {
    return this.locale.t(key);
  }
}
