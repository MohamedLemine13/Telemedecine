import { Component } from '@angular/core';

import { Card } from '../../shared/ui';

/** Static Terms of Service page. School-project content — not legal advice. */
@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [Card],
  template: `
    <section class="mx-auto max-w-3xl">
      <h1 class="mb-1 text-2xl font-bold text-[color:var(--color-neutral-900)]">Terms of Service</h1>
      <p class="mb-6 text-sm text-[color:var(--color-neutral-500)]">Last updated: June 2026</p>
      <app-card>
        <div class="prose-doc">
          <h2>1. About this platform</h2>
          <p>Telemedecine is an academic demonstration platform for online medical consultations,
             patient record keeping and appointment management. It is provided for educational
             purposes and is not a substitute for professional medical care.</p>
          <h2>2. Accounts</h2>
          <p>You are responsible for the confidentiality of your credentials. Doctors must complete
             profile verification before offering consultations. Accounts may be suspended for misuse.</p>
          <h2>3. Medical disclaimer</h2>
          <p>In a real emergency, contact your local emergency services. Information exchanged on the
             platform does not constitute a binding medical opinion within this demo.</p>
          <h2>4. Payments</h2>
          <p>All billing and reimbursement flows are simulated. No real money is processed.</p>
          <h2>5. Data</h2>
          <p>See our <a href="/legal/privacy">Privacy Policy</a> for how data is handled.</p>
        </div>
      </app-card>
    </section>
  `,
  styles: `
    .prose-doc h2 { font-size: 1rem; font-weight: 700; margin: 18px 0 6px; }
    .prose-doc h2:first-child { margin-top: 0; }
    .prose-doc p { font-size: 0.88rem; line-height: 1.6; color: var(--color-neutral-700); }
    .prose-doc a { color: var(--color-primary-700); text-decoration: underline; }
  `
})
export class Terms {}
