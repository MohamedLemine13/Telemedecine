import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';

import { AuthApi } from '../../../core/auth/auth.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { Button } from '../../../shared/ui';

/**
 * 2FA enrollment flow:
 *   1. On load — POST /api/auth/2fa/setup to get { secret, provisioningUri }.
 *   2. Render the URI as an SVG QR code via the `qrcode` package.
 *   3. User scans with Google Authenticator (or compatible app).
 *   4. User enters first 6-digit code → POST /api/auth/2fa/enable → tokens
 *      re-issued with tfa_verified, session updated, redirected to settings.
 */
@Component({
  selector: 'app-tfa-setup',
  standalone: true,
  imports: [ReactiveFormsModule, Button],
  template: `
    <h1 class="mb-2 text-2xl font-bold text-[color:var(--color-neutral-900)]">Set up two-factor authentication</h1>
    <p class="mb-6 text-sm text-[color:var(--color-neutral-500)]">
      Scan the QR code below with Google Authenticator (or any TOTP app), then enter the 6-digit code it shows.
    </p>

    @if (loadingSetup()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Generating your secret…</p>
    } @else if (setupError()) {
      <p class="text-sm text-[color:var(--color-error)]">{{ setupError() }}</p>
    } @else {
      <div class="mb-4 flex flex-col items-center gap-3">
        <div class="rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] bg-white p-4"
             [innerHTML]="qrSvg()"></div>
        <details class="w-full text-xs text-[color:var(--color-neutral-500)]">
          <summary class="cursor-pointer">Can't scan? Show the secret</summary>
          <code class="mt-2 block break-all rounded bg-[color:var(--color-neutral-50)] p-2 font-mono">{{ secret() }}</code>
        </details>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold">6-digit code</span>
          <input type="text" inputmode="numeric" maxlength="6" pattern="\\d{6}"
                 formControlName="code"
                 class="h-12 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-center text-2xl tracking-[0.5em] font-semibold focus:border-[color:var(--color-primary-700)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-700)]" />
        </label>

        @if (error()) {
          <p class="text-sm text-[color:var(--color-error)]">{{ error() }}</p>
        }

        <button app-button [disabled]="form.invalid || loading()" [loading]="loading()" type="submit">
          {{ loading() ? 'Enabling…' : 'Enable 2FA' }}
        </button>
      </form>
    }
  `
})
export class TfaSetup {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loadingSetup = signal(true);
  protected readonly setupError = signal<string | null>(null);
  protected readonly secret = signal<string>('');
  protected readonly qrSvg = signal<SafeHtml>('');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    this.api.beginTfaSetup().subscribe({
      next: async resp => {
        this.secret.set(resp.secret);
        try {
          const svg = await QRCode.toString(resp.provisioningUri, {
            type: 'svg',
            margin: 1,
            width: 220,
            color: { dark: '#0A3B7F', light: '#FFFFFF' }
          });
          this.qrSvg.set(this.sanitizer.bypassSecurityTrustHtml(svg));
        } catch {
          this.setupError.set('Could not render QR code.');
        }
        this.loadingSetup.set(false);
      },
      error: err => {
        this.loadingSetup.set(false);
        this.setupError.set(err?.error?.title ?? 'Could not start 2FA setup.');
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.api.enableTfa({ code: this.form.controls.code.value }).subscribe({
      next: tokens => {
        this.loading.set(false);
        // Update session with the newly issued tokens (tfa_verified=true).
        this.auth.setSession(tokens.accessToken, tokens.refreshToken, tokens.accessExpiresIn);
        this.router.navigateByUrl(this.auth.homePath());
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.title ?? 'Code didn\'t match. Try again.');
      }
    });
  }
}
