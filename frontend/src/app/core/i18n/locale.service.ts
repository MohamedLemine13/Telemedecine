import { Injectable, signal } from '@angular/core';

import { Lang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'telemed.lang';

/**
 * App-wide language state for the FR/EN switch. A signal holds the active
 * language; components read translations through {@link t} (or the
 * `TranslatePipe`). The choice is persisted to localStorage and reflected on
 * `<html lang>` for accessibility. French is the default (the platform's
 * primary locale) but the browser preference is honoured on first visit.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly lang = signal<Lang>(this.initial());

  private initial(): Lang {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (saved === 'fr' || saved === 'en') return saved;
    const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'fr';
    return nav.startsWith('en') ? 'en' : 'fr';
  }

  constructor() {
    this.apply(this.lang());
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    this.apply(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  }

  toggle(): void {
    this.setLang(this.lang() === 'fr' ? 'en' : 'fr');
  }

  /** Translate a key for the active language; falls back to the key itself. */
  t(key: string): string {
    return TRANSLATIONS[key]?.[this.lang()] ?? key;
  }

  private apply(lang: Lang): void {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }
}
