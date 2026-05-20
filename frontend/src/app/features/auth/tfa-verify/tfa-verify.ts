import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthApi } from '../../../core/auth/auth.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { Button } from '../../../shared/ui';

/**
 * Second step of a 2FA login. The login page sets {challengeToken, returnUrl}
 * in router state when the backend returns the tfa challenge response.
 *
 * If the user lands here directly (no challenge token), bounce to /auth/login.
 */
@Component({
  selector: 'app-tfa-verify',
  standalone: true,
  imports: [ReactiveFormsModule, Button],
  template: `
    <h1 class="mb-2 text-2xl font-bold text-[color:var(--color-neutral-900)]">Two-factor code</h1>
    <p class="mb-6 text-sm text-[color:var(--color-neutral-500)]">
      Open your authenticator app and enter the current 6-digit code.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold">Code</span>
        <input
          type="text" inputmode="numeric" autocomplete="one-time-code"
          maxlength="6" pattern="\\d{6}"
          formControlName="code"
          class="h-12 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-center text-2xl tracking-[0.5em] font-semibold focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]"
          autofocus />
      </label>

      @if (error()) {
        <p class="text-sm text-[color:var(--color-error)]">{{ error() }}</p>
      }

      <button app-button [disabled]="form.invalid || loading()" [loading]="loading()" type="submit" class="mt-2">
        {{ loading() ? 'Verifying…' : 'Verify' }}
      </button>
    </form>
  `
})
export class TfaVerify {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  private readonly state = this.router.getCurrentNavigation()?.extras.state as
    | { challengeToken?: string; returnUrl?: string }
    | undefined
    ?? (history.state ?? {}) as { challengeToken?: string; returnUrl?: string };

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    if (!this.state?.challengeToken) {
      this.router.navigateByUrl('/auth/login');
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.loading() || !this.state?.challengeToken) return;
    this.loading.set(true);
    this.error.set(null);

    this.api.verifyTfaLogin({
      challengeToken: this.state.challengeToken,
      code: this.form.controls.code.value
    }).subscribe({
      next: tokens => {
        this.loading.set(false);
        this.auth.setSession(tokens.accessToken, tokens.refreshToken, tokens.accessExpiresIn);
        this.router.navigateByUrl(this.state?.returnUrl || this.auth.homePath());
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.title ?? 'Verification failed. Try again.');
      }
    });
  }
}
