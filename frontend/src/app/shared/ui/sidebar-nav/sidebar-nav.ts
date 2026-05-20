import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconName } from '../icons';
import { Icon } from '../icon/icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * White sidebar with brand block, grouped items, and a tinted-blue active row
 * matching the Figma "Preclinic" style.
 */
@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">⚕</span>
        <div class="brand-text">
          <p class="brand-name">{{ brand() }}</p>
          @if (brandSub()) {
            <p class="brand-sub">{{ brandSub() }}</p>
          }
        </div>
      </div>

      <nav class="nav">
        @for (group of groups(); track $index) {
          <div class="group">
            @if (group.title) {
              <p class="group-title">{{ group.title }}</p>
            }
            <ul>
              @for (item of group.items; track item.path) {
                <li>
                  <a [routerLink]="item.path"
                     routerLinkActive="active"
                     [routerLinkActiveOptions]="{ exact: false }"
                     class="nav-link">
                    <span class="active-bar" aria-hidden="true"></span>
                    <app-icon [name]="item.icon" [size]="18" class="nav-icon" />
                    <span>{{ item.label }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <p class="footer">v0.0.1 · school project</p>
    </aside>
  `,
  styles: `
    :host { display: contents; }
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 240px;
      min-height: 100vh;
      background: var(--color-sidebar-bg);
      border-right: 1px solid var(--color-neutral-100);
      padding: 18px 0 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 20px 22px;
      border-bottom: 1px solid var(--color-neutral-100);
      margin-bottom: 14px;
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px; height: 32px;
      border-radius: 8px;
      background: var(--color-primary-50);
      color: var(--color-primary-700);
      font-size: 18px;
      font-weight: 700;
    }
    .brand-name { font-size: 1rem; font-weight: 700; color: var(--color-neutral-900); margin: 0; line-height: 1.1; }
    .brand-sub  { font-size: 0.7rem; color: var(--color-neutral-500); margin: 2px 0 0; line-height: 1.1; letter-spacing: 0.04em; text-transform: uppercase; }

    .nav { flex: 1; padding: 0 8px; overflow-y: auto; }
    .group + .group { margin-top: 18px; }
    .group-title {
      font-size: 0.66rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-neutral-400);
      padding: 6px 12px;
      margin: 0;
    }
    .group ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }

    .nav-link {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-neutral-700);
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }
    .nav-link:hover { background: var(--color-neutral-50); color: var(--color-neutral-900); }
    .nav-link .active-bar {
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: transparent;
    }
    .nav-link.active {
      background: var(--color-sidebar-active-bg);
      color: var(--color-primary-700);
      font-weight: 600;
    }
    .nav-link.active .active-bar { background: var(--color-sidebar-active-bar); }
    .nav-link.active .nav-icon   { color: var(--color-primary-700); }

    .nav-icon { color: var(--color-neutral-500); flex-shrink: 0; }

    .footer { padding: 10px 20px 0; font-size: 0.7rem; color: var(--color-neutral-400); margin: 0; }
  `
})
export class SidebarNav {
  readonly brand = input<string>('Telemedecine');
  readonly brandSub = input<string>('');
  readonly groups = input.required<NavGroup[]>();
}
