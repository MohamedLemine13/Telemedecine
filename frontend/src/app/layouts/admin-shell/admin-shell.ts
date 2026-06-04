import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavGroup, SidebarNav, Topbar } from '../../shared/ui';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Topbar],
  template: `
    <div class="layout">
      <app-sidebar-nav brand="Telemedecine" brandSub="Admin" [groups]="groups" />
      <div class="main">
        <app-topbar title="Administration" />
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
  readonly groups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard',     path: 'dashboard',     icon: 'layoutGrid' },
        { label: 'Verifications', path: 'verifications', icon: 'shield' },
        { label: 'Reports',       path: 'reports',       icon: 'history' }
      ]
    },
    {
      title: 'Management',
      items: [
        { label: 'Accounts',  path: 'accounts',  icon: 'users' },
        { label: 'Disputes',  path: 'disputes',  icon: 'message' },
        { label: 'Content',   path: 'content',   icon: 'fileText' },
        { label: 'Audit log', path: 'audit',     icon: 'fileCheck' },
        { label: 'Settings',  path: 'settings',  icon: 'settings' }
      ]
    }
  ];
}
