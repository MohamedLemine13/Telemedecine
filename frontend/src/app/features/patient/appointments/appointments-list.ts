import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppointmentApi, AppointmentDto, AppointmentStatus, SlotDto } from '../../../core/api/appointment.api';
import { Button, Card, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

type Filter = 'UPCOMING' | 'PAST' | 'CANCELLED' | 'ALL';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [RouterLink, DatePipe, TitleCasePipe, Button, Card, PageHeader, StatusBadge],
  template: `
    <app-page-header title="My appointments" subtitle="Upcoming and past consultations.">
      <a actions routerLink="/patient/doctors"
         class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 h-10 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
        + Book new
      </a>
    </app-page-header>

    <div class="mb-4 flex gap-1">
      @for (f of filters; track f.value) {
        <button type="button" (click)="current.set(f.value)"
          [class]="current() === f.value ? 'filter-active' : 'filter'">{{ f.label }}</button>
      }
    </div>

    <app-card>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (visible().length === 0) {
        <p class="py-10 text-center text-sm text-[color:var(--color-neutral-500)]">
          Nothing here. <a routerLink="/patient/doctors" class="text-[color:var(--color-primary-700)] hover:underline">Find a doctor</a> to book your first appointment.
        </p>
      } @else {
        <ul class="divide-y divide-[color:var(--color-neutral-200)]">
          @for (a of visible(); track a.id) {
            <li class="py-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold">{{ a.doctor.name || a.doctor.email }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">
                    {{ a.startAt | date:'EEEE d MMMM, HH:mm':'UTC' }} · {{ a.mode | titlecase }}
                  </p>
                  @if (a.reason) { <p class="mt-1 text-xs text-[color:var(--color-neutral-500)]">“{{ a.reason }}”</p> }
                  @if (a.status === 'CANCELLED' && a.cancelReason) {
                    <p class="mt-1 text-xs text-[color:var(--color-error)]">Cancelled: {{ a.cancelReason }}</p>
                  }
                </div>
                <app-status-badge [variant]="badge(a.status)" [label]="a.status | titlecase" />
              </div>

              @if (a.status === 'SCHEDULED' && isFuture(a)) {
                <div class="mt-3 flex flex-wrap gap-2">
                  <a app-button size="sm" [routerLink]="['/patient/consultations', a.id]">Join call</a>
                  <button app-button size="sm" variant="secondary" type="button" (click)="toggleReschedule(a)">
                    {{ rescheduleFor() === a.id ? 'Close' : 'Reschedule' }}
                  </button>
                  <button app-button size="sm" variant="danger" type="button" (click)="cancel(a)" [loading]="working() === a.id">
                    Cancel
                  </button>
                </div>

                @if (rescheduleFor() === a.id) {
                  <div class="mt-3 rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] p-3">
                    @if (slots().length === 0) {
                      <p class="text-xs text-[color:var(--color-neutral-500)]">No other open slots for this doctor.</p>
                    } @else {
                      <p class="mb-2 text-xs font-semibold">Pick a new time:</p>
                      <div class="flex flex-wrap gap-2">
                        @for (s of slots(); track s.startAt) {
                          <button type="button" class="slot" (click)="doReschedule(a, s)">
                            {{ s.startAt | date:'EEE d MMM, HH:mm':'UTC' }}
                          </button>
                        }
                      </div>
                    }
                    @if (rescheduleError()) { <p class="mt-2 text-xs text-[color:var(--color-error)]">{{ rescheduleError() }}</p> }
                  </div>
                }
              }
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  styles: `
    .filter, .filter-active {
      padding: 6px 14px; border: 1px solid var(--color-neutral-200);
      border-radius: 9999px; background: var(--color-neutral-0);
      font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    .filter-active { background: var(--color-primary-50); color: var(--color-primary-700); border-color: var(--color-primary-700); }
    .slot {
      padding: 6px 12px; border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-input); font-size: 0.8rem; font-weight: 600;
      background: var(--color-neutral-0); cursor: pointer;
    }
    .slot:hover { border-color: var(--color-primary-700); background: var(--color-primary-50); }
  `
})
export class PatientAppointments implements OnInit {
  private readonly api = inject(AppointmentApi);

  protected readonly filters: { label: string; value: Filter }[] = [
    { label: 'Upcoming', value: 'UPCOMING' },
    { label: 'Past', value: 'PAST' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'All', value: 'ALL' }
  ];
  protected readonly current = signal<Filter>('UPCOMING');

  protected readonly loading = signal(true);
  protected readonly all = signal<AppointmentDto[]>([]);
  protected readonly working = signal<string | null>(null);

  protected readonly rescheduleFor = signal<string | null>(null);
  protected readonly slots = signal<SlotDto[]>([]);
  protected readonly rescheduleError = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const list = this.all();
    switch (this.current()) {
      case 'UPCOMING':  return list.filter(a => a.status === 'SCHEDULED' && this.isFuture(a));
      case 'PAST':      return list.filter(a => a.status === 'COMPLETED' || (a.status === 'SCHEDULED' && !this.isFuture(a)));
      case 'CANCELLED': return list.filter(a => a.status === 'CANCELLED');
      default:          return list;
    }
  });

  ngOnInit(): void { this.fetch(); }

  private fetch(): void {
    this.loading.set(true);
    this.api.list({ size: 100 }).subscribe({
      next: page => { this.all.set(page.content); this.loading.set(false); },
      error: () => { this.all.set([]); this.loading.set(false); }
    });
  }

  protected isFuture(a: AppointmentDto): boolean {
    return new Date(a.startAt).getTime() > Date.now();
  }

  protected cancel(a: AppointmentDto): void {
    if (!confirm('Cancel this appointment?')) return;
    this.working.set(a.id);
    this.api.cancel(a.id, null).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.fetch(); }
    });
  }

  protected toggleReschedule(a: AppointmentDto): void {
    if (this.rescheduleFor() === a.id) { this.rescheduleFor.set(null); return; }
    this.rescheduleFor.set(a.id);
    this.rescheduleError.set(null);
    this.slots.set([]);
    this.api.slots(a.doctor.id).subscribe({
      next: s => this.slots.set(s.filter(x => x.startAt !== a.startAt)),
      error: () => this.slots.set([])
    });
  }

  protected doReschedule(a: AppointmentDto, s: SlotDto): void {
    this.rescheduleError.set(null);
    this.api.reschedule(a.id, s.startAt).subscribe({
      next: () => { this.rescheduleFor.set(null); this.fetch(); },
      error: err => this.rescheduleError.set(err?.error?.detail ?? 'Could not reschedule. Try another time.')
    });
  }

  protected badge(s: AppointmentStatus): StatusVariant {
    if (s === 'COMPLETED') return 'success';
    if (s === 'CANCELLED') return 'error';
    return 'info';
  }
}
