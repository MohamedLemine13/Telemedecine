import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AdminMetricsApi, AdminMetricsDto } from '../admin-metrics.api';
import { Card, EmptyState, PageHeader } from '../../../shared/ui';

/**
 * Platform reports — the same `GET /api/admin/metrics` payload as the dashboard,
 * laid out as detailed tables plus a 14-day appointment bar chart.
 */
@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [DatePipe, DecimalPipe, Card, EmptyState, PageHeader],
  template: `
    <app-page-header title="Reports" subtitle="Platform activity and revenue overview." />

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else if (!m()) {
      <app-empty-state icon="📊" title="No data" description="Metrics could not be loaded." />
    } @else {
      <div class="grid gap-4 lg:grid-cols-2">
        <app-card>
          <h3 class="mb-3 text-sm font-semibold">Users</h3>
          <dl class="rows">
            <div><dt>Accounts</dt><dd>{{ m()!.accountsTotal | number }}</dd></div>
            <div><dt>Patients</dt><dd>{{ m()!.patientsTotal | number }}</dd></div>
            <div><dt>Doctors</dt><dd>{{ m()!.doctorsTotal | number }}</dd></div>
            <div><dt>Verified doctors</dt><dd>{{ m()!.doctorsVerified | number }}</dd></div>
            <div><dt>Pending verifications</dt><dd>{{ m()!.verificationsPending | number }}</dd></div>
          </dl>
        </app-card>

        <app-card>
          <h3 class="mb-3 text-sm font-semibold">Activity</h3>
          <dl class="rows">
            <div><dt>Appointments</dt><dd>{{ m()!.appointmentsTotal | number }}</dd></div>
            <div><dt>Scheduled</dt><dd>{{ m()!.appointmentsScheduled | number }}</dd></div>
            <div><dt>Completed</dt><dd>{{ m()!.appointmentsCompleted | number }}</dd></div>
            <div><dt>Cancelled</dt><dd>{{ m()!.appointmentsCancelled | number }}</dd></div>
            <div><dt>Consultations</dt><dd>{{ m()!.consultationsTotal | number }}</dd></div>
            <div><dt>Prescriptions</dt><dd>{{ m()!.prescriptionsTotal | number }}</dd></div>
          </dl>
        </app-card>

        <app-card>
          <h3 class="mb-3 text-sm font-semibold">Billing</h3>
          <dl class="rows">
            <div><dt>Revenue collected</dt><dd>{{ m()!.revenueCollected | number:'1.0-0' }} {{ m()!.currency }}</dd></div>
            <div><dt>Paid invoices</dt><dd>{{ m()!.invoicesPaid | number }}</dd></div>
            <div><dt>Pending invoices</dt><dd>{{ m()!.invoicesPending | number }}</dd></div>
          </dl>
        </app-card>

        <app-card>
          <h3 class="mb-3 text-sm font-semibold">Appointments — last 14 days</h3>
          <div class="chart">
            @for (d of m()!.appointmentsByDay; track d.date) {
              <div class="bar-col" [title]="(d.date | date:'d MMM') + ': ' + d.count">
                <div class="bar" [style.height.%]="barHeight(d.count)"></div>
                <span class="bar-label">{{ d.date | date:'d/M' }}</span>
              </div>
            }
          </div>
        </app-card>
      </div>
    }
  `,
  styles: `
    .rows { display: flex; flex-direction: column; }
    .rows > div {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid var(--color-neutral-100);
    }
    .rows dt { font-size: 0.82rem; color: var(--color-neutral-600); }
    .rows dd { font-size: 0.95rem; font-weight: 700; margin: 0; }
    .chart { display: flex; align-items: flex-end; gap: 6px; height: 180px; padding-top: 10px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .bar { width: 70%; min-height: 2px; background: var(--color-primary-700); border-radius: 4px 4px 0 0; transition: height 0.2s; }
    .bar-label { margin-top: 6px; font-size: 0.6rem; color: var(--color-neutral-400); }
  `
})
export class AdminReports implements OnInit {
  private readonly api = inject(AdminMetricsApi);

  protected readonly loading = signal(true);
  protected readonly m = signal<AdminMetricsDto | null>(null);

  private readonly maxDay = computed(() => {
    const days = this.m()?.appointmentsByDay ?? [];
    return Math.max(1, ...days.map(d => d.count));
  });

  ngOnInit(): void {
    this.api.metrics().subscribe({
      next: m => { this.m.set(m); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  protected barHeight(count: number): number {
    return Math.round((count / this.maxDay()) * 100);
  }
}
