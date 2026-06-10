import { Component, input } from '@angular/core';

import { Icon } from '../icon/icon';
import { NotificationBell } from '../notification-bell/notification-bell';
import { UserMenu } from '../user-menu/user-menu';

/**
 * App topbar — sits inside each role shell above the routed content.
 * Slots: left (an outline-icon `<app-icon>` etc.), center search optional,
 * right defaults to the user menu but can be overridden via the `actions`
 * named slot.
 *
 *   <app-topbar [title]="'Doctor dashboard'" />
 *
 * The search input is purely cosmetic for now — Phase 6 wires it.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [Icon, NotificationBell, UserMenu],
  template: `
    <header class="topbar">
      <div class="left">
        @if (title()) {
          <h2 class="title">{{ title() }}</h2>
        }
        <ng-content select="[topbar-left]" />
      </div>

      @if (showSearch()) {
        <label class="search">
          <app-icon name="search" [size]="16" />
          <input type="search" [attr.placeholder]="searchPlaceholder()" />
        </label>
      }

      <div class="right">
        <ng-content select="[topbar-actions]" />
        <app-notification-bell />
        <app-user-menu />
      </div>
    </header>
  `,
  styles: `
    :host { display: contents; }
    .topbar {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 20px;
      background: var(--color-topbar-bg);
      border-bottom: 1px solid var(--color-neutral-100);
    }
    .left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .title { font-size: 0.95rem; font-weight: 600; color: var(--color-neutral-900); margin: 0; }
    .right { display: flex; align-items: center; gap: 10px; }

    .search {
      flex: 1;
      max-width: 380px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 38px;
      border-radius: 9999px;
      background: var(--color-neutral-50);
      color: var(--color-neutral-500);
    }
    .search input {
      flex: 1;
      background: transparent;
      border: 0;
      outline: 0;
      font-size: 0.85rem;
      color: var(--color-neutral-900);
    }
    .search input::placeholder { color: var(--color-neutral-400); }

    .icon-btn {
      position: relative;
      width: 38px; height: 38px;
      border-radius: 9999px;
      background: var(--color-neutral-50);
      color: var(--color-neutral-500);
      border: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .icon-btn:hover { background: var(--color-neutral-100); color: var(--color-neutral-700); }
    .icon-btn .dot {
      position: absolute;
      top: 8px; right: 9px;
      width: 8px; height: 8px;
      border-radius: 9999px;
      background: var(--color-error);
      border: 2px solid var(--color-neutral-0);
    }
  `
})
export class Topbar {
  readonly title = input<string>('');
  readonly showSearch = input<boolean>(true);
  readonly searchPlaceholder = input<string>('Search…');
}
