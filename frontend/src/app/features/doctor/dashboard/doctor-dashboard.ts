import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DoctorApi, DoctorProfileDto } from '../doctor.api';
import { Card, KpiCard, KpiCardData, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

interface QueueEntry {
  id: string;
  patientName: string;
  reason: string;
  timeLabel: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'UPCOMING';
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [Card, KpiCard, RouterLink, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Doctor dashboard" subtitle="Today's consultations and quick metrics.">
      @if (profile(); as p) {
        @if (!p.verified) {
          <a actions routerLink="/doctor/profile"
             class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-warning-50)] px-3 h-10 text-xs font-semibold text-[color:var(--color-warning)] hover:opacity-90">
            ⚠ Profile pending verification — upload credentials →
          </a>
        }
      }
      <a actions routerLink="/doctor/agenda"
         class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 h-10 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
        Open agenda →
      </a>
    </app-page-header>

    <!-- KPI strip -->
    <section class="grid gap-4 md:grid-cols-3">
      @for (k of kpis; track k.title) {
        <app-kpi-card
          [title]="k.title"
          [value]="k.value"
          [changePercent]="k.changePercent"
          [trendPeriod]="k.trendPeriod"
          [iconColor]="k.iconColor"
          [chartType]="k.chartType"
          [chartData]="k.chartData" />
      }
    </section>

    <!-- Queue + Availability summary -->
    <section class="mt-6 grid gap-4 lg:grid-cols-3">
      <app-card class="lg:col-span-2">
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Today's queue</h2>
          <a routerLink="/doctor/agenda" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
            Open agenda
          </a>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[color:var(--color-neutral-200)] text-left">
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Patient</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Reason</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Time</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Status</th>
            </tr>
          </thead>
          <tbody>
            @for (q of queue; track q.id) {
              <tr class="border-b border-[color:var(--color-neutral-200)] last:border-0">
                <td class="py-3 font-semibold">{{ q.patientName }}</td>
                <td class="py-3 text-[color:var(--color-neutral-500)]">{{ q.reason }}</td>
                <td class="py-3">{{ q.timeLabel }}</td>
                <td class="py-3"><app-status-badge [variant]="statusVariant(q.status)" [label]="statusLabel(q.status)" /></td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-3 text-xs italic text-[color:var(--color-neutral-500)]">
          Sample queue — your real bookings live on the
          <a routerLink="/doctor/agenda" class="text-[color:var(--color-primary-700)] hover:underline">agenda</a>.
        </p>
      </app-card>

      <app-card>
        <div header><h2 class="text-base font-semibold">Availability</h2></div>
        <p class="text-sm">
          <span class="font-semibold">Open today:</span> 09:00 — 17:00
        </p>
        <p class="mt-1 text-sm">
          <span class="font-semibold">Next free slot:</span> 11:30 (in 45 min)
        </p>
        <a routerLink="/doctor/availability"
           class="mt-3 inline-block text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
          Edit availability →
        </a>
      </app-card>
    </section>
  `
})
export class DoctorDashboard implements OnInit {
  private readonly api = inject(DoctorApi);
  protected readonly profile = signal<DoctorProfileDto | null>(null);

  ngOnInit(): void {
    this.api.getMine().subscribe({
      next: p => this.profile.set(p),
      error: () => { /* swallowed — page still works */ }
    });
  }

  protected readonly kpis: KpiCardData[] = [
    {
      title: 'Appointments',
      value: '8',
      changePercent: 14,
      trendPeriod: 'vs. yesterday',
      iconColor: 'var(--color-info)',
      chartType: 'bar',
      chartData: [4, 6, 5, 8, 7, 9, 8]
    },
    {
      title: 'Queue',
      value: '3',
      changePercent: -25,
      trendPeriod: 'now',
      iconColor: 'var(--color-warning)',
      chartType: 'area',
      chartData: [2, 4, 6, 5, 3, 4, 3]
    },
    {
      title: 'Revenue',
      value: '4,200 UM',
      changePercent: 22,
      trendPeriod: 'this week',
      iconColor: 'var(--color-success)',
      chartType: 'line',
      chartData: [2400, 2900, 3300, 3000, 3800, 4100, 4200]
    }
  ];

  protected readonly queue: QueueEntry[] = [
    { id: '1', patientName: 'Fatou Bâ',       reason: 'Follow-up · Hypertension', timeLabel: '10:30', status: 'IN_PROGRESS' },
    { id: '2', patientName: 'Moussa Touré',   reason: 'Skin rash',                timeLabel: '11:00', status: 'WAITING' },
    { id: '3', patientName: 'Aminata Diop',   reason: 'Prescription refill',      timeLabel: '11:30', status: 'UPCOMING' },
    { id: '4', patientName: 'Ibrahim Sall',   reason: 'Cardiology consult',       timeLabel: '14:00', status: 'UPCOMING' }
  ];

  protected statusLabel(s: QueueEntry['status']): string {
    return { WAITING: 'Waiting', IN_PROGRESS: 'In progress', UPCOMING: 'Upcoming' }[s];
  }

  protected statusVariant(s: QueueEntry['status']): StatusVariant {
    if (s === 'IN_PROGRESS') return 'info';
    if (s === 'WAITING')     return 'warning';
    return 'neutral';
  }
}
