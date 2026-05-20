import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthApi } from '../../../core/auth/auth.api';
import { AuthStore } from '../../../core/auth/auth.store';

/**
 * Topbar widget: avatar pill with the signed-in user's initial + email, and
 * a Sign-out button to the right. Best-effort logout — we don't block the
 * navigation on the server response.
 */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  template: `
    @if (auth.user(); as user) {
      <div class="wrap">
        <div class="pill" [title]="user.email">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <span class="email">{{ user.email }}</span>
        </div>
        <button type="button" (click)="signOut()" class="signout">Sign out</button>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .wrap { display: flex; align-items: center; gap: 8px; }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px 4px 4px;
      border-radius: 9999px;
      background: var(--color-neutral-50);
      max-width: 220px;
    }
    .avatar {
      width: 30px; height: 30px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-700);
      color: var(--color-neutral-0);
      font-size: 0.85rem;
      font-weight: 600;
    }
    .email {
      font-size: 0.8rem;
      color: var(--color-neutral-700);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 160px;
    }

    .signout {
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--color-neutral-200);
      background: var(--color-neutral-0);
      color: var(--color-neutral-700);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .signout:hover { background: var(--color-neutral-50); }
  `
})
export class UserMenu {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly initial = computed(() => {
    const email = this.auth.user()?.email ?? '';
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  protected signOut(): void {
    const rt = this.auth.refreshToken();
    if (rt) {
      this.api.logout(rt).subscribe({ error: () => { /* best-effort */ } });
    }
    this.auth.clear();
    this.router.navigateByUrl('/auth/login');
  }
}
