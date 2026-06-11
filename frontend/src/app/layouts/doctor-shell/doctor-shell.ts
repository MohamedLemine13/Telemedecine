import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LocaleService } from '../../core/i18n/locale.service';
import { NavGroup, SidebarNav, Topbar } from '../../shared/ui';

@Component({
  selector: 'app-doctor-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Topbar],
  template: `
    <div class="layout">
      <app-sidebar-nav brand="Telemedecine" [brandSub]="locale.t('shell.practice')" [groups]="groups()" />
      <div class="main">
        <app-topbar [title]="locale.t('shell.practice')" />
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
    .content { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 28px 32px; }
  `
})
export class DoctorShell {
  protected readonly locale = inject(LocaleService);
  private readonly t = (k: string) => this.locale.t(k);

  readonly groups = computed<NavGroup[]>(() => [
    {
      title: this.t('nav.group.main'),
      items: [
        { label: this.t('nav.dashboard'),    path: 'dashboard',    icon: 'home' },
        { label: this.t('nav.agenda'),       path: 'agenda',       icon: 'calendar' },
        { label: this.t('nav.availability'), path: 'availability', icon: 'clipboard' },
        { label: this.t('nav.patients'),     path: 'patients',     icon: 'users' }
      ]
    },
    {
      title: this.t('nav.group.practice'),
      items: [
        { label: this.t('nav.messages'), path: 'messages', icon: 'message' },
        { label: this.t('nav.payouts'),  path: 'payouts',  icon: 'card' },
        { label: this.t('nav.profile'),  path: 'profile',  icon: 'user' },
        { label: this.t('nav.settings'), path: 'settings', icon: 'settings' }
      ]
    }
  ]);
}
