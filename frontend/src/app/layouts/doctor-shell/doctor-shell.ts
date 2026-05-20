import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavGroup, SidebarNav, Topbar } from '../../shared/ui';

@Component({
  selector: 'app-doctor-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Topbar],
  template: `
    <div class="layout">
      <app-sidebar-nav brand="Telemedecine" brandSub="Practice" [groups]="groups" />
      <div class="main">
        <app-topbar title="Practice" />
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
    .content { flex: 1; padding: 24px; }
  `
})
export class DoctorShell {
  readonly groups: NavGroup[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard',     path: 'dashboard',    icon: 'home' },
        { label: 'Agenda',        path: 'agenda',       icon: 'calendar' },
        { label: 'Availability',  path: 'availability', icon: 'clipboard' },
        { label: 'Patients',      path: 'patients',     icon: 'users' }
      ]
    },
    {
      title: 'Practice',
      items: [
        { label: 'Messages',      path: 'messages',     icon: 'message' },
        { label: 'Payouts',       path: 'payouts',      icon: 'card' },
        { label: 'Profile',       path: 'profile',      icon: 'user' },
        { label: 'Settings',      path: 'settings',     icon: 'settings' }
      ]
    }
  ];
}
