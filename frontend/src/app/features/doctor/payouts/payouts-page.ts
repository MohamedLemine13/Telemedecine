import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { InvoiceApi, InvoiceDto, PaymentSummaryDto } from '../../../core/api/invoice.api';
import { Card, EmptyState, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

/**
 * Doctor earnings. Read-only view of invoices raised against the doctor's
 * completed consultations plus a running total of what's been collected.
 */
@Component({
  selector: 'app-doctor-payouts',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, Card, EmptyState, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Payouts"
      subtitle="Earnings from your completed consultations (simulated)." />

    @if (summary(); as s) {
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="stat">
          <p class="stat-label">Billed</p>
          <p class="stat-value">{{ s.totalBilled | currency:s.currency:'symbol':'1.0-0' }}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Collected</p>
          <p class="stat-value text-green">{{ s.totalPaid | currency:s.currency:'symbol':'1.0-0' }}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Awaiting payment</p>
          <p class="stat-value">{{ s.pendingInvoices }}</p>
        </div>
      </div>
    }

    <app-card>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (invoices().length === 0) {
        <app-empty-state icon="💰" title="No payouts yet"
          description="Once you complete consultations, their invoices show up here." />
      } @else {
        <ul class="divide-y divide-[color:var(--color-neutral-200)]">
          @for (i of invoices(); track i.id) {
            <li class="flex items-center justify-between gap-4 py-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold">{{ i.patientName }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">
                  @if (i.appointmentStartAt) { {{ i.appointmentStartAt | date:'d MMM yyyy, HH:mm' }} · }
                  {{ i.amount | currency:i.currency:'symbol':'1.0-0' }}
                </p>
              </div>
              <app-status-badge [variant]="badge(i.status)" [label]="i.status" />
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
  `
})
export class DoctorPayouts implements OnInit {
  private readonly api = inject(InvoiceApi);

  protected readonly loading = signal(true);
  protected readonly invoices = signal<InvoiceDto[]>([]);
  protected readonly summary = signal<PaymentSummaryDto | null>(null);

  ngOnInit(): void {
    this.api.list().subscribe({
      next: list => { this.invoices.set(list); this.loading.set(false); },
      error: () => { this.invoices.set([]); this.loading.set(false); }
    });
    this.api.summary().subscribe({
      next: s => this.summary.set(s),
      error: () => this.summary.set(null)
    });
  }

  protected badge(s: string): StatusVariant {
    if (s === 'PAID') return 'success';
    if (s === 'REIMBURSED') return 'info';
    return 'warning';
  }
}
