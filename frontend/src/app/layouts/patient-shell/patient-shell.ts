import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LocaleService } from '../../core/i18n/locale.service';
import { NavGroup, SidebarNav, Topbar } from '../../shared/ui';

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Topbar],
  template: `
    <div class="layout">
      <app-sidebar-nav brand="Telemedecine" brandSub="Patient" [groups]="groups()" />
      <div class="main">
        <app-topbar [title]="locale.t('shell.patient')" />
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
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      :host ::ng-deep app-sidebar-nav .sidebar { display: none; }
    }
    .main { display: flex; flex-direction: column; min-width: 0; }
    .content { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 28px 32px; }
  `
})
export class PatientShell {
  protected readonly locale = inject(LocaleService);
  private readonly t = (k: string) => this.locale.t(k);

  readonly groups = computed<NavGroup[]>(() => [
    {
      title: this.t('nav.group.main'),
      items: [
        { label: this.t('nav.dashboard'),     path: 'dashboard',      icon: 'home' },
        { label: this.t('nav.doctors'),       path: 'doctors',        icon: 'search' },
        { label: this.t('nav.appointments'),  path: 'appointments',   icon: 'calendar' },
        { label: this.t('nav.medicalRecord'), path: 'medical-record', icon: 'fileText' },
        { label: this.t('nav.prescriptions'), path: 'prescriptions',  icon: 'pill' }
      ]
    },
    {
      title: this.t('nav.group.account'),
      items: [
        { label: this.t('nav.messages'), path: 'messages', icon: 'message' },
        { label: this.t('nav.payments'), path: 'payments', icon: 'card' },
        { label: this.t('nav.settings'), path: 'settings', icon: 'settings' }
      ]
    }
  ]);
}
