import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../../core/auth/auth.api';
import { AuthStore } from '../../core/auth/auth.store';
import { Button, Card } from '../../shared/ui';

/**
 * Generic settings page shared by patient + doctor + admin shells.
 * Sections: profile (name/phone — backend update is deferred to per-role API),
 * security (2FA status + actions), notifications (placeholder), language.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button, Card],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-[color:var(--color-neutral-900)]">Settings</h1>
      <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">
        Manage your account, security and preferences.
      </p>
    </header>

    <div class="grid gap-4">
      <!-- Account -->
      <app-card>
        <div header><h2 class="text-base font-semibold">Account</h2></div>
        <dl class="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Email</dt>
            <dd>{{ auth.user()?.email }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Roles</dt>
            <dd class="flex gap-1.5">
              @for (r of auth.user()?.roles ?? []; track r) {
                <span class="rounded-full bg-[color:var(--color-primary-50)] px-2 py-0.5 text-xs font-semibold text-[color:var(--color-primary-700)]">
                  {{ r }}
                </span>
              }
            </dd>
          </div>
        </dl>
      </app-card>

      <!-- Security -->
      <app-card>
        <div header><h2 class="text-base font-semibold">Security</h2></div>
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold">Two-factor authentication (TOTP)</p>
            <p class="mt-1 text-xs text-[color:var(--color-neutral-500)]">
              Adds a 6-digit code from your authenticator app on top of your password.
            </p>
            <p class="mt-2 text-xs">
              Status:
              @if (auth.user()?.tfaVerified) {
                <span class="font-semibold text-[color:var(--color-success)]">Enabled</span>
              } @else {
                <span class="font-semibold text-[color:var(--color-warning)]">Not enrolled</span>
              }
            </p>
          </div>
          @if (auth.user()?.tfaVerified) {
            <form [formGroup]="disableForm" (ngSubmit)="disableTfa()" class="flex flex-col items-end gap-2">
              <input formControlName="code" inputmode="numeric" maxlength="6" placeholder="Code to disable"
                     class="h-10 w-32 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-center text-sm" />
              <button app-button variant="danger" [disabled]="disableForm.invalid || disabling()" type="submit">
                {{ disabling() ? 'Disabling…' : 'Disable 2FA' }}
              </button>
              @if (disableError()) {
                <p class="text-xs text-[color:var(--color-error)]">{{ disableError() }}</p>
              }
            </form>
          } @else {
            <a routerLink="/auth/2fa/setup">
              <button app-button>Enroll 2FA</button>
            </a>
          }
        </div>
      </app-card>

      <!-- Notifications (placeholder for Phase 5) -->
      <app-card>
        <div header><h2 class="text-base font-semibold">Notifications</h2></div>
        <p class="text-sm text-[color:var(--color-neutral-500)]">
          Email + push preferences will land in Phase 5 along with the notification service.
        </p>
      </app-card>

      <!-- Language -->
      <app-card>
        <div header><h2 class="text-base font-semibold">Language</h2></div>
        <p class="text-sm text-[color:var(--color-neutral-500)]">
          Currently fixed to <strong>Français (par défaut)</strong> with English fallback. Per-user
          selection lands later in Phase 6.
        </p>
      </app-card>
    </div>
  `
})
export class Settings {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(AuthApi);
  private readonly fb = inject(FormBuilder);

  protected readonly disabling = signal(false);
  protected readonly disableError = signal<string | null>(null);
  protected readonly disableForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  protected disableTfa(): void {
    if (this.disableForm.invalid) return;
    this.disabling.set(true);
    this.disableError.set(null);
    this.api.disableTfa({ code: this.disableForm.controls.code.value }).subscribe({
      next: () => {
        this.disabling.set(false);
        // Force re-login so the user picks up tokens without tfa_verified.
        this.auth.clear();
        location.assign('/auth/login');
      },
      error: err => {
        this.disabling.set(false);
        this.disableError.set(err?.error?.title ?? 'Could not disable 2FA.');
      }
    });
  }
}
