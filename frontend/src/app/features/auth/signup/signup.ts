import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthApi } from '../../../core/auth/auth.api';
import { AuthStore, Role } from '../../../core/auth/auth.store';
import { Button } from '../../../shared/ui';

interface FieldViolation { field: string; message: string; }

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button],
  styles: `
    .role-card {
      cursor: pointer;
      border-radius: var(--radius-input);
      border: 1px solid var(--color-neutral-200);
      padding: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      transition: background-color 0.15s, border-color 0.15s;
      text-align: center;
    }
    .role-card.active {
      border-color: var(--color-primary-700);
      background: var(--color-primary-50);
      color: var(--color-primary-700);
    }
  `,
  template: `
    <h1 class="mb-2 text-2xl font-bold text-[color:var(--color-neutral-900)]">Create your account</h1>
    <p class="mb-6 text-sm text-[color:var(--color-neutral-500)]">
      Patients and doctors can self-register. Administrators are created by the platform.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
      <fieldset class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
        <label class="role-card" [class.active]="form.controls.role.value === 'ROLE_PATIENT'">
          <input type="radio" formControlName="role" value="ROLE_PATIENT" class="sr-only" />
          I'm a patient
        </label>
        <label class="role-card" [class.active]="form.controls.role.value === 'ROLE_DOCTOR'">
          <input type="radio" formControlName="role" value="ROLE_DOCTOR" class="sr-only" />
          I'm a doctor
        </label>
      </fieldset>

      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold">Email</span>
        <input type="email" formControlName="email" autocomplete="email"
               class="h-11 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-sm focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]" />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold">Password</span>
        <input type="password" formControlName="password" autocomplete="new-password"
               class="h-11 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-sm focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]" />
        <span class="text-xs text-[color:var(--color-neutral-500)]">
          12+ characters, with at least one uppercase letter, one lowercase letter, and a digit.
        </span>
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold">Confirm password</span>
        <input type="password" formControlName="confirmPassword" autocomplete="new-password"
               class="h-11 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-sm focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]" />
        @if (form.hasError('mismatch') && form.controls.confirmPassword.touched) {
          <span class="text-xs text-[color:var(--color-error)]">Passwords don't match.</span>
        }
      </label>

      @if (violations().length) {
        <ul class="rounded-[var(--radius-input)] bg-[color:var(--color-error)]/10 p-3 text-sm text-[color:var(--color-error)]">
          @for (v of violations(); track v.field) {
            <li>{{ v.field }}: {{ v.message }}</li>
          }
        </ul>
      } @else if (error()) {
        <p class="text-sm text-[color:var(--color-error)]">{{ error() }}</p>
      }

      <button app-button [disabled]="form.invalid || loading()" [loading]="loading()" type="submit" class="mt-2">
        {{ loading() ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <p class="mt-6 text-sm text-[color:var(--color-neutral-500)]">
      Already have an account?
      <a routerLink="/auth/login" class="text-[color:var(--color-primary-700)] hover:underline">Sign in</a>
    </p>
  `
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly violations = signal<FieldViolation[]>([]);

  protected readonly form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(128),
        // Mirror the backend's regex so client-side errors match server-side.
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      role: ['ROLE_PATIENT' as Role, [Validators.required]]
    },
    {
      // Group-level validator: passwords must match. Surfaces as
      // form.hasError('mismatch').
      validators: (group) => {
        const a = group.get('password')?.value;
        const b = group.get('confirmPassword')?.value;
        return a && b && a !== b ? { mismatch: true } : null;
      }
    }
  );

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.violations.set([]);

    const { email, password, role } = this.form.getRawValue();
    this.api.signup({ email, password, role }).subscribe({
      next: tokens => {
        this.loading.set(false);
        this.auth.setSession(tokens.accessToken, tokens.refreshToken, tokens.accessExpiresIn);
        this.router.navigateByUrl(this.auth.homePath());
      },
      error: err => {
        this.loading.set(false);
        const body = err?.error;
        if (Array.isArray(body?.violations)) {
          this.violations.set(body.violations);
        } else if (body?.title) {
          this.error.set(body.detail ? `${body.title} — ${body.detail}` : body.title);
        } else if (err?.status === 0) {
          this.error.set('Could not reach the server. Is the backend running?');
        } else {
          this.error.set(`Sign-up failed (HTTP ${err?.status ?? '?'}).`);
        }
      }
    });
  }
}
