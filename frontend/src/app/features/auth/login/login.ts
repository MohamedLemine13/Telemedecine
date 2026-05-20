import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApi } from '../../../core/auth/auth.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { Button } from '../../../shared/ui';

/**
 * Email + password login. If the backend says 2FA is required (challenge
 * response), we navigate to /auth/2fa/verify with the challenge token in
 * router state.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button],
  template: `
    <h1 class="mb-6 text-2xl font-bold text-[color:var(--color-neutral-900)]">Sign in</h1>

    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold">Email</span>
        <input type="email" formControlName="email" autocomplete="email"
               class="h-11 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-sm focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]" />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold">Password</span>
        <input type="password" formControlName="password" autocomplete="current-password"
               class="h-11 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-sm focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]" />
      </label>

      @if (error()) {
        <p class="text-sm text-[color:var(--color-error)]">{{ error() }}</p>
      }

      <button app-button [disabled]="form.invalid || loading()" [loading]="loading()" type="submit" class="mt-2">
        {{ loading() ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <div class="mt-6 flex flex-col gap-1 text-sm text-[color:var(--color-neutral-500)]">
      <a routerLink="/auth/password/forgot" class="text-[color:var(--color-primary-700)] hover:underline">
        Forgot your password?
      </a>
      <span>
        New here?
        <a routerLink="/auth/signup" class="text-[color:var(--color-primary-700)] hover:underline">Create an account</a>
      </span>
    </div>
  `
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.api.login({ email, password }).subscribe({
      next: resp => {
        this.loading.set(false);
        if (resp.tokens) {
          this.auth.setSession(
            resp.tokens.accessToken,
            resp.tokens.refreshToken,
            resp.tokens.accessExpiresIn
          );
          this.redirectAfterLogin();
        } else if (resp.tfa) {
          this.router.navigate(['/auth/2fa/verify'], {
            state: {
              challengeToken: resp.tfa.challengeToken,
              returnUrl: this.route.snapshot.queryParamMap.get('returnUrl')
            }
          });
        }
      },
      error: err => {
        this.loading.set(false);
        const body = err?.error;
        if (body?.title) {
          this.error.set(body.detail ? `${body.title} — ${body.detail}` : body.title);
        } else if (err?.status === 0) {
          this.error.set('Could not reach the server. Is the backend running?');
        } else {
          this.error.set(`Sign-in failed (HTTP ${err?.status ?? '?'}).`);
        }
      }
    });
  }

  private redirectAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl || this.auth.homePath());
  }
}
