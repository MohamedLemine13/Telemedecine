import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { InvoiceApi, InvoiceDto, PaymentSummaryDto } from '../../../core/api/invoice.api';
import { Button, Card, EmptyState, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

/**
 * Patient billing. Invoices are auto-generated from completed consultations.
 * The patient can settle a pending invoice with a mock payment method and then
 * claim the simulated insurance reimbursement (70%).
 */
@Component({
  selector: 'app-patient-payments',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, Button, Card, EmptyState, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Payments"
      subtitle="Consultation invoices and simulated insurance reimbursements." />

    @if (summary(); as s) {
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="stat">
          <p class="stat-label">Total billed</p>
          <p class="stat-value">{{ s.totalBilled | currency:s.currency:'symbol':'1.0-0' }}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Paid</p>
          <p class="stat-value">{{ s.totalPaid | currency:s.currency:'symbol':'1.0-0' }}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Reimbursed</p>
          <p class="stat-value text-green">{{ s.totalReimbursed | currency:s.currency:'symbol':'1.0-0' }}</p>
        </div>
      </div>
    }

    <app-card>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (invoices().length === 0) {
        <app-empty-state icon="🧾" title="No invoices"
          description="Invoices appear here once a consultation is completed." />
      } @else {
        <ul class="divide-y divide-[color:var(--color-neutral-200)]">
          @for (i of invoices(); track i.id) {
            <li class="py-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-semibold">{{ i.doctorName }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">
                    @if (i.appointmentStartAt) { {{ i.appointmentStartAt | date:'d MMM yyyy, HH:mm' }} · }
                    {{ i.amount | currency:i.currency:'symbol':'1.0-0' }}
                  </p>
                  @if (i.status === 'REIMBURSED' && i.reimbursedAmount) {
                    <p class="text-xs text-green">✓ Reimbursed {{ i.reimbursedAmount | currency:i.currency:'symbol':'1.0-0' }}</p>
                  } @else if (i.status === 'REIMBURSEMENT_REQUESTED') {
                    <p class="text-xs text-amber">⏳ Reimbursement of {{ i.reimbursedAmount | currency:i.currency:'symbol':'1.0-0' }} pending admin review</p>
                  }
                </div>
                <div class="flex shrink-0 flex-col items-end gap-2">
                  <app-status-badge [variant]="badge(i.status)" [label]="label(i.status)" />
                  @if (i.status === 'PENDING') {
                    <button app-button size="sm" type="button" (click)="pay(i)"
                      [loading]="working() === i.id">📱 Pay (Mobile Money)</button>
                  } @else if (i.status === 'PAID') {
                    <button app-button size="sm" variant="secondary" type="button"
                      (click)="requestReimbursement(i)" [loading]="working() === i.id">Claim reimbursement</button>
                  }
                </div>
              </div>
              @if (error() === i.id) {
                <p class="mt-2 text-xs text-[color:var(--color-error)]">Something went wrong. Try again.</p>
              }
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  styles: `
    .stat { padding: 16px; background: var(--color-neutral-0); border: 1px solid var(--color-neutral-200); border-radius: var(--radius-card); }
    .stat-label { font-size: 0.72rem; color: var(--color-neutral-500); text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
    .stat-value { font-size: 1.4rem; font-weight: 700; margin: 4px 0 0; }
    .text-green { color: var(--color-success, #16a34a); }
    .text-amber { color: var(--color-warning, #d97706); }
  `
})
export class PatientPayments implements OnInit {
  private readonly api = inject(InvoiceApi);

  protected readonly loading = signal(true);
  protected readonly invoices = signal<InvoiceDto[]>([]);
  protected readonly summary = signal<PaymentSummaryDto | null>(null);
  protected readonly working = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void { this.fetch(); }

  private fetch(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: list => { this.invoices.set(list); this.loading.set(false); },
      error: () => { this.invoices.set([]); this.loading.set(false); }
    });
    this.api.summary().subscribe({
      next: s => this.summary.set(s),
      error: () => this.summary.set(null)
    });
  }

  protected pay(i: InvoiceDto): void {
    this.working.set(i.id); this.error.set(null);
    this.api.pay(i.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.error.set(i.id); }
    });
  }

  protected requestReimbursement(i: InvoiceDto): void {
    this.working.set(i.id); this.error.set(null);
    this.api.requestReimbursement(i.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.error.set(i.id); }
    });
  }

  protected badge(s: string): StatusVariant {
    if (s === 'PAID') return 'info';
    if (s === 'REIMBURSED') return 'success';
    if (s === 'REIMBURSEMENT_REQUESTED') return 'neutral';
    return 'warning';
  }

  protected label(s: string): string {
    return s === 'REIMBURSEMENT_REQUESTED' ? 'PENDING REVIEW' : s;
  }
}
