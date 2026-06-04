import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavGroup, SidebarNav, Topbar } from '../../shared/ui';

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Topbar],
  template: `
    <div class="layout">
      <app-sidebar-nav brand="Telemedecine" brandSub="Patient" [groups]="groups" />
      <div class="main">
        <app-topbar title="My health space" />
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
  readonly groups: NavGroup[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard',      path: 'dashboard',      icon: 'home' },
        { label: 'Find a doctor',  path: 'doctors',        icon: 'search' },
        { label: 'Appointments',   path: 'appointments',   icon: 'calendar' },
        { label: 'Medical record', path: 'medical-record', icon: 'fileText' },
        { label: 'Prescriptions',  path: 'prescriptions',  icon: 'pill' }
      ]
    },
    {
      title: 'Account',
      items: [
        { label: 'Messages', path: 'messages', icon: 'message' },
        { label: 'Payments', path: 'payments', icon: 'card' },
        { label: 'Settings', path: 'settings', icon: 'settings' }
      ]
    }
  ];
}
