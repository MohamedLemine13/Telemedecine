import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppointmentApi, AppointmentDto, AppointmentStatus } from '../../../core/api/appointment.api';
import { Button, Card, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

type Filter = 'UPCOMING' | 'PAST' | 'ALL';

interface DayGroup { date: string; label: string; items: AppointmentDto[]; }

@Component({
  selector: 'app-doctor-agenda',
  standalone: true,
  imports: [RouterLink, DatePipe, TitleCasePipe, Button, Card, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Agenda" subtitle="Your booked consultations.">
      <a actions routerLink="/doctor/availability"
         class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 h-10 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
        Edit availability →
      </a>
    </app-page-header>

    <div class="mb-4 flex gap-1">
      @for (f of filters; track f.value) {
        <button type="button" (click)="current.set(f.value)"
          [class]="current() === f.value ? 'filter-active' : 'filter'">{{ f.label }}</button>
      }
    </div>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else if (groups().length === 0) {
      <app-card>
        <p class="py-10 text-center text-sm text-[color:var(--color-neutral-500)]">
          No appointments in this view. Patients book against your
          <a routerLink="/doctor/availability" class="text-[color:var(--color-primary-700)] hover:underline">availability</a>.
        </p>
      </app-card>
    } @else {
      <div class="grid gap-4">
        @for (g of groups(); track g.date) {
          <app-card>
            <div header><h2 class="text-base font-semibold">{{ g.label }}</h2></div>
            <ul class="divide-y divide-[color:var(--color-neutral-200)]">
              @for (a of g.items; track a.id) {
                <li class="flex items-center justify-between gap-4 py-3">
                  <div class="flex items-center gap-4">
                    <span class="w-14 text-sm font-bold">{{ a.startAt | date:'HH:mm':'UTC' }}</span>
                    <div>
                      <p class="text-sm font-semibold">{{ a.patient.name || a.patient.email }}</p>
                      <p class="text-xs text-[color:var(--color-neutral-500)]">
                        {{ a.mode | titlecase }}@if (a.reason) { · “{{ a.reason }}” }
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <app-status-badge [variant]="badge(a.status)" [label]="a.status | titlecase" />
                    @if (a.status === 'SCHEDULED') {
                      <a app-button size="sm" [routerLink]="['/doctor/consultations', a.id]">Join call</a>
                      <button app-button size="sm" variant="secondary" type="button" (click)="complete(a)" [loading]="working() === a.id">Complete</button>
                      <button app-button size="sm" variant="danger" type="button" (click)="cancel(a)" [loading]="working() === a.id">Cancel</button>
                    }
                  </div>
                </li>
              }
            </ul>
          </app-card>
        }
      </div>
    }
  `,
  styles: `
    .filter, .filter-active {
      padding: 6px 14px; border: 1px solid var(--color-neutral-200);
      border-radius: 9999px; background: var(--color-neutral-0);
      font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    .filter-active { background: var(--color-primary-50); color: var(--color-primary-700); border-color: var(--color-primary-700); }
  `
})
export class DoctorAgenda implements OnInit {
  private readonly api = inject(AppointmentApi);

  protected readonly filters: { label: string; value: Filter }[] = [
    { label: 'Upcoming', value: 'UPCOMING' },
    { label: 'Past', value: 'PAST' },
    { label: 'All', value: 'ALL' }
  ];
  protected readonly current = signal<Filter>('UPCOMING');

  protected readonly loading = signal(true);
  protected readonly all = signal<AppointmentDto[]>([]);
  protected readonly working = signal<string | null>(null);

  protected readonly groups = computed<DayGroup[]>(() => {
    const now = Date.now();
    let list = this.all();
    if (this.current() === 'UPCOMING') {
      list = list.filter(a => a.status === 'SCHEDULED' && new Date(a.startAt).getTime() > now);
    } else if (this.current() === 'PAST') {
      list = list.filter(a => a.status !== 'SCHEDULED' || new Date(a.startAt).getTime() <= now);
    }
    const map = new Map<string, AppointmentDto[]>();
    for (const a of [...list].sort((x, y) => x.startAt.localeCompare(y.startAt))) {
      const date = a.startAt.slice(0, 10);
      (map.get(date) ?? map.set(date, []).get(date)!).push(a);
    }
    return [...map.entries()].map(([date, items]) => ({
      date,
      label: new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
      }),
      items
    }));
  });

  ngOnInit(): void { this.fetch(); }

  private fetch(): void {
    this.loading.set(true);
    this.api.list({ size: 200 }).subscribe({
      next: page => { this.all.set(page.content); this.loading.set(false); },
      error: () => { this.all.set([]); this.loading.set(false); }
    });
  }

  protected complete(a: AppointmentDto): void {
    this.working.set(a.id);
    this.api.complete(a.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.fetch(); }
    });
  }

  protected cancel(a: AppointmentDto): void {
    if (!confirm('Cancel this appointment?')) return;
    this.working.set(a.id);
    this.api.cancel(a.id, null).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.fetch(); }
    });
  }

  protected badge(s: AppointmentStatus): StatusVariant {
    if (s === 'COMPLETED') return 'success';
    if (s === 'CANCELLED') return 'error';
    return 'info';
  }
}
