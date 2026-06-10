import { Component } from '@angular/core';

import { Card } from '../../shared/ui';

/** Static Privacy Policy page. School-project content. */
@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [Card],
  template: `
    <section class="mx-auto max-w-3xl">
      <h1 class="mb-1 text-2xl font-bold text-[color:var(--color-neutral-900)]">Privacy Policy</h1>
      <p class="mb-6 text-sm text-[color:var(--color-neutral-500)]">Last updated: June 2026</p>
      <app-card>
        <div class="prose-doc">
          <h2>What we store</h2>
          <p>Account details (email, hashed password), your role, and the medical or scheduling data
             you enter — appointments, consultation notes, prescriptions, messages and simulated
             invoices.</p>
          <h2>How it is protected</h2>
          <p>Passwords are hashed. Access is gated by role-based authorisation and short-lived JWT
             access tokens with rotating refresh tokens. Optional two-factor authentication (TOTP)
             adds a second factor.</p>
          <h2>Sharing</h2>
          <p>Medical data is visible only to you and the doctor(s) involved in your consultations,
             plus platform administrators for moderation. Nothing is sold or shared with third parties.</p>
          <h2>Your controls</h2>
          <p>You can update your profile and medical record at any time, change your password, and
             enrol or disable two-factor authentication from Settings.</p>
          <h2>Retention</h2>
          <p>This is a demonstration system; data persists for the lifetime of the deployment and may
             be reset between academic sessions.</p>
        </div>
      </app-card>
    </section>
  `,
  styles: `
    .prose-doc h2 { font-size: 1rem; font-weight: 700; margin: 18px 0 6px; }
    .prose-doc h2:first-child { margin-top: 0; }
    .prose-doc p { font-size: 0.88rem; line-height: 1.6; color: var(--color-neutral-700); }
  `
})
export class Privacy {}
