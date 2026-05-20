import { Component, input } from '@angular/core';

import { KpiCard, KpiCardData } from '../../../shared/ui';

/**
 * Admin home — the existing KPI grid migrated from the old root-mounted
 * dashboard into a proper feature/route. Mock data lives here in Phase 0;
 * Phase 6 swaps it for a call to `GET /api/admin/dashboard/kpis`.
 *
 * Note the colour values: all references go through CSS custom properties
 * (`var(--color-*)`) so changing the palette in `/styles.css` reflows the UI.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [KpiCard],
  template: `
    <header class="mb-7">
      <h1 class="text-2xl font-bold text-[color:var(--color-neutral-900)]">Admin · Dashboard</h1>
      <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">
        Platform-wide KPIs for the last 7 days.
      </p>
    </header>

    <section class="kpi-grid">
      @for (kpi of kpiData(); track kpi.title) {
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
  `
})
export class AdminDashboard {
  readonly kpiData = input<KpiCardData[]>([
    {
      title: 'Doctors',
      value: '0',
      changePercent: 95,
      trendPeriod: 'in last 7 Days',
      iconColor: 'var(--color-info)',
      chartType: 'progress',
      chartData: [30, 55, 40, 70, 45, 80, 65]
    },
    {
      title: 'Patients',
      value: '4,178',
      changePercent: 25,
      trendPeriod: 'in last 7 Days',
      iconColor: 'var(--color-warning)',
      chartType: 'area',
      chartData: [20, 35, 50, 40, 65, 55, 70]
    },
    {
      title: 'Appointments',
      value: '12,178',
      changePercent: 0,
      trendPeriod: 'in last 7 Days',
      iconColor: 'var(--color-success)',
      chartType: 'bar',
      chartData: [50, 35, 60, 45, 75, 55, 200]
    },
    {
      title: 'Revenue',
      value: '2 UM',
      changePercent: 25,
      trendPeriod: 'in last 7 Days',
      iconColor: 'var(--color-success)',
      chartType: 'line',
      chartData: [30, 25, 45, 35, 50, 40, 65]
    },
    {
      title: 'Prescriptions',
      value: '3,842',
      changePercent: 12,
      trendPeriod: 'in last 7 Days',
      iconColor: 'var(--color-purple-500)',
      chartType: 'area',
      chartData: [25, 40, 35, 55, 45, 60, 72]
    }
  ]);
}
