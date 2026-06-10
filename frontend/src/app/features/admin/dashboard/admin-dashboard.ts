import { Component, OnInit, inject, signal } from '@angular/core';

import { AdminMetricsApi, AdminMetricsDto } from '../admin-metrics.api';
import { KpiCard, KpiCardData } from '../../../shared/ui';

/**
 * Admin home — live platform KPIs from `GET /api/admin/metrics`. The five
 * cards summarise users, doctors, appointments, revenue and prescriptions; the
 * sparkline under "Appointments" is the real 14-day booking trend.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [KpiCard],
  template: `
    <header class="mb-7">
      <h1 class="text-2xl font-bold text-[color:var(--color-neutral-900)]">Admin · Dashboard</h1>
      <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">
        Live platform KPIs. Appointment trend covers the last 14 days.
      </p>
    </header>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading metrics…</p>
    } @else {
      <section class="kpi-grid">
        @for (kpi of kpis(); track kpi.title) {
          <app-kpi-card
            [title]="kpi.title"
            [value]="kpi.value"
            [changePercent]="kpi.changePercent"
            [trendPeriod]="kpi.trendPeriod"
            [iconColor]="kpi.iconColor"
            [chartType]="kpi.chartType"
            [chartData]="kpi.chartData" />
        }
      </section>

      @if (metrics(); as m) {
        <section class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="mini"><p class="mini-label">Verified doctors</p><p class="mini-value">{{ m.doctorsVerified }} / {{ m.doctorsTotal }}</p></div>
          <div class="mini"><p class="mini-label">Pending verifications</p><p class="mini-value">{{ m.verificationsPending }}</p></div>
          <div class="mini"><p class="mini-label">Active consultations</p><p class="mini-value">{{ m.consultationsActive }}</p></div>
          <div class="mini"><p class="mini-label">Unpaid invoices</p><p class="mini-value">{{ m.invoicesPending }}</p></div>
          <div class="mini"><p class="mini-label">Scheduled</p><p class="mini-value">{{ m.appointmentsScheduled }}</p></div>
          <div class="mini"><p class="mini-label">Completed</p><p class="mini-value">{{ m.appointmentsCompleted }}</p></div>
          <div class="mini"><p class="mini-label">Cancelled</p><p class="mini-value">{{ m.appointmentsCancelled }}</p></div>
          <div class="mini"><p class="mini-label">Paid invoices</p><p class="mini-value">{{ m.invoicesPaid }}</p></div>
        </section>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 20px;
    }
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 768px)  { .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; } }
    @media (max-width: 480px)  { .kpi-grid { grid-template-columns: 1fr; gap: 12px; } }
    .mini { padding: 14px 16px; background: var(--color-neutral-0); border: 1px solid var(--color-neutral-200); border-radius: var(--radius-card); }
    .mini-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-neutral-500); margin: 0; }
    .mini-value { font-size: 1.3rem; font-weight: 700; margin: 4px 0 0; }
  `
})
export class AdminDashboard implements OnInit {
  private readonly api = inject(AdminMetricsApi);

  protected readonly loading = signal(true);
  protected readonly metrics = signal<AdminMetricsDto | null>(null);
  protected readonly kpis = signal<KpiCardData[]>([]);

  ngOnInit(): void {
    this.api.metrics().subscribe({
      next: m => { this.metrics.set(m); this.kpis.set(this.buildKpis(m)); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  private buildKpis(m: AdminMetricsDto): KpiCardData[] {
    const trend = m.appointmentsByDay.map(d => d.count);
    const chart = trend.length ? trend : [0, 0, 0, 0, 0, 0, 0];
    const fmt = (n: number) => n.toLocaleString('en-US');
    return [
      { title: 'Doctors', value: fmt(m.doctorsTotal), changePercent: 0,
        trendPeriod: `${m.doctorsVerified} verified`, iconColor: 'var(--color-info)',
        chartType: 'progress', chartData: chart },
      { title: 'Patients', value: fmt(m.patientsTotal), changePercent: 0,
        trendPeriod: 'registered', iconColor: 'var(--color-warning)',
        chartType: 'area', chartData: chart },
      { title: 'Appointments', value: fmt(m.appointmentsTotal), changePercent: 0,
        trendPeriod: 'last 14 days', iconColor: 'var(--color-success)',
        chartType: 'bar', chartData: chart },
      { title: 'Revenue', value: `${fmt(m.revenueCollected)} ${m.currency}`, changePercent: 0,
        trendPeriod: 'collected', iconColor: 'var(--color-success)',
        chartType: 'line', chartData: chart },
      { title: 'Prescriptions', value: fmt(m.prescriptionsTotal), changePercent: 0,
        trendPeriod: 'issued', iconColor: 'var(--color-purple-500)',
        chartType: 'area', chartData: chart }
    ];
  }
}
