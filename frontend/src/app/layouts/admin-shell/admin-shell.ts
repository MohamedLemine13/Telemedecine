import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LocaleService } from '../../core/i18n/locale.service';
import { NavGroup, SidebarNav, Topbar } from '../../shared/ui';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Topbar],
  template: `
    <div class="layout">
      <app-sidebar-nav brand="Telemedecine" brandSub="Admin" [groups]="groups()" />
      <div class="main">
        <app-topbar [title]="locale.t('shell.admin')" />
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
      background: var(--color-neutral-50);
    }
    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr; }
      :host ::ng-deep app-sidebar-nav .sidebar { display: none; }
    }
    .main { display: flex; flex-direction: column; min-width: 0; }
    .content { flex: 1; width: 100%; max-width: 1280px; margin: 0 auto; padding: 28px 32px; }
  `
})
export class AdminShell {
  protected readonly locale = inject(LocaleService);
  private readonly t = (k: string) => this.locale.t(k);

  readonly groups = computed<NavGroup[]>(() => [
    {
      title: this.t('nav.group.overview'),
      items: [
        { label: this.t('nav.dashboard'),     path: 'dashboard',     icon: 'layoutGrid' },
        { label: this.t('nav.verifications'), path: 'verifications', icon: 'shield' },
        { label: this.t('nav.reports'),       path: 'reports',       icon: 'history' }
      ]
    },
    {
      title: this.t('nav.group.management'),
      items: [
        { label: this.t('nav.accounts'), path: 'accounts', icon: 'users' },
        { label: this.t('nav.settings'), path: 'settings', icon: 'settings' }
      ]
    }
  ]);
}
