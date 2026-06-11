import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { InvoiceApi, InvoiceDto } from '../../../core/api/invoice.api';
import { Button, Card, EmptyState, PageHeader } from '../../../shared/ui';

/**
 * Admin queue to validate patient reimbursement claims. Each pending claim can
 * be approved (the simulated insurance credit is finalised) or rejected (the
 * invoice returns to PAID).
 */
@Component({
  selector: 'app-admin-reimbursements',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, Button, Card, EmptyState, PageHeader],
  template: `
    <app-page-header title="Reimbursement claims"
      subtitle="Validate the insurance reimbursements patients have requested." />

    <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="kpi">
        <span class="kpi-icon" style="background:#fff7ed;color:#d97706">⏳</span>
        <div><p class="kpi-label">Pending claims</p><p class="kpi-value">{{ items().length }}</p></div>
      </div>
      <div class="kpi">
        <span class="kpi-icon" style="background:#eff6ff;color:#2563eb">💸</span>
        <div><p class="kpi-label">Total requested</p><p class="kpi-value">{{ totalRequested() | currency:currency():'symbol':'1.0-0' }}</p></div>
      </div>
    </div>

    <app-card>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (items().length === 0) {
        <app-empty-state icon="✅" title="Nothing to review"
          description="There are no pending reimbursement claims right now." />
      } @else {
        <ul class="divide-y divide-[color:var(--color-neutral-200)]">
          @for (i of items(); track i.id) {
            <li class="flex flex-wrap items-center justify-between gap-3 py-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold">{{ i.patientName }} <span class="text-[color:var(--color-neutral-400)]">·</span> {{ i.doctorName }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">
                  Invoice {{ i.amount | currency:i.currency:'symbol':'1.0-0' }}
                  @if (i.appointmentStartAt) { · {{ i.appointmentStartAt | date:'d MMM yyyy' }} }
                </p>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <p class="text-xs text-[color:var(--color-neutral-500)]">Reimbursement</p>
                  <p class="text-sm font-bold text-[color:var(--color-success)]">{{ i.reimbursedAmount | currency:i.currency:'symbol':'1.0-0' }}</p>
                </div>
                <button app-button size="sm" type="button" (click)="approve(i)" [loading]="working() === i.id">Approve</button>
                <button app-button size="sm" variant="ghost" type="button" (click)="reject(i)" [loading]="working() === i.id">Reject</button>
              </div>
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  styles: `
    .kpi { display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--color-neutral-0);
           border:1px solid var(--color-neutral-200); border-radius:var(--radius-card); }
    .kpi-icon { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; font-size:1.2rem; }
    .kpi-label { font-size:0.72rem; color:var(--color-neutral-500); text-transform:uppercase; letter-spacing:.04em; margin:0; }
    .kpi-value { font-size:1.4rem; font-weight:700; margin:2px 0 0; }
  `
})
export class AdminReimbursements implements OnInit {
  private readonly api = inject(InvoiceApi);

  protected readonly loading = signal(true);
  protected readonly items = signal<InvoiceDto[]>([]);
  protected readonly working = signal<string | null>(null);

  protected readonly currency = computed(() => this.items()[0]?.currency || 'MRU');
  protected readonly totalRequested = computed(() =>
    this.items().reduce((sum, i) => sum + (i.reimbursedAmount || 0), 0));

  ngOnInit(): void { this.fetch(); }

  private fetch(): void {
    this.loading.set(true);
    this.api.pendingReimbursements().subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => { this.items.set([]); this.loading.set(false); }
    });
  }

  protected approve(i: InvoiceDto): void {
    this.working.set(i.id);
    this.api.approveReimbursement(i.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => this.working.set(null)
    });
  }

  protected reject(i: InvoiceDto): void {
    this.working.set(i.id);
    this.api.rejectReimbursement(i.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => this.working.set(null)
    });
  }
}
